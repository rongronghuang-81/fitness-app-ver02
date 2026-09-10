'use server'

import { revalidatePath } from 'next/cache'
import { createClient, requireUser } from '@/lib/supabase/server'
import {
  categorySchema,
  exerciseSchema,
  levelSchema,
  templateSchema,
  trickExerciseSchema,
  trickRelationshipSchema,
  trickSchema,
} from '@/lib/validation/schemas'
import { formToObject } from '@/lib/form-data'
import { describeDbError, failure, fieldErrors, success, type ActionState } from '@/actions/types'

// --- Tricks -------------------------------------------------------------------

export async function saveTrick(
  trickId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser()
  const parsed = trickSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const { level_ids, category_ids, ...fields } = parsed.data
  const supabase = await createClient()

  let id = trickId
  if (id) {
    const { error } = await supabase.from('tricks').update(fields).eq('id', id)
    if (error) return failure(describeDbError(error))
  } else {
    const { data, error } = await supabase.from('tricks').insert(fields).select('id').single()
    if (error) return failure(describeDbError(error))
    id = data.id
  }

  // Replace the join rows wholesale — simpler and safer than diffing.
  await supabase.from('trick_levels').delete().eq('trick_id', id)
  if (level_ids.length > 0) {
    await supabase
      .from('trick_levels')
      .insert(level_ids.map((level_id) => ({ trick_id: id as string, level_id })))
  }

  await supabase.from('trick_categories').delete().eq('trick_id', id)
  if (category_ids.length > 0) {
    await supabase
      .from('trick_categories')
      .insert(category_ids.map((category_id) => ({ trick_id: id as string, category_id })))
  }

  revalidatePath('/tricks')
  revalidatePath(`/tricks/${id}`)
  return success(trickId ? 'Trick saved.' : `${fields.name} added to the library.`, id)
}

/** Inline creation from a lesson plan: name only, fill in the detail later (§35). */
export async function quickCreateTrick(name: string): Promise<ActionState> {
  await requireUser()
  const trimmed = name.trim()
  if (!trimmed) return failure('Give the trick a name.')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tricks')
    .insert({ name: trimmed })
    .select('id')
    .single()

  if (error) return failure(describeDbError(error))
  revalidatePath('/tricks')
  return success(`${trimmed} created.`, data.id)
}

export async function setTrickArchived(trickId: string, archived: boolean): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('tricks').update({ active: !archived }).eq('id', trickId)
  if (error) return failure(describeDbError(error))

  revalidatePath('/tricks')
  revalidatePath(`/tricks/${trickId}`)
  return success(archived ? 'Trick archived.' : 'Trick restored.')
}

// --- Exercises -----------------------------------------------------------------

export async function saveExercise(
  exerciseId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser()
  const parsed = exerciseSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const { category_ids, ...fields } = parsed.data
  const supabase = await createClient()

  let id = exerciseId
  if (id) {
    const { error } = await supabase.from('exercises').update(fields).eq('id', id)
    if (error) return failure(describeDbError(error))
  } else {
    const { data, error } = await supabase.from('exercises').insert(fields).select('id').single()
    if (error) return failure(describeDbError(error))
    id = data.id
  }

  await supabase.from('exercise_categories').delete().eq('exercise_id', id)
  if (category_ids.length > 0) {
    await supabase
      .from('exercise_categories')
      .insert(category_ids.map((category_id) => ({ exercise_id: id as string, category_id })))
  }

  revalidatePath('/exercises')
  revalidatePath(`/exercises/${id}`)
  return success(exerciseId ? 'Exercise saved.' : `${fields.name} added to the library.`, id)
}

export async function quickCreateExercise(name: string): Promise<ActionState> {
  await requireUser()
  const trimmed = name.trim()
  if (!trimmed) return failure('Give the exercise a name.')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exercises')
    .insert({ name: trimmed })
    .select('id')
    .single()

  if (error) return failure(describeDbError(error))
  revalidatePath('/exercises')
  return success(`${trimmed} created.`, data.id)
}

export async function setExerciseArchived(
  exerciseId: string,
  archived: boolean,
): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('exercises')
    .update({ active: !archived })
    .eq('id', exerciseId)

  if (error) return failure(describeDbError(error))
  revalidatePath('/exercises')
  revalidatePath(`/exercises/${exerciseId}`)
  return success(archived ? 'Exercise archived.' : 'Exercise restored.')
}

// --- Favourites (§34) ----------------------------------------------------------

export async function toggleFavorite(
  table: 'tricks' | 'exercises' | 'lesson_templates',
  id: string,
  isFavorite: boolean,
): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from(table).update({ is_favorite: isFavorite }).eq('id', id)
  if (error) return failure(describeDbError(error))

  revalidatePath(`/${table === 'lesson_templates' ? 'templates' : table}`)
  return success()
}

// --- Relationships (§21, §24) ---------------------------------------------------

