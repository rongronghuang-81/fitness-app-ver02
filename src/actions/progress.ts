'use server'

import { revalidatePath } from 'next/cache'
import { createClient, requireUser } from '@/lib/supabase/server'
import { milestoneSchema, skillProgressSchema } from '@/lib/validation/schemas'
import { formToObject } from '@/lib/form-data'
import { describeDbError, failure, fieldErrors, success, type ActionState } from '@/actions/types'

/**
 * Sets a student's status on one trick (§25).
 *
 * The date columns are stamped by a database trigger the first time each status
 * is reached, so marking "achieved" during a class records the achievement date
 * without the instructor typing one.
 */
export async function setSkillStatus(input: {
  student_id: string
  trick_id: string
  status: string
  instructor_notes?: string | null
}): Promise<ActionState> {
  await requireUser()
  const parsed = skillProgressSchema.safeParse(input)
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.from('student_skill_progress').upsert(
    {
      student_id: parsed.data.student_id,
      trick_id: parsed.data.trick_id,
      status: parsed.data.status,
      ...(parsed.data.instructor_notes !== undefined
        ? { instructor_notes: parsed.data.instructor_notes }
        : {}),
      last_practised_date: new Date().toISOString().slice(0, 10),
    },
    { onConflict: 'student_id,trick_id' },
  )

  if (error) return failure(describeDbError(error))

  revalidatePath(`/students/${parsed.data.student_id}`)
  revalidatePath('/progress')
  return success('Progress updated.')
}

export async function saveSkillNotes(
  studentId: string,
  trickId: string,
  notes: string | null,
): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('student_skill_progress')
    .update({ instructor_notes: notes })
    .eq('student_id', studentId)
    .eq('trick_id', trickId)

  if (error) return failure(describeDbError(error))
  revalidatePath(`/students/${studentId}`)
  return success('Notes saved.')
}

// --- Milestones (§26) ----------------------------------------------------------

export async function createMilestone(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser()
  const parsed = milestoneSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('milestones')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error) return failure(describeDbError(error))

  revalidatePath(`/students/${parsed.data.student_id}`)
  revalidatePath('/dashboard')
  if (parsed.data.class_id) revalidatePath(`/classes/${parsed.data.class_id}`)
  return success('Milestone recorded.', data.id)
}

export async function deleteMilestone(
  milestoneId: string,
  studentId: string,
): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('milestones').delete().eq('id', milestoneId)
  if (error) return failure(describeDbError(error))

  revalidatePath(`/students/${studentId}`)
  return success('Milestone deleted.')
}
