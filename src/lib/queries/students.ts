import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { studentName } from '@/lib/domain/format'
import type { AttendanceStatus, Student } from '@/types/database'

export interface StudentListFilters {
  q?: string
  status?: 'active' | 'archived' | 'all'
  levelId?: string
  termId?: string
}

export async function listStudents(filters: StudentListFilters = {}) {
  const supabase = await createClient()

  let query = supabase
    .from('students')
    .select('id, first_name, last_name, preferred_name, active, date_joined, current_level_id, levels ( id, name, color )')
    .order('first_name')

  if (filters.status !== 'all') {
    query = query.eq('active', filters.status !== 'archived')
  }
  if (filters.levelId) query = query.eq('current_level_id', filters.levelId)

  if (filters.termId) {
    const { data: enrolled } = await supabase
      .from('term_students')
      .select('student_id')
      .eq('term_id', filters.termId)
    query = query.in('id', (enrolled ?? []).map((e) => e.student_id))
  }

  const { data, error } = await query
  if (error) throw error

  const term = filters.q?.trim().toLowerCase()
  const rows = (data ?? []) as unknown as {
    id: string
    first_name: string
    last_name: string | null
    preferred_name: string | null
    active: boolean
    date_joined: string
    current_level_id: string | null
    levels: { id: string; name: string; color: string } | null
  }[]

  return term
    ? rows.filter((s) => studentName(s).toLowerCase().includes(term))
    : rows
}

/** Everything a student profile page renders, fetched in parallel. */
export async function getStudentProfile(studentId: string) {
  const supabase = await createClient()

  const [student, attendance, progress, milestones, media] = await Promise.all([
    supabase
      .from('students')
      .select('*, levels ( id, name, color )')
      .eq('id', studentId)
      .maybeSingle(),

    supabase
      .from('class_students')
      .select(`
        id, attendance_status, performance_notes, achievements, difficulties,
        homework, instructor_notes,
        classes (
          id, scheduled_date, start_time, week_number, status,
          terms ( id, name )
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(200),

    supabase
      .from('student_skill_progress')
      .select(`
        id, status, introduced_date, first_attempted_date, first_achieved_date,
        consistent_date, last_practised_date, instructor_notes, updated_at,
        tricks ( id, name, difficulty )
      `)
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false }),

    supabase
      .from('milestones')
      .select('id, title, description, instructor_note, achieved_on, tricks ( id, name ), classes ( id, scheduled_date )')
      .eq('student_id', studentId)
      .order('achieved_on', { ascending: false }),

    supabase
      .from('media')
      .select('id, file_type, caption, created_at, class_id, trick_id, tricks ( id, name )')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(60),
  ])

  if (!student.data) return null

  type AttendanceRow = {
    id: string
    attendance_status: AttendanceStatus
    performance_notes: string | null
    achievements: string | null
    difficulties: string | null
    homework: string | null
    instructor_notes: string | null
    classes: {
      id: string
      scheduled_date: string
      start_time: string
      week_number: number
      status: string
      terms: { id: string; name: string } | null
    } | null
  }

  const attendanceRows = ((attendance.data ?? []) as unknown as AttendanceRow[])
    .filter((r) => r.classes !== null)
    .sort((a, b) =>
      (b.classes?.scheduled_date ?? '').localeCompare(a.classes?.scheduled_date ?? ''),
    )

  return {
    student: student.data as unknown as Student & {
      levels: { id: string; name: string; color: string } | null
    },
    attendance: attendanceRows,
    progress: (progress.data ?? []) as unknown as {
      id: string
      status: string
      introduced_date: string | null
      first_attempted_date: string | null
      first_achieved_date: string | null
      consistent_date: string | null
      last_practised_date: string | null
      instructor_notes: string | null
      updated_at: string
      tricks: { id: string; name: string; difficulty: number | null } | null
    }[],
    milestones: (milestones.data ?? []) as unknown as {
      id: string
      title: string
      description: string | null
      instructor_note: string | null
      achieved_on: string
      tricks: { id: string; name: string } | null
      classes: { id: string; scheduled_date: string } | null
    }[],
    media: (media.data ?? []) as unknown as {
      id: string
      file_type: 'photo' | 'video'
      caption: string | null
      created_at: string
      class_id: string | null
      trick_id: string | null
      tricks: { id: string; name: string } | null
    }[],
  }
}

export async function getCurrentTermsForStudent(studentId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('term_students')
    .select('status, terms ( id, name, status, start_date, number_of_weeks )')
    .eq('student_id', studentId)

  return (data ?? []) as unknown as {
    status: string
    terms: {
      id: string
      name: string
      status: string
      start_date: string
      number_of_weeks: number
    } | null
  }[]
}
