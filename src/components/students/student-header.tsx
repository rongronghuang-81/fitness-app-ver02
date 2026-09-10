'use client'

import * as React from 'react'
import { Archive, ArchiveRestore, Pencil } from 'lucide-react'
import { setStudentArchived } from '@/actions/students'
import { StudentForm } from './student-form'
import { Sheet, ConfirmDialog } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'
import { initials, studentName } from '@/lib/domain/format'
import type { Level, Student } from '@/types/database'

export function StudentHeader({
  student,
  levels,
  attendancePercentage,
}: {
  student: Student & { levels: { id: string; name: string; color: string } | null }
  levels: Pick<Level, 'id' | 'name'>[]
  attendancePercentage: number | null
}) {
  const { notify } = useToast()
  const [editOpen, setEditOpen] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const name = studentName(student)

  function toggleArchive() {
    startTransition(async () => {
      const result = await setStudentArchived(student.id, student.active)
      const toast = toToast(result)
      if (toast) notify(toast.message, toast.tone)
      setConfirmOpen(false)
    })
  }

  return (
    <>
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-lg font-semibold text-[var(--accent)]"
        >
          {initials(name)}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold sm:text-2xl">{name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {student.levels ? <Badge tone="accent">{student.levels.name}</Badge> : null}
            {attendancePercentage !== null ? (
              <Badge tone={attendancePercentage >= 80 ? 'positive' : 'neutral'}>
                {attendancePercentage}% attendance
              </Badge>
            ) : null}
            {!student.active ? <Badge tone="warning">Archived</Badge> : null}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            aria-label={student.active ? 'Archive student' : 'Restore student'}
          >
            {student.active ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
          </Button>
        </div>
      </div>

      <Sheet open={editOpen} onOpenChange={setEditOpen} title={`Edit ${name}`}>
        <StudentForm student={student} levels={levels} onDone={() => setEditOpen(false)} />
      </Sheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={student.active ? `Archive ${name}?` : `Restore ${name}?`}
        description={
          student.active
            ? 'They will be hidden from the active list. All their attendance, progress, milestones and media are kept.'
            : 'They will appear in the active student list again.'
        }
        confirmLabel={student.active ? 'Archive' : 'Restore'}
        destructive={student.active}
        onConfirm={toggleArchive}
        pending={pending}
      />
    </>
  )
}
