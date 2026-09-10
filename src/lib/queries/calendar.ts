import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { ClassCardData } from '@/components/classes/class-card'
import type { ClassStatus } from '@/types/database'

const CLASS_SELECT = `
  id, scheduled_date, start_time, duration_minutes, status, theme, week_number,
  terms ( id, name, number_of_weeks ),
  class_students ( students ( id, first_name, last_name, preferred_name ) )
`

type Row = {
  id: string
  scheduled_date: string
  start_time: string
  duration_minutes: number
  status: string
  theme: string | null
  week_number: number
  terms: { id: string; name: string; number_of_weeks: number } | null
  class_students: {
    students: {
      id: string
      first_name: string
      last_name: string | null
      preferred_name: string | null
    } | null
  }[]
}

function shape(row: Row): ClassCardData {
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

export interface ClassFilters {
  termId?: string
  studentId?: string
  status?: ClassStatus
  from?: string
  to?: string
  limit?: number
}

/** Shared by the calendar and the classes list; filters per §32. */
export async function listClasses(filters: ClassFilters = {}) {
  const supabase = await createClient()

  let query = supabase
    .from('classes')
    .select(CLASS_SELECT)
    .order('scheduled_date')
    .order('start_time')
    .limit(filters.limit ?? 400)

  if (filters.termId) query = query.eq('term_id', filters.termId)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.from) query = query.gte('scheduled_date', filters.from)
  if (filters.to) query = query.lte('scheduled_date', filters.to)

  if (filters.studentId) {
    const { data: rows } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', filters.studentId)
    query = query.in('id', (rows ?? []).map((r) => r.class_id))
  }

  const { data } = await query
  return ((data ?? []) as unknown as Row[]).map(shape)
}
