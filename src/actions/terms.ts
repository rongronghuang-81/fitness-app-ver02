'use server'

import { revalidatePath } from 'next/cache'
import { createClient, requireUser } from '@/lib/supabase/server'
import { classSchema, termSchema } from '@/lib/validation/schemas'
import { formToObject } from '@/lib/form-data'
import { describeDbError, failure, fieldErrors, success, type ActionState } from '@/actions/types'

/**
 * Creates a term and generates its weekly classes in one step (§10).
 * The dates come from the `generate_term_classes` database function so the
 * preview in the form and the stored rows can never disagree.
 */
export async function createTerm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser()
  const parsed = termSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  const { data: term, error } = await supabase
    .from('terms')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error) return failure(describeDbError(error))

  const { error: genError } = await supabase.rpc('generate_term_classes', { p_term_id: term.id })
  if (genError) {
    return failure(
      `The term was created but its classes could not be generated: ${describeDbError(genError)}`,
    )
  }

  revalidatePath('/terms')
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
  return success(`${parsed.data.name} created with ${parsed.data.number_of_weeks} classes.`, term.id)
}

export async function updateTerm(
  termId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser()
  const parsed = termSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.from('terms').update(parsed.data).eq('id', termId)
  if (error) return failure(describeDbError(error))

  // Adds any newly-added weeks without touching the classes already taught.
  const { error: genError } = await supabase.rpc('generate_term_classes', { p_term_id: termId })
  if (genError) return failure(describeDbError(genError))

  revalidatePath('/terms')
  revalidatePath(`/terms/${termId}`)
  revalidatePath('/calendar')
  return success('Term saved.')
}

export async function setTermStatus(
  termId: string,
  status: 'draft' | 'active' | 'completed' | 'cancelled',
): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('terms').update({ status }).eq('id', termId)
  if (error) return failure(describeDbError(error))

  revalidatePath('/terms')
  revalidatePath(`/terms/${termId}`)
  return success(`Term marked ${status}.`)
}

// --- Enrolment ---------------------------------------------------------------

/**
 * Enrols a student. A database trigger fans the enrolment out onto every
 * not-yet-completed class in the term, so the roster is never hand-maintained.
 */
export async function enrolStudent(termId: string, studentId: string): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('term_students')
    .upsert({ term_id: termId, student_id: studentId, status: 'enrolled' }, {
      onConflict: 'term_id,student_id',
    })

  if (error) return failure(describeDbError(error))

  revalidatePath(`/terms/${termId}`)
  revalidatePath('/classes')
  return success('Student enrolled.')
}

export async function setEnrolmentStatus(
  termId: string,
  studentId: string,
  status: 'enrolled' | 'completed' | 'withdrawn',
): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('term_students')
    .update({ status })
    .eq('term_id', termId)
    .eq('student_id', studentId)

  if (error) return failure(describeDbError(error))

  revalidatePath(`/terms/${termId}`)
  return success(status === 'withdrawn' ? 'Student withdrawn.' : 'Enrolment updated.')
}

// --- Individual class edits (§10) --------------------------------------------

export async function updateClass(
  classId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser()
  const parsed = classSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()

  // The status and completed_at must move together (a database constraint
  // enforces it), but an existing completion time must survive an edit —
  // rewriting it would silently falsify when the class was actually taught.
  const { data: current } = await supabase
    .from('classes')
    .select('completed_at')
    .eq('id', classId)
    .maybeSingle()

  const patch = {
    ...parsed.data,
    completed_at:
      parsed.data.status === 'completed'
        ? (current?.completed_at ?? new Date().toISOString())
        : null,
  }

  const { error } = await supabase.from('classes').update(patch).eq('id', classId)
  if (error) return failure(describeDbError(error))

  revalidatePath(`/classes/${classId}`)
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
  return success('Class updated.')
}

export async function setClassStatus(
  classId: string,
  status: 'planned' | 'completed' | 'cancelled' | 'rescheduled',
): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()

  // Keep the original completion time if the class was already completed.
  const { data: current } = await supabase
    .from('classes')
    .select('completed_at')
    .eq('id', classId)
    .maybeSingle()

  const { error } = await supabase
    .from('classes')
    .update({
      status,
      completed_at:
        status === 'completed' ? (current?.completed_at ?? new Date().toISOString()) : null,
    })
    .eq('id', classId)

  if (error) return failure(describeDbError(error))

  revalidatePath(`/classes/${classId}`)
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
  return success(
    status === 'cancelled'
      ? 'Class cancelled.'
      : status === 'planned'
        ? 'Class restored.'
        : `Class marked ${status}.`,
  )
}
