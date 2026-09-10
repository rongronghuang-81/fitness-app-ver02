import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { listStudents } from '@/lib/queries/students'
import { StudentList, type StudentRow } from '@/components/students/student-list'
import { PageHeader } from '@/components/ui/page'
import { AddStudentButton } from '@/components/students/add-student-button'

export const metadata: Metadata = { title: 'Students' }

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; new?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [students, { data: levels }] = await Promise.all([
    listStudents({ status: (params.status as 'active' | 'archived' | 'all') ?? 'active' }),
    supabase.from('levels').select('id, name').eq('active', true).order('sort_order'),
  ])

  return (
    <>
      <PageHeader
        title="Students"
        description={`${students.length} ${students.length === 1 ? 'student' : 'students'}`}
        action={<AddStudentButton levels={levels ?? []} />}
      />
      <StudentList
        students={students as StudentRow[]}
        levels={levels ?? []}
        openNew={params.new === '1'}
      />
    </>
  )
}
