'use server'

import { revalidatePath } from 'next/cache'
import { createClient, requireUser } from '@/lib/supabase/server'
import {
  attendanceSchema,
  lessonItemSchema,
  lessonSchema,
  studentClassRecordSchema,
} from '@/lib/validation/schemas'
import { formToObject } from '@/lib/form-data'
import { describeDbError, failure, fieldErrors, success, type ActionState } from '@/actions/types'
import type { AttendanceStatus, LessonKind, LessonSection } from '@/types/database'

// --- Attendance (§16) --------------------------------------------------------

/** One tap on a phone. Kept as small as possible so it feels instant. */
export async function setAttendance(
  classStudentId: string,
  status: AttendanceStatus,
): Promise<ActionState> {
  await requireUser()
  const parsed = attendanceSchema.safeParse({
    class_student_id: classStudentId,
    attendance_status: status,
  })
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('class_students')
    .update({ attendance_status: status })
    .eq('id', classStudentId)
    .select('class_id')
    .single()

  if (error) return failure(describeDbError(error))

  revalidatePath(`/classes/${data.class_id}`)
  return success()
}

/** "Everyone's here" — the common case, in one tap. */
export async function markAllPresent(classId: string): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('class_students')
    .update({ attendance_status: 'present' })
    .eq('class_id', classId)
    .eq('attendance_status', 'unmarked')

  if (error) return failure(describeDbError(error))

  revalidatePath(`/classes/${classId}`)
  return success('Everyone marked present.')
}

/** Per-student notes for a class (§17). */
export async function saveStudentClassRecord(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser()
  const parsed = studentClassRecordSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const { class_student_id, ...patch } = parsed.data
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('class_students')
    .update(patch)
    .eq('id', class_student_id)
    .select('class_id')
    .single()

  if (error) return failure(describeDbError(error))

  revalidatePath(`/classes/${data.class_id}`)
  return success('Notes saved.')
}

/** Adds a student to a single class without enrolling them for the whole term. */
export async function addStudentToClass(classId: string, studentId: string): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('class_students')
    .upsert({ class_id: classId, student_id: studentId }, { onConflict: 'class_id,student_id' })

  if (error) return failure(describeDbError(error))

  revalidatePath(`/classes/${classId}`)
  return success('Student added to this class.')
}

// --- Lesson plans (§13, §14) -------------------------------------------------

/** Finds or creates the planned/actual lesson row for a class. */
async function ensureLesson(classId: string, kind: LessonKind): Promise<string> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('class_lessons')
    .select('id')
    .eq('class_id', classId)
    .eq('kind', kind)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('class_lessons')
    .insert({ class_id: classId, kind })
    .select('id')
    .single()

  if (error) throw new Error(describeDbError(error))
  return data.id
}

export async function getOrCreateLesson(classId: string, kind: LessonKind): Promise<string> {
  await requireUser()
  return ensureLesson(classId, kind)
}

export async function saveLessonDetails(
  classId: string,
  kind: LessonKind,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser()
  const parsed = lessonSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const lessonId = await ensureLesson(classId, kind)
  const supabase = await createClient()
  const { error } = await supabase.from('class_lessons').update(parsed.data).eq('id', lessonId)
  if (error) return failure(describeDbError(error))

  revalidatePath(`/classes/${classId}`)
  return success('Lesson saved.')
}

export async function addLessonItem(
  classId: string,
  kind: LessonKind,
  input: {
    section: LessonSection
    trick_id?: string | null
    exercise_id?: string | null
    free_text?: string | null
    sets?: number | null
    reps?: string | null
    duration_seconds?: number | null
    notes?: string | null
  },
): Promise<ActionState> {
  await requireUser()
  const parsed = lessonItemSchema.safeParse(input)
  if (!parsed.success) return fieldErrors(parsed.error)

  const lessonId = await ensureLesson(classId, kind)
  const supabase = await createClient()

  // Append: one past the current highest position in this section.
  const { data: last } = await supabase
    .from('lesson_items')
    .select('position')
    .eq('lesson_id', lessonId)
    .eq('section', parsed.data.section)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('lesson_items').insert({
    ...parsed.data,
    lesson_id: lessonId,
    position: (last?.position ?? -1) + 1,
  })

  if (error) return failure(describeDbError(error))

  revalidatePath(`/classes/${classId}`)
  return success('Added.')
}

