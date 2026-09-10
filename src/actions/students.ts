'use server'

import { revalidatePath } from 'next/cache'
import { createClient, requireUser } from '@/lib/supabase/server'
import { studentSchema } from '@/lib/validation/schemas'
import { formToObject } from '@/lib/form-data'
import { describeDbError, failure, fieldErrors, success, type ActionState } from '@/actions/types'

export async function createStudent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser()
  const parsed = studentSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('students')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error) return failure(describeDbError(error))

  revalidatePath('/students')
  revalidatePath('/dashboard')
  return success(`${parsed.data.first_name} added.`, data.id)
}

export async function updateStudent(
  studentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser()
  const parsed = studentSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.from('students').update(parsed.data).eq('id', studentId)
  if (error) return failure(describeDbError(error))

  revalidatePath('/students')
  revalidatePath(`/students/${studentId}`)
  return success('Student saved.')
}

/**
 * Archive rather than delete (§43): attendance, milestones and media must stay
 * readable after a student stops attending.
 */
export async function setStudentArchived(
  studentId: string,
  archived: boolean,
): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('students')
    .update({ active: !archived })
    .eq('id', studentId)

  if (error) return failure(describeDbError(error))

  revalidatePath('/students')
  revalidatePath(`/students/${studentId}`)
  return success(archived ? 'Student archived.' : 'Student restored.')
}
