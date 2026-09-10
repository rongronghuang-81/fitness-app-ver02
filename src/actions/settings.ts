'use server'

import { revalidatePath } from 'next/cache'
import { createClient, requireUser } from '@/lib/supabase/server'
import { profileSchema } from '@/lib/validation/schemas'
import { formToObject } from '@/lib/form-data'
import { describeDbError, failure, fieldErrors, success, type ActionState } from '@/actions/types'
import { toCsv } from '@/lib/domain/csv'
import { studentName } from '@/lib/domain/format'
import { summariseAttendance } from '@/lib/domain/attendance'
import type { AttendanceStatus } from '@/types/database'

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser()
  const parsed = profileSchema.safeParse({
    ...formToObject(formData),
    // Unchecked checkboxes are absent from FormData entirely.
    default_attendance_present: formData.get('default_attendance_present') === 'on',
  })
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update(parsed.data).eq('id', user.id)
  if (error) return failure(describeDbError(error))

  revalidatePath('/', 'layout')
  return success('Settings saved.')
}

export type ExportKind = 'students' | 'attendance' | 'classes' | 'progress'

/**
 * CSV export (§46).
 *
 * Built here rather than in the browser so the queries stay under RLS and the
 * export never depends on third-party software.
 */
export async function exportCsv(kind: ExportKind): Promise<{ filename: string; csv: string }> {
  await requireUser()
  const supabase = await createClient()

  if (kind === 'students') {
    const { data } = await supabase
      .from('students')
      .select('first_name, last_name, preferred_name, email, phone, date_joined, active, goals, levels ( name )')
      .order('first_name')

    const rows = (data ?? []) as unknown as {
      first_name: string
      last_name: string | null
      preferred_name: string | null
      email: string | null
      phone: string | null
      date_joined: string
      active: boolean
      goals: string | null
      levels: { name: string } | null
    }[]

    return {
      filename: 'students',
      csv: toCsv(
        ['Name', 'First name', 'Last name', 'Email', 'Phone', 'Level', 'Joined', 'Active', 'Goals'],
        rows.map((s) => [
          studentName(s),
          s.first_name,
          s.last_name,
          s.email,
          s.phone,
          s.levels?.name ?? '',
          s.date_joined,
          s.active ? 'yes' : 'no',
          s.goals,
        ]),
      ),
    }
  }

  if (kind === 'attendance') {
    const { data } = await supabase
      .from('class_students')
      .select(`
        attendance_status, attendance_marked_at,
        students ( first_name, last_name, preferred_name ),
        classes ( scheduled_date, week_number, terms ( name ) )
      `)
      .limit(5000)

    const rows = (data ?? []) as unknown as {
      attendance_status: AttendanceStatus
      attendance_marked_at: string | null
      students: { first_name: string; last_name: string | null; preferred_name: string | null } | null
      classes: { scheduled_date: string; week_number: number; terms: { name: string } | null } | null
    }[]

    const sorted = rows
      .filter((r) => r.classes)
      .sort((a, b) => (b.classes?.scheduled_date ?? '').localeCompare(a.classes?.scheduled_date ?? ''))

    return {
      filename: 'attendance',
      csv: toCsv(
        ['Date', 'Term', 'Week', 'Student', 'Attendance', 'Marked at'],
        sorted.map((r) => [
          r.classes?.scheduled_date,
          r.classes?.terms?.name ?? '',
          r.classes?.week_number,
          r.students ? studentName(r.students) : '',
          r.attendance_status,
          r.attendance_marked_at ?? '',
        ]),
      ),
    }
  }

  if (kind === 'classes') {
    const { data } = await supabase
      .from('classes')
      .select(`
        scheduled_date, start_time, duration_minutes, week_number, status, theme,
        general_notes, completed_at,
        terms ( name, location ),
        class_students ( attendance_status )
      `)
      .order('scheduled_date', { ascending: false })
      .limit(2000)

    const rows = (data ?? []) as unknown as {
      scheduled_date: string
      start_time: string
      duration_minutes: number
      week_number: number
      status: string
      theme: string | null
      general_notes: string | null
      completed_at: string | null
      terms: { name: string; location: string | null } | null
      class_students: { attendance_status: AttendanceStatus }[]
    }[]

    return {
      filename: 'class-history',
      csv: toCsv(
        [
          'Date', 'Time', 'Minutes', 'Term', 'Week', 'Status', 'Theme',
          'Location', 'Attended', 'Roster', 'Completed at', 'Notes',
        ],
        rows.map((c) => {
          const summary = summariseAttendance(c.class_students.map((cs) => cs.attendance_status))
          return [
            c.scheduled_date,
            c.start_time,
            c.duration_minutes,
            c.terms?.name ?? '',
            c.week_number,
            c.status,
            c.theme,
            c.terms?.location ?? '',
            summary.attended,
            summary.total,
            c.completed_at ?? '',
            c.general_notes,
          ]
        }),
      ),
    }
  }

  const { data } = await supabase
    .from('student_skill_progress')
    .select(`
      status, introduced_date, first_attempted_date, first_achieved_date,
      consistent_date, last_practised_date, instructor_notes,
      students ( first_name, last_name, preferred_name ),
      tricks ( name )
    `)
    .limit(5000)

  const rows = (data ?? []) as unknown as {
    status: string
    introduced_date: string | null
    first_attempted_date: string | null
    first_achieved_date: string | null
    consistent_date: string | null
    last_practised_date: string | null
    instructor_notes: string | null
    students: { first_name: string; last_name: string | null; preferred_name: string | null } | null
    tricks: { name: string } | null
  }[]

  return {
    filename: 'skill-progression',
    csv: toCsv(
      [
        'Student', 'Trick', 'Status', 'Introduced', 'First attempted',
        'First achieved', 'Consistent', 'Last practised', 'Notes',
      ],
      rows.map((p) => [
        p.students ? studentName(p.students) : '',
        p.tricks?.name ?? '',
        p.status,
        p.introduced_date,
        p.first_attempted_date,
        p.first_achieved_date,
        p.consistent_date,
        p.last_practised_date,
        p.instructor_notes,
      ]),
    ),
  }
}
