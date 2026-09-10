import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ClassFilters } from '@/components/classes/class-filters'
import { PageHeader } from '@/components/ui/page'

export const metadata: Metadata = { title: 'Classes' }

export default async function ClassesPage() {
  const supabase = await createClient()

  const [{ data: rows }, { data: terms }, { data: students }] = await Promise.all([
    supabase
      .from('classes')
      .select(`
        id, term_id, scheduled_date, start_time, duration_minutes, status, theme, week_number,
        terms ( id, name, number_of_weeks ),
        class_students ( student_id, students ( id, first_name, last_name, preferred_name ) )
      `)
      .order('scheduled_date', { ascending: false })
      .limit(300),
    supabase.from('terms').select('id, name').order('start_date', { ascending: false }),
    supabase
      .from('students')
      .select('id, first_name, last_name, preferred_name')
      .eq('active', true)
      .order('first_name'),
  ])

  type Row = {
    id: string
    term_id: string
    scheduled_date: string
    start_time: string
    duration_minutes: number
    status: string
    theme: string | null
    week_number: number
    terms: { id: string; name: string; number_of_weeks: number } | null
    class_students: {
      student_id: string
      students: {
        id: string
        first_name: string
        last_name: string | null
        preferred_name: string | null
      } | null
    }[]
  }

  const classes = ((rows ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    termId: row.term_id,
    scheduled_date: row.scheduled_date,
    start_time: row.start_time,
    duration_minutes: row.duration_minutes,
    status: row.status,
    theme: row.theme,
    week_number: row.week_number,
    term: row.terms,
    studentIds: row.class_students.map((cs) => cs.student_id),
    students: row.class_students
      .map((cs) => cs.students)
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => ({
        id: s.id,
        name: (s.preferred_name?.trim() || s.first_name) + (s.last_name ? ` ${s.last_name}` : ''),
      })),
  }))

  return (
    <>
      <PageHeader title="Classes" description="Every class across all your terms." />
      <ClassFilters classes={classes} terms={terms ?? []} students={students ?? []} />
    </>
  )
}
