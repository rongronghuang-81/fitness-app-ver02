import type { Metadata } from 'next'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, SectionTitle } from '@/components/ui/page'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { progressBreakdown, skillStatusMeta } from '@/lib/domain/progress'
import { formatDateShort, studentName } from '@/lib/domain/format'

export const metadata: Metadata = { title: 'Progress' }

/** Cross-student progression overview (§8 Progress, phase 3). */
export default async function ProgressPage() {
  const supabase = await createClient()

  const [{ data: students }, { data: progress }, { data: milestones }] = await Promise.all([
    supabase
      .from('students')
      .select('id, first_name, last_name, preferred_name')
      .eq('active', true)
      .order('first_name'),
    supabase
      .from('student_skill_progress')
      .select('student_id, status, updated_at, tricks ( id, name )')
      .order('updated_at', { ascending: false }),
    supabase
      .from('milestones')
      .select('id, title, achieved_on, students ( id, first_name, last_name, preferred_name ), tricks ( name )')
      .order('achieved_on', { ascending: false })
      .limit(12),
  ])

  type ProgressRow = {
    student_id: string
    status: string
    updated_at: string
    tricks: { id: string; name: string } | null
  }

  const byStudent = new Map<string, ProgressRow[]>()
  for (const row of (progress ?? []) as unknown as ProgressRow[]) {
    const list = byStudent.get(row.student_id) ?? []
    list.push(row)
    byStudent.set(row.student_id, list)
  }

  const hasAnything = (students ?? []).length > 0

  return (
    <>
      <PageHeader
        title="Progress"
        description="Where each student is across the skills you track."
      />

      {!hasAnything ? (
        <EmptyState
          icon={TrendingUp}
          title="No students yet"
          description="Add your first student to start tracking attendance and progress."
          action={
            <Link
              href="/students?new=1"
              className="tap inline-flex items-center rounded-xl bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-text)]"
            >
              Add a student
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          <section className="space-y-2">
            <SectionTitle>By student</SectionTitle>
            <ul className="space-y-2">
              {(students ?? []).map((student) => {
                const rows = byStudent.get(student.id) ?? []
                const summary = progressBreakdown(rows.map((r) => r.status))
                const recent = rows.slice(0, 3)

                return (
                  <li key={student.id}>
                    <Link
                      href={`/students/${student.id}`}
                      className="block rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] transition-colors hover:border-[var(--border-strong)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold">{studentName(student)}</p>
                        <span className="shrink-0 text-xs text-muted">
                          {summary.tracked === 0
                            ? 'Nothing tracked'
                            : `${summary.landed} of ${summary.tracked} landed`}
                        </span>
                      </div>

                      {summary.percentage !== null ? (
                        <div
                          role="progressbar"
                          aria-valuenow={summary.percentage}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${studentName(student)} skills landed`}
                          className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]"
                        >
                          <div
                            className="h-full rounded-full bg-[var(--accent)]"
                            style={{ width: `${summary.percentage}%` }}
                          />
                        </div>
                      ) : null}

                      {recent.length > 0 ? (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {recent.map((row) => {
                            const meta = skillStatusMeta(row.status)
                            return (
                              <Badge key={`${row.student_id}-${row.tricks?.id}`} tone={meta.tone}>
                                {row.tricks?.name ?? 'Trick'} · {meta.short}
                              </Badge>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-subtle">
                          No skills tracked yet. Open their profile to start.
                        </p>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent milestones</CardTitle>
            </CardHeader>
            <CardContent>
              {(milestones ?? []).length === 0 ? (
                <p className="text-sm text-muted">
                  Milestones recorded during class completion appear here.
                </p>
              ) : (
                <ul className="space-y-2">
                  {(
                    (milestones ?? []) as unknown as {
                      id: string
                      title: string
                      achieved_on: string
                      students: {
                        id: string
                        first_name: string
                        last_name: string | null
                        preferred_name: string | null
                      } | null
                      tricks: { name: string } | null
                    }[]
                  ).map((m) => (
                    <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0">
                        <Link
                          href={m.students ? `/students/${m.students.id}` : '#'}
                          className="font-medium hover:underline"
                        >
                          {m.students ? studentName(m.students) : 'Student'}
                        </Link>
                        <span className="text-muted">
                          {' '}
                          — {m.title}
                          {m.tricks ? ` (${m.tricks.name})` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-subtle">
                        {formatDateShort(m.achieved_on)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
