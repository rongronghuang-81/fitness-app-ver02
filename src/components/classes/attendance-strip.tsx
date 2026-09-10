'use client'

import * as React from 'react'
import { CheckCheck } from 'lucide-react'
import { markAllPresent, setAttendance } from '@/actions/classes'
import { ATTENDANCE_OPTIONS } from '@/lib/domain/attendance'
import { studentName } from '@/lib/domain/format'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'
import type { AttendanceStatus } from '@/types/database'
import type { ClassRoster } from '@/lib/queries/classes'
import { cn } from '@/lib/utils'

const TONE_CLASSES: Record<string, string> = {
  positive: 'border-[var(--positive)] bg-[var(--positive-soft)] text-[var(--positive)]',
  warning: 'border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]',
  negative: 'border-[var(--negative)] bg-[var(--negative-soft)] text-[var(--negative)]',
  neutral: 'border-[var(--border-strong)] bg-[var(--surface-muted)] text-[var(--text)]',
}

/**
 * One-tap attendance (§16).
 *
 * Optimistic: the button lights up the instant it is tapped, because on a studio
 * wifi connection a round-trip is long enough to make someone tap twice.
 * Attendance is never defaulted to Present without an explicit action.
 */
export function AttendanceStrip({
  classId,
  roster,
}: {
  classId: string
  roster: ClassRoster[]
}) {
  const { notify } = useToast()
  const [optimistic, setOptimistic] = React.useState<Record<string, AttendanceStatus>>({})
  const [, startTransition] = React.useTransition()

  const statusOf = (row: ClassRoster) => optimistic[row.id] ?? row.attendance_status
  const unmarked = roster.filter((r) => statusOf(r) === 'unmarked').length

  function mark(row: ClassRoster, status: AttendanceStatus) {
    setOptimistic((prev) => ({ ...prev, [row.id]: status }))
    startTransition(async () => {
      const result = await setAttendance(row.id, status)
      if (result.status === 'error') {
        setOptimistic((prev) => {
          const next = { ...prev }
          delete next[row.id]
          return next
        })
        notify(result.message, 'error')
      }
    })
  }

  function markEveryone() {
    setOptimistic((prev) => {
      const next = { ...prev }
      for (const row of roster) if (statusOf(row) === 'unmarked') next[row.id] = 'present'
      return next
    })
    startTransition(async () => {
      const result = await markAllPresent(classId)
      const toast = toToast(result)
      if (toast && toast.tone === 'error') notify(toast.message, 'error')
    })
  }

  if (roster.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] p-6 text-center text-sm text-muted">
        Nobody is on this class yet. Enrol students on the term, or add someone to just this class.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {unmarked > 1 ? (
        <Button variant="secondary" size="sm" onClick={markEveryone}>
          <CheckCheck className="size-4" />
          Mark all present
        </Button>
      ) : null}

      <ul className="space-y-2">
        {roster.map((row) => {
          const status = statusOf(row)
          return (
            <li
              key={row.id}
              className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]"
            >
              <p className="text-sm font-medium">
                {row.students ? studentName(row.students) : 'Student'}
              </p>
              <div
                role="radiogroup"
                aria-label={`Attendance for ${row.students ? studentName(row.students) : 'student'}`}
                className="mt-2 grid grid-cols-4 gap-1.5"
              >
                {ATTENDANCE_OPTIONS.map((option) => {
                  const active = status === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => mark(row, active ? 'unmarked' : option.value)}
                      className={cn(
                        'tap rounded-xl border text-sm font-medium transition-colors',
                        active
                          ? TONE_CLASSES[option.tone]
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]',
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