export async function addTrickRelationship(input: {
  from_trick_id: string
  to_trick_id: string
  relationship_type: 'prerequisite' | 'progression' | 'regression' | 'related'
  notes?: string | null
}): Promise<ActionState> {
  await requireUser()
  const parsed = trickRelationshipSchema.safeParse(input)
  if (!parsed.success) return fieldErrors(parsed.error)
  if (parsed.data.from_trick_id === parsed.data.to_trick_id) {
    return failure('A trick cannot be related to itself.')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('trick_relationships').insert(parsed.data)
  if (error) return failure(describeDbError(error))

  revalidatePath(`/tricks/${parsed.data.from_trick_id}`)
  revalidatePath(`/tricks/${parsed.data.to_trick_id}`)
  return success('Link added.')
}

export async function removeTrickRelationship(
  relationshipId: string,
  trickId: string,
): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('trick_relationships').delete().eq('id', relationshipId)
  if (error) return failure(describeDbError(error))

  revalidatePath(`/tricks/${trickId}`)
  return success('Link removed.')
}

export async function linkExerciseToTrick(input: {
  trick_id: string
  exercise_id: string
  relationship?: 'preparation' | 'conditioning' | 'support'
  notes?: string | null
}): Promise<ActionState> {
  await requireUser()
  const parsed = trickExerciseSchema.safeParse(input)
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from('trick_exercises')
    .upsert(parsed.data, { onConflict: 'trick_id,exercise_id' })

  if (error) return failure(describeDbError(error))

  revalidatePath(`/tricks/${parsed.data.trick_id}`)
  revalidatePath(`/exercises/${parsed.data.exercise_id}`)
  return success('Linked.')
}

export async function unlinkExerciseFromTrick(
  linkId: string,
  trickId: string,
  exerciseId: string,
): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('trick_exercises').delete().eq('id', linkId)
  if (error) return failure(describeDbError(error))

  revalidatePath(`/tricks/${trickId}`)
  revalidatePath(`/exercises/${exerciseId}`)
  return success('Unlinked.')
}

// --- Levels and categories (§45) -------------------------------------------------

export async function saveLevel(
  levelId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser()
  const parsed = levelSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  const { error } = levelId
    ? await supabase.from('levels').update(parsed.data).eq('id', levelId)
    : await supabase.from('levels').insert(parsed.data)

  if (error) return failure(describeDbError(error))
  revalidatePath('/settings')
  return success('Level saved.')
}

export async function saveCategory(
  categoryId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser()
  const parsed = categorySchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  const { error } = categoryId
    ? await supabase.from('categories').update(parsed.data).eq('id', categoryId)
    : await supabase.from('categories').insert(parsed.data)

  if (error) return failure(describeDbError(error))
  revalidatePath('/settings')
  return success('Category saved.')
}

export async function archiveTaxonomy(
  table: 'levels' | 'categories',
  id: string,
): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from(table).update({ active: false }).eq('id', id)
  if (error) return failure(describeDbError(error))

  revalidatePath('/settings')
  return success('Archived.')
}

// --- Lesson templates (§33) ------------------------------------------------------

export async function saveTemplate(
  templateId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser()
  const parsed = templateSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  if (templateId) {
    const { error } = await supabase.from('lesson_templates').update(parsed.data).eq('id', templateId)
    if (error) return failure(describeDbError(error))
    revalidatePath('/templates')
    return success('Template saved.', templateId)
  }

  const { data, error } = await supabase
    .from('lesson_templates')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error) return failure(describeDbError(error))
  revalidatePath('/templates')
  return success('Template created.', data.id)
}

/** "Save this lesson as a template" (§33). Copies the plan's items across. */
export async function createTemplateFromLesson(
  lessonId: string,
  name: string,
): Promise<ActionState> {
  await requireUser()
  const trimmed = name.trim()
  if (!trimmed) return failure('Give the template a name.')

  const supabase = await createClient()
  const { data: lesson } = await supabase
    .from('class_lessons')
    .select('objective, homework, instructor_notes')
    .eq('id', lessonId)
    .maybeSingle()

  const { data: template, error } = await supabase
    .from('lesson_templates')
    .insert({
      name: trimmed,
      objective: lesson?.objective ?? null,
      homework: lesson?.homework ?? null,
      notes: lesson?.instructor_notes ?? null,
    })
    .select('id')
    .single()

  if (error) return failure(describeDbError(error))

  const { data: items } = await supabase
    .from('lesson_items')
    .select('section, position, trick_id, exercise_id, free_text, sets, reps, duration_seconds, tempo, notes')
    .eq('lesson_id', lessonId)

  if (items && items.length > 0) {
    const { error: itemError } = await supabase
      .from('lesson_template_items')
      .insert(items.map((item) => ({ ...item, template_id: template.id })))
    if (itemError) return failure(describeDbError(itemError))
  }

  revalidatePath('/templates')
  return success(`Saved as “${trimmed}”.`, template.id)
}

export async function deleteTemplate(templateId: string): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('lesson_templates').delete().eq('id', templateId)
  if (error) return failure(describeDbError(error))

  revalidatePath('/templates')
  return success('Template deleted.')
}
