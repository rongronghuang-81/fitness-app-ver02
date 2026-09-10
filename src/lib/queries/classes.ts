import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { AttendanceStatus, LessonItem, LessonKind } from '@/types/database'

export interface ClassRoster {
  id: string
  student_id: string
  attendance_status: AttendanceStatus
  performance_notes: string | null
  achievements: string | null
  difficulties: string | null
  homework: string | null
  instructor_notes: string | null
  students: {
    id: string
    first_name: string
    last_name: string | null
    preferred_name: string | null
  } | null
}

export interface LessonBundle {
  id: string | null
  kind: LessonKind
  objective: string | null
  combinations: string | null
  homework: string | null
  instructor_notes: string | null
  items: LessonItem[]
}

function emptyLesson(kind: LessonKind): LessonBundle {
  return {
    id: null,
    kind,
    objective: null,
    combinations: null,
    homework: null,
    instructor_notes: null,
    items: [],
  }
}

/** Everything the class page renders. */
export async function getClassDetail(classId: string) {
  const supabase = await createClient()

  const [classResult, roster, lessons] = await Promise.all([
    supabase
      .from('classes')
      .select('*, terms ( id, name, number_of_weeks, location, level_id )')
      .eq('id', classId)
      .maybeSingle(),

    supabase
      .from('class_students')
      .select(`
        id, student_id, attendance_status, performance_notes, achievements,
        difficulties, homework, instructor_notes,
        students ( id, first_name, last_name, preferred_name )
      `)
      .eq('class_id', classId),

    supabase
      .from('class_lessons')
      .select('id, kind, objective, combinations, homework, instructor_notes')
      .eq('class_id', classId),
  ])

  if (!classResult.data) return null

  const lessonRows = lessons.data ?? []
  const lessonIds = lessonRows.map((l) => l.id)

  const { data: items } = lessonIds.length
    ? await supabase
        .from('lesson_items')
        .select('*')
        .in('lesson_id', lessonIds)
        .order('section')
        .order('position')
    : { data: [] as LessonItem[] }

  function bundle(kind: LessonKind): LessonBundle {
    const row = lessonRows.find((l) => l.kind === kind)
    if (!row) return emptyLesson(kind)
    return {
      ...row,
      kind,
      items: (items ?? []).filter((i) => i.lesson_id === row.id),
    }
  }

  const rosterRows = ((roster.data ?? []) as unknown as ClassRoster[]).sort((a, b) => {
    const an = a.students?.preferred_name || a.students?.first_name || ''
    const bn = b.students?.preferred_name || b.students?.first_name || ''
    return an.localeCompare(bn)
  })

  return {
    classRow: classResult.data as unknown as {
      id: string
      term_id: string
      week_number: number
      scheduled_date: string
      start_time: string
      duration_minutes: number
      status: string
      theme: string | null
      general_notes: string | null
      completed_at: string | null
      terms: {
        id: string
        name: string
        number_of_weeks: number
        location: string | null
        level_id: string | null
      } | null
    },
    roster: rosterRows,
    planned: bundle('planned'),
    actual: bundle('actual'),
  }
}

/** The previous week's class in the same term, for "copy previous lesson" (§15). */
export async function getPreviousClassLesson(termId: string, weekNumber: number) {
  if (weekNumber <= 1) return null
  const supabase = await createClient()

  const { data: previous } = await supabase
    .from('classes')
    .select('id, week_number, class_lessons ( id, kind )')
    .eq('term_id', termId)
    .lt('week_number', weekNumber)
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!previous) return null

  const rows = previous.class_lessons as unknown as { id: string; kind: LessonKind }[]
  // Prefer what was actually taught; fall back to what was planned.
  const lesson = rows.find((l) => l.kind === 'actual') ?? rows.find((l) => l.kind === 'planned')
  if (!lesson) return null

  return { classId: previous.id, weekNumber: previous.week_number, lessonId: lesson.id }
}

/** Library rows for the inline pickers, favourites first (§34, §35). */
export async function getLibraryOptions() {
  const supabase = await createClient()
  const [tricks, exercises, templates] = await Promise.all([
    supabase
      .from('tricks')
      .select('id, name, is_favorite, difficulty')
      .eq('active', true)
      .order('is_favorite', { ascending: false })
      .order('name'),
    supabase
      .from('exercises')
      .select('id, name, is_favorite, target_area')
      .eq('active', true)
      .order('is_favorite', { ascending: false })
      .order('name'),
    supabase
      .from('lesson_templates')
      .select('id, name, is_favorite')
      .eq('active', true)
      .order('is_favorite', { ascending: false })
      .order('name'),
  ])

  return {
    tricks: tricks.data ?? [],
    exercises: exercises.data ?? [],
    templates: templates.data ?? [],
  }
}
