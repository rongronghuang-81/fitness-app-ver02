'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, UserMinus, Users } from 'lucide-react'
import { enrolStudent, setEnrolmentStatus } from '@/actions/terms'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'
import { studentName } from '@/lib/domain/format'
import type { ActionState } from '@/actions/types'

interface Enrolment {
  student_id: string
  status: string
  students: {
    id: string
    first_name: string
    last_name: string | null
    preferred_name: string | null
  } | null
}

/**
 * Term enrolment (§11). Any number of students — a term is not assumed to hold
 * exactly three. Adding someone fans the roster onto every future class in the
 * term via a database trigger, so nothing has to be repeated per class.
 */
export function TermRoster({
  termId,
  enrolments,
  allStudents,
}: {
  termId: string
  enrolments: Enrolment[]
  allStudents: { id: string; first_name: string; last_name: string | null; preferred_name: string | null }[]
}) {
  const { notify } = useToast()
  const [addOpen, setAddOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  const enrolledIds = new Set(enrolments.map((e) => e.student_id))
  const available = allStudents.filter((s) => !enrolledIds.has(s.id))

  function run(fn: () => Promise<ActionState>) {
    startTransition(async () => {
      const result = await fn()
      const toast = toToast(result)
      if (toast) notify(toast.message, toast.tone)
      setAddOpen(false)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Students{' '}
          <span className="font-normal text-muted">({enrolments.length})</span>
        </h2>
        <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Enrol
        </Button>
      </div>

      {enrolments.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nobody enrolled yet"
          description="Enrol a student and they'll be added to every class in this term."
          action={<Button onClick={() => setAddOpen(true)}>Enrol a student</Button>}
        />
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
          {enrolments.map((enrolment) => (
            <li key={enrolment.student_id} className="flex items-center justify-between gap-3 p-3">
              <Link
                href={`/students/${enrolment.student_id}`}
                className="min-w-0 truncate text-sm font-medium hover:underline"
              >
                {enrolment.students ? studentName(enrolment.students) : 'Student'}
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={enrolment.status === 'enrolled' ? 'positive' : 'neutral'}>
                  {enrolment.status}
                </Badge>
                {enrolment.status === 'enrolled' ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() => setEnrolmentStatus(termId, enrolment.student_id, 'withdrawn'))
                    }
                    aria-label={`Withdraw ${enrolment.students ? studentName(enrolment.students) : 'student'}`}
                    className="tap flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
                  >
                    <UserMinus className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() => setEnrolmentStatus(termId, enrolment.student_id, 'enrolled'))
                    }
                    className="text-xs font-medium text-[var(--accent)] disabled:opacity-50"
                  >
                    Re-enrol
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Enrol a student"
        description="They'll be added to every class in this term that hasn't been taught yet."
      >
        {available.length === 0 ? (
          <p className="text-sm text-muted">
            Every active student is already enrolled.{' '}
            <Link href="/students?new=1" className="font-medium text-[var(--accent)] hover:underline">
              Add a new student
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-1">
            {available.map((student) => (
              <li key={student.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => enrolStudent(termId, student.id))}
                  className="tap flex w-full items-center rounded-xl px-3 text-left text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
                >
                  {studentName(student)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  )
}
