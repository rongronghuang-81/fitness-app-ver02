'use client'

import * as React from 'react'
import Link from 'next/link'
import { Ban, RotateCcw } from 'lucide-react'
import { setClassStatus } from '@/actions/terms'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'
import { CLASS_STATUS_LABEL, CLASS_STATUS_TONE } from '@/components/classes/class-card'
import { formatDate } from '@/lib/domain/format'
import { endTime, formatTime } from '@/lib/domain/schedule'

interface TermClass {
  id: string
  week_number: number
  scheduled_date: string
  start_time: string
  duration_minutes: number
  status: string
  theme: string | null
  class_students: { id: string }[]
}

/** The generated weekly classes, each individually cancellable or restorable (§10). */
export function TermClassList({
  classes,
  termName,
}: {
  classes: TermClass[]
  termName: string
}) {
  const { notify } = useToast()
  const [confirmCancel, setConfirmCancel] = React.useState<TermClass | null>(null)
  const [pending, startTransition] = React.useTransition()

  function change(classId: string, status: 'planned' | 'cancelled') {
    startTransition(async () => {
      const result = await setClassStatus(classId, status)
      const toast = toToast(result)
      if (toast) notify(toast.message, toast.tone)
      setConfirmCancel(null)
    })
  }

  if (classes.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] p-6 text-center text-sm text-muted">
        No classes generated yet. Edit the term to set its schedule.
      </p>
    )
  }

  return (
    <>
      <ol className="divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
        {classes.map((session) => (
          <li key={session.id} className="flex items-center gap-3 p-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--surface-muted)] text-xs font-semibold"
            >
              {session.week_number}
            </span>

            <Link href={`/classes/${session.id}`} className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {formatDate(session.scheduled_date)}
              </span>
              <span className="block text-xs text-muted">
                {formatTime(session.start_time)} –{' '}
                {endTime(session.start_time, session.duration_minutes)}
                {session.theme ? ` · ${session.theme}` : ''}
                {' · '}
                {session.class_students.length}{' '}
                {session.class_students.length === 1 ? 'student' : 'students'}
              </span>
            </Link>

            <Badge tone={CLASS_STATUS_TONE[session.status] ?? 'neutral'}>
              {CLASS_STATUS_LABEL[session.status] ?? session.status}
            </Badge>

            {session.status === 'cancelled' ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => change(session.id, 'planned')}
                aria-label={`Restore week ${session.week_number}`}
                className="tap flex shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
              >
                <RotateCcw className="size-4" />
              </button>
            ) : session.status !== 'completed' ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmCancel(session)}
                aria-label={`Cancel week ${session.week_number}`}
                className="tap flex shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
              >
                <Ban className="size-4" />
              </button>
            ) : null}
          </li>
        ))}
      </ol>

      <ConfirmDialog
        open={confirmCancel !== null}
        onOpenChange={(open) => !open && setConfirmCancel(null)}
        title={`Cancel week ${confirmCancel?.week_number}?`}
        description={`${termName} on ${confirmCancel ? formatDate(confirmCancel.scheduled_date) : ''} will be marked cancelled. Its lesson plan and notes are kept, and you can restore it later.`}
        confirmLabel="Cancel class"
        onConfirm={() => confirmCancel && change(confirmCancel.id, 'cancelled')}
        pending={pending}
      />
    </>
  )
}
