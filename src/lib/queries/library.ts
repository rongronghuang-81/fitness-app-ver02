import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { LibraryRow } from '@/components/library/library-list'

export async function listTricks(): Promise<LibraryRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tricks')
    .select(`
      id, name, is_favorite, active, difficulty,
      trick_levels ( levels ( name ) ),
      trick_categories ( categories ( name ) )
    `)
    .order('name')

  const rows = (data ?? []) as unknown as {
    id: string
    name: string
    is_favorite: boolean
    active: boolean
    difficulty: number | null
    trick_levels: { levels: { name: string } | null }[]
    trick_categories: { categories: { name: string } | null }[]
  }[]

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    is_favorite: row.is_favorite,
    active: row.active,
    difficulty: row.difficulty,
    levels: row.trick_levels.map((l) => l.levels?.name).filter((n): n is string => Boolean(n)),
    categories: row.trick_categories
      .map((c) => c.categories?.name)
      .filter((n): n is string => Boolean(n)),
  }))
}

export async function listExercises(): Promise<LibraryRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('exercises')
    .select(`
      id, name, is_favorite, active, difficulty, target_area, equipment,
      levels ( name ),
      exercise_categories ( categories ( name ) )
    `)
    .order('name')

  const rows = (data ?? []) as unknown as {
    id: string
    name: string
    is_favorite: boolean
    active: boolean
    difficulty: number | null
    target_area: string | null
    equipment: string | null
    levels: { name: string } | null
    exercise_categories: { categories: { name: string } | null }[]
  }[]

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    is_favorite: row.is_favorite,
    active: row.active,
    difficulty: row.difficulty,
    targetArea: row.target_area,
    equipment: row.equipment,
    levels: row.levels ? [row.levels.name] : [],
    categories: row.exercise_categories
      .map((c) => c.categories?.name)
      .filter((n): n is string => Boolean(n)),
  }))
}

/** A trick page: its own row, its links in both directions, and usage. */
export async function getTrickDetail(trickId: string) {
  const supabase = await createClient()

  const [trick, levels, categories, relationships, exercises] = await Promise.all([
    supabase.from('tricks').select('*').eq('id', trickId).maybeSingle(),
    supabase.from('trick_levels').select('level_id, levels ( id, name )').eq('trick_id', trickId),
    supabase
      .from('trick_categories')
      .select('category_id, categories ( id, name )')
      .eq('trick_id', trickId),
    // Both directions, so "Ayesha needs Invert" also reads as "Invert leads to Ayesha".
    supabase
      .from('trick_relationships')
      .select(`
        id, relationship_type, notes, from_trick_id, to_trick_id,
        from_trick:tricks!trick_relationships_from_trick_id_fkey ( id, name ),
        to_trick:tricks!trick_relationships_to_trick_id_fkey ( id, name )
      `)
      .or(`from_trick_id.eq.${trickId},to_trick_id.eq.${trickId}`),
    supabase
      .from('trick_exercises')
      .select('id, relationship, notes, exercises ( id, name, target_area )')
      .eq('trick_id', trickId),
  ])

  if (!trick.data) return null

  return {
    trick: trick.data,
    levelIds: (levels.data ?? []).map((l) => l.level_id),
    levelNames: ((levels.data ?? []) as unknown as { levels: { name: string } | null }[])
      .map((l) => l.levels?.name)
      .filter((n): n is string => Boolean(n)),
    categoryIds: (categories.data ?? []).map((c) => c.category_id),
    categoryNames: (
      (categories.data ?? []) as unknown as { categories: { name: string } | null }[]
    )
      .map((c) => c.categories?.name)
      .filter((n): n is string => Boolean(n)),
    relationships: (relationships.data ?? []) as unknown as {
      id: string
      relationship_type: 'prerequisite' | 'progression' | 'regression' | 'related'
      notes: string | null
      from_trick_id: string
      to_trick_id: string
      from_trick: { id: string; name: string } | null
      to_trick: { id: string; name: string } | null
    }[],
    exercises: (exercises.data ?? []) as unknown as {
      id: string
      relationship: string
      notes: string | null
      exercises: { id: string; name: string; target_area: string | null } | null
    }[],
  }
}

/** An exercise page: its row, categories, and the tricks it supports (§24). */
export async function getExerciseDetail(exerciseId: string) {
  const supabase = await createClient()

  const [exercise, categories, tricks] = await Promise.all([
    supabase.from('exercises').select('*, levels ( id, name )').eq('id', exerciseId).maybeSingle(),
    supabase
      .from('exercise_categories')
      .select('category_id, categories ( id, name )')
      .eq('exercise_id', exerciseId),
    supabase
      .from('trick_exercises')
      .select('id, relationship, notes, tricks ( id, name, difficulty )')
      .eq('exercise_id', exerciseId),
  ])

  if (!exercise.data) return null

  return {
    exercise: exercise.data,
    categoryIds: (categories.data ?? []).map((c) => c.category_id),
    categoryNames: (
      (categories.data ?? []) as unknown as { categories: { name: string } | null }[]
    )
      .map((c) => c.categories?.name)
      .filter((n): n is string => Boolean(n)),
    tricks: (tricks.data ?? []) as unknown as {
      id: string
      relationship: string
      notes: string | null
      tricks: { id: string; name: string; difficulty: number | null } | null
    }[],
  }
}

export async function getTaxonomy() {
  const supabase = await createClient()
  const [levels, trickCategories, exerciseCategories] = await Promise.all([
    supabase.from('levels').select('id, name').eq('active', true).order('sort_order'),
    supabase
      .from('categories')
      .select('id, name')
      .eq('kind', 'trick')
      .eq('active', true)
      .order('sort_order'),
    supabase
      .from('categories')
      .select('id, name')
      .eq('kind', 'exercise')
      .eq('active', true)
      .order('sort_order'),
  ])

  return {
    levels: levels.data ?? [],
    trickCategories: trickCategories.data ?? [],
    exerciseCategories: exerciseCategories.data ?? [],
  }
}