export async function removeLessonItem(classId: string, itemId: string): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('lesson_items').delete().eq('id', itemId)
  if (error) return failure(describeDbError(error))

  revalidatePath(`/classes/${classId}`)
  return success('Removed.')
}

export async function setLessonItemOutcome(
  classId: string,
  itemId: string,
  outcome: 'planned' | 'done' | 'modified' | 'skipped',
): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('lesson_items').update({ outcome }).eq('id', itemId)
  if (error) return failure(describeDbError(error))

  revalidatePath(`/classes/${classId}`)
  return success()
}

// --- Copying (§15) -----------------------------------------------------------

/**
 * Copy a previous lesson into this class. The copy always lands in the
 * *planned* lesson unless told otherwise, and can be limited to chosen
 * sections so the instructor can take just the warm-up, for example.
 */
export async function copyLesson(input: {
  sourceLessonId: string
  targetClassId: string
  targetKind?: LessonKind
  sections?: LessonSection[]
  replace?: boolean
}): Promise<ActionState> {
  await requireUser()
  const targetLessonId = await ensureLesson(input.targetClassId, input.targetKind ?? 'planned')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('copy_lesson_items', {
    p_source_lesson_id: input.sourceLessonId,
    p_target_lesson_id: targetLessonId,
    p_sections: input.sections ?? null,
    p_replace: input.replace ?? false,
  })

  if (error) return failure(describeDbError(error))

  revalidatePath(`/classes/${input.targetClassId}`)
  return success(`Copied ${data ?? 0} item${data === 1 ? '' : 's'}.`)
}

export async function applyTemplate(input: {
  templateId: string
  targetClassId: string
  sections?: LessonSection[]
  replace?: boolean
}): Promise<ActionState> {
  await requireUser()
  const targetLessonId = await ensureLesson(input.targetClassId, 'planned')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('apply_template_to_lesson', {
    p_template_id: input.templateId,
    p_target_lesson_id: targetLessonId,
    p_sections: input.sections ?? null,
    p_replace: input.replace ?? false,
  })

  if (error) return failure(describeDbError(error))

  revalidatePath(`/classes/${input.targetClassId}`)
  return success(`Applied ${data ?? 0} item${data === 1 ? '' : 's'}.`)
}

/**
 * Starts the "what actually happened" record by copying the plan, so the
 * instructor edits a filled-in list rather than an empty one. The planned
 * lesson is never modified.
 */
export async function startActualFromPlan(classId: string): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()

  const { data: planned } = await supabase
    .from('class_lessons')
    .select('id, objective, combinations, homework')
    .eq('class_id', classId)
    .eq('kind', 'planned')
    .maybeSingle()

  const actualId = await ensureLesson(classId, 'actual')

  const { data: existingItems } = await supabase
    .from('lesson_items')
    .select('id')
    .eq('lesson_id', actualId)
    .limit(1)

  // Only seed once — never overwrite edits the instructor has already made.
  if (existingItems && existingItems.length > 0) return success()

  if (planned) {
    await supabase
      .from('class_lessons')
      .update({
        objective: planned.objective,
        combinations: planned.combinations,
        homework: planned.homework,
      })
      .eq('id', actualId)

    const { error } = await supabase.rpc('copy_lesson_items', {
      p_source_lesson_id: planned.id,
      p_target_lesson_id: actualId,
      p_sections: null,
      p_replace: false,
    })
    if (error) return failure(describeDbError(error))
  }

  revalidatePath(`/classes/${classId}`)
  return success()
}

/** Final step of the completion flow (§18). */
export async function completeClass(
  classId: string,
  generalNotes?: string | null,
): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()

  // Re-running the completion flow (to add a late note, say) must not move the
  // recorded completion time — §44 depends on those timestamps staying true.
  const { data: current } = await supabase
    .from('classes')
    .select('completed_at')
    .eq('id', classId)
    .maybeSingle()

  const patch: { status: 'completed'; completed_at: string; general_notes?: string | null } = {
    status: 'completed',
    completed_at: current?.completed_at ?? new Date().toISOString(),
  }
  if (generalNotes !== undefined) patch.general_notes = generalNotes

  const { error } = await supabase.from('classes').update(patch).eq('id', classId)
  if (error) return failure(describeDbError(error))

  revalidatePath(`/classes/${classId}`)
  revalidatePath('/dashboard')
  revalidatePath('/calendar')
  return success('Class complete. Nice work.')
}
