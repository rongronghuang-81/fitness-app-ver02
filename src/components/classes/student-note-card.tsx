'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { saveStudentClassRecord } from '@/actions/classes'
import { Field, Textarea } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'
import { studentName } from '@/lib/domain/format'
import type { ClassRoster } from '@/lib/queries/classes'
import { cn } from '@/lib/utils'

/**
 * Per-student class record (§17), collapsed by default.
 *
 * Progressive disclosure matters here: with three students, a flat form would
 * be fifteen textareas on a phone screen. Collapsed, the instructor opens only
 * the student they want to write about.
 */
export function StudentNoteCard({
  row,
  defaultOpen = false,
}: {
  row: ClassRoster
  defaultOpen?: boolean
}) {
  const { notify } = useToast()
  const [open, setOpen] = React.useState(defaultOpen)
  const [state, action, pending] = React.useActionState(saveStudentClassRecord, {
    status: 'idle' as const,
  })

  React.useEffect(() => {
    const toast = toToast(state)
    if (toast) notify(toast.message, toast.tone)
  }, [state, notify])

  const name = row.students ? studentName(row.students) : 'Student'
  const hasNotes = Boolean(
    row.performance_notes || row.achievements || row.difficulties || row.homework,
  )
  const panelId = `notes-${row.id}`

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="tap flex w-full items-center justify-between gap-3 px-4 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium">{name}</span>
          <span className="block text-xs text-muted">
            {hasNotes ? 'Has notes' : 'No notes yet'}
          </span>
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-[var(--text-muted)] transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      <div id={panelId} hidden={!open}>
        <form action={action} className="space-y-3 border-t border-[var(--border)] p-4">
          <input type="hidden" name="class_student_id" value={row.id} />

          <Field label="Achievements" htmlFor={`ach-${row.id}`}>
            <Textarea
              id={`ach-${row.id}`}
              name="achievements"
              rows={2}
              defaultValue={row.achievements ?? ''}
              placeholder="Achieved first clean shoulder mount entry"
            />
          </Field>
          <Field label="Performance notes" htmlFor={`perf-${row.id}`}>
            <Textarea
              id={`perf-${row.id}`}
              name="performance_notes"
              rows={2}
              defaultValue={row.performance_notes ?? ''}
              placeholder="Strong shoulder engagement today"
            />
          </Field>
          <Field label="Working on" htmlFor={`diff-${row.id}`}>
            <Textarea
              id={`diff-${row.id}`}
              name="difficulties"
              rows={2}
              defaultValue={row.difficulties ?? ''}
              placeholder="Needs cleaner entry; grip strength"
            />
          </Field>
          <Field label="Homework" htmlFor={`hw-${row.id}`}>
            <Textarea
              id={`hw-${row.id}`}
              name="homework"
              rows={2}
              defaultValue={row.homework ?? ''}
            />
          </Field>

          <Button type="submit" variant="secondary" size="sm" loading={pending}>
            {pending ? 'Saving…' : `Save notes for ${name}`}
          </Button>
        </form>
      </div>
    </div>
  )
}
