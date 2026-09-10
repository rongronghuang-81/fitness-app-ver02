import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { todayISO } from '@/lib/domain/format'

/**
 * Everything the dashboard needs, in a handful of narrow queries.
 *
 * Each query selects only the columns it renders and caps its row count, so the
 * dashboard cost stays flat as the history grows (§49). No media is loaded here.
 */

export interface DashboardClass {
  id: string
  scheduled_date: string
  start_time: string
  duration_minutes: number
  status: string
  theme: string | null
  week_number: number
  term: { id: string; name: string; number_of_weeks: number } | null
  students: { id: string; name: string }[]
}

type ClassQueryRow = {
  id: string
  scheduled_date: string
  start_time: string
  duration_minutes: number
  status: string
  theme: string | null
  week_number: number
  terms: { id: string; name: string; number_of_weeks: number } | null
  class_students: {
    students: { id: string; first_name: string; last_name: string | null; preferred_name: string | null } | null
  }[]
}

const CLASS_SELECT = `
  id, scheduled_date, start_time, duration_minutes, status, theme, week_number,
  terms ( id, name, number_of_weeks ),
  class_students ( students ( id, first_name, last_name, preferred_name ) )
`

function shapeClass(row: ClassQueryRow): DashboardClass {
  return {
    id: row.id,
    scheduled_date: row.scheduled_date,
    start_time: row.start_time,
    duration_minutes: row.duration_minutes,
    status: row.status,
    theme: row.theme,
    week_number: row.week_number,
    term: row.terms,
    students: row.class_students
      .map((cs) => cs.students)
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => ({
        id: s.id,
        name: (s.preferred_name?.trim() || s.first_name) + (s.last_name ? ` ${s.last_name}` : ''),
      })),
  }
}

export async function getDashboardData() {
  const supabase = await createClient()
  const today = todayISO()

  const [todayClasses, upcoming, needsCompleting, recentMilestones, counts] = await Promise.all([
    supabase
      .from('classes')
      .select(CLASS_SELECT)
      .eq('scheduled_date', today)
      .neq('status', 'cancelled')
      .order('start_time'),

    supabase
      .from('classes')
      .select(CLASS_SELECT)
      .gt('scheduled_date', today)
      .neq('status', 'cancelled')
      .order('scheduled_date')
      .order('start_time')
      .limit(5),

    // Past classes still marked planned — the follow-up list (§6).
    supabase
      .from('classes')
      .select(CLASS_SELECT)
      .lt('scheduled_date', today)
      .eq('status', 'planned')
      .order('scheduled_date', { ascending: false })
      .limit(5),

    supabase
      .from('milestones')
      .select('id, title, achieved_on, students ( id, first_name, last_name, preferred_name )')
      .order('achieved_on', { ascending: false })
      .limit(4),

    supabase.from('students').select('id', { count: 'exact', head: true }).eq('active', true),
  ])

  return {
    today,
    todayClasses: ((todayClasses.data ?? []) as unknown as ClassQueryRow[]).map(shapeClass),
    upcoming: ((upcoming.data ?? []) as unknown as ClassQueryRow[]).map(shapeClass),
    needsCompleting: ((needsCompleting.data ?? []) as unknown as ClassQueryRow[]).map(shapeClass),
    recentMilestones: (recentMilestones.data ?? []) as unknown as {
      id: string
      title: string
      achieved_on: string
      students: { id: string; first_name: string; last_name: string | null; preferred_name: string | null } | null
    }[],
    activeStudentCount: counts.count ?? 0,
  }
}

/**
 * Students with no progress update recently (§6). Uses the newest of their
 * skill-progress timestamps; students who have never been assessed count too.
 */
export async function getStalledStudents(days = 30) {
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('students')
    .select('id, first_name, last_name, preferred_name')
    .eq('active', true)
    .limit(50)

  if (!students || students.length === 0) return []

  const { data: progress } = await supabase
    .from('student_skill_progress')
    .select('student_id, updated_at')
    .in('student_id', students.map((s) => s.id))
    .order('updated_at', { ascending: false })

  const latest = new Map<string, string>()
  for (const row of progress ?? []) {
    if (!latest.has(row.student_id)) latest.set(row.student_id, row.updated_at)
  }

  const cutoff = Date.now() - days * 86_400_000
  return students
    .filter((s) => {
      const last = latest.get(s.id)
      return !last || new Date(last).getTime() < cutoff
    })
    .map((s) => ({
      id: s.id,
      name: (s.preferred_name?.trim() || s.first_name) + (s.last_name ? ` ${s.last_name}` : ''),
      lastUpdate: latest.get(s.id) ?? null,
    }))
    .slice(0, 5)
}
