'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Trophy } from 'lucide-react'
import {
  completeClass,
  markAllPresent,
  saveStudentClassRecord,
  setAttendance,
  setLessonItemOutcome,
  startActualFromPlan,
} from '@/actions/classes'
import { setSkillStatus, createMilestone } from '@/actions/progress'
import { MediaUpload } from '@/components/media/media-upload'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'
import { ATTENDANCE_OPTIONS } from '@/lib/domain/attendance'
import { studentName } from '@/lib/domain/format'
import { SECTION_LABELS } from '@/lib/domain/lesson'
import type { ClassRoster } from '@/lib/queries/classes'
import type { AttendanceStatus, LessonItem } from '@/types/database'
import { cn } from '@/lib/utils'

type StepId = 'attendance' | 'taught' | 'students' | 'wrapup'

const STEPS: { id: StepId; label: string }[] = [
  { id: 'attendance', label: 'Who came' },
  { id: 'taught', label: 'What you taught' },
  { id: 'students', label: 'Student notes' },
  { id: 'wrapup', label: 'Wrap up' },
]

/**
 * Quick Class Completion (§18).
 *
 * Four short steps rather than one giant form, sized for two to four minutes on
 * a phone straight after class. Every step saves as you go, so an interrupted
 * session never loses what was already entered.
 */
export function CompleteClassFlow({
  classId,
  roster,
  plannedItems,
  actualItems,
  tricks,
  generalNotes,
  open,
  onOpenChange,
}: {
  classId: string
  roster: ClassRoster[]
  plannedItems: LessonItem[]
  actualItems: LessonItem[]
  tricks: { id: string; name: string }[]
  generalNotes: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [step, setStep] = React.useState<StepId>('attendance')
  const [pending, startTransition] = React.useTransition()
  const [notes, setNotes] = React.useState(generalNotes ?? '')
  const [attendance, setLocalAttendance] = React.useState<Record<string, AttendanceStatus>>(
    Object.fromEntries(roster.map((r) => [r.id, r.attendance_status])),
  )

  // Seed the "actual" lesson from the plan the first time this opens, so the
  // instructor ticks items off rather than retyping them.
  React.useEffect(() => {
    if (open) void startActualFromPlan(classId)
  }, [open, classId])

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const trickMap = React.useMemo(() => new Map(tricks.map((t) => [t.id, t.name])), [tricks])

  function mark(row: ClassRoster, status: AttendanceStatus) {
    setLocalAttendance((prev) => ({ ...prev, [row.id]: status }))
    startTransition(async () => {
      const result = await setAttendance(row.id, status)
      if (result.status === 'error') notify(result.message, 'error')
    })
  }

  function finish() {
    startTransition(async () => {
      const result = await completeClass(classId, notes.trim() || null)
      const toast = toToast(result, 'Class complete.')
      if (toast) notify(toast.message, toast.tone)
      if (result.status === 'success') {
        onOpenChange(false)
        setStep('attendance')
        router.refresh()
      }
    })
  }

  const attendedRoster = roster.filter(
    (r) => attendance[r.id] === 'present' || attendance[r.id] === 'late',
  )

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Complete class"
      description={`Step ${stepIndex + 1} of ${STEPS.length} · ${STEPS[stepIndex]?.label}`}
      className="sm:max-w-xl"
      footer={
        <>
          {stepIndex > 0 ? (
            <Button
              variant="secondary"
              className="flex-1 justify-center"
              onClick={() => setStep(STEPS[stepIndex - 1]!.id)}
            >
              Back
            </Button>
          ) : null}
          {stepIndex < STEPS.length - 1 ? (
            <Button
              className="flex-1 justify-center"
              onClick={() => setStep(STEPS[stepIndex + 1]!.id)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button className="flex-1 justify-center" loading={pending} onClick={finish}>
              <Check className="size-4" />
              Mark class complete
            </Button>
          )}
        </>
      }
    >
      {/* Progress rail */}
      <ol className="mb-5 flex gap-1.5" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex-1">
            <button
              type="button"
              onClick={() => setStep(s.id)}
              aria-current={s.id === step ? 'step' : undefined}
              className={cn(
                'h-1.5 w-full rounded-full transition-colors',
                i <= stepIndex ? 'bg-[var(--accent)]' : 'bg-[var(--surface-muted)]',
              )}
            >
              <span className="sr-only">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>

      {step === 'attendance' ? (
        <div className="space-y-3">
          {roster.length > 1 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setLocalAttendance((prev) => {
                  const next = { ...prev }
                  for (const row of roster) if (next[row.id] === 'unmarked') next[row.id] = 'present'
                  return next
                })
                startTransition(async () => {
                  await markAllPresent(classId)
                })
              }}
            >
              Everyone came
            </Button>
          ) : null}

          {roster.length === 0 ? (
            <p className="text-sm text-muted">Nobody is on this class.</p>
          ) : (
            roster.map((row) => (
              <div key={row.id} className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-sm font-medium">
                  {row.students ? studentName(row.students) : 'Student'}
                </p>
                <div
                  role="radiogroup"
                  aria-label={`Attendance for ${row.students ? studentName(row.students) : 'student'}`}
                  className="mt-2 grid grid-cols-4 gap-1.5"
                >
                  {ATTENDANCE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={attendance[row.id] === option.value}
                      onClick={() => mark(row, option.value)}
                      className={cn(
                        'tap rounded-xl border text-sm font-medium',
                        attendance[row.id] === option.value
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-[var(--border)] text-[var(--text-muted)]',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {step === 'taught' ? (
        <TaughtStep classId={classId} plannedItems={plannedItems} actualItems={actualItems} trickMap={trickMap} />
      ) : null}

      {step === 'students' ? (
        <div className="space-y-3">
          {attendedRoster.length === 0 ? (
            <p className="text-sm text-muted">
              Nobody was marked present, so there is nothing to note. Go back if that is wrong.
            </p>
          ) : (
            attendedRoster.map((row) => (
              <QuickStudentNote
                key={row.id}
                row={row}
                tricks={tricks}
                classId={classId}
              />
            ))
          )}

          <MediaUpload
            students={roster.map((r) => r.students).filter((s): s is NonNullable<typeof s> => s !== null)}
            tricks={tricks}
            classId={classId}
            trigger={
              <Button variant="secondary" className="w-full justify-center">
                + Photo or video
              </Button>
            }
          />
        </div>
      ) : null}

      {step === 'wrapup' ? (
        <div className="space-y-4">
          <Field label="General class notes" htmlFor="complete-notes">
            <Textarea
              id="complete-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ran short on time, so Janeiro moves to next week."
            />
          </Field>
          <p className="text-sm text-muted">
            Marking the class complete records the time and moves it out of your follow-up list.
            You can still edit everything afterwards.
          </p>
        </div>
      ) : null}
    </Sheet>
  )
}

/** Step 2: tick off what was actually taught against the plan (§14). */
function TaughtStep({
  classId,
  plannedItems,
  actualItems,
  trickMap,
}: {
  classId: string
  plannedItems: LessonItem[]
  actualItems: LessonItem[]
  trickMap: Map<string, string>
  }) {
  const { notify } = useToast()
  const [outcomes, setOutcomes] = React.useState<Record<string, string>>(
    Object.fromEntries(actualItems.map((i) => [i.id, i.outcome])),
  )
  const [, startTransition] = React.useTransition()

  const items = actualItems.length > 0 ? actualItems : plannedItems

  function toggle(itemId: string, outcome: 'done' | 'skipped') {
    const next = outcomes[itemId] === outcome ? 'planned' : outcome
    setOutcomes((prev) => ({ ...prev, [itemId]: next }))
    startTransition(async () => {
      const result = await setLessonItemOutcome(classId, itemId, next)
      if (result.status === 'error') notify(result.message, 'error')
    })
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        There is no lesson plan for this class. That is fine — add your notes in the next steps.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        Tick what you covered. Anything left unticked stays on the plan as not taught.
      </p>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-2.5"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">
              {item.trick_id ? (trickMap.get(item.trick_id) ?? 'Trick') : item.free_text || 'Item'}
            </span>
            <span className="block text-xs text-subtle">{SECTION_LABELS[item.section]}</span>
          </span>
          <button
            type="button"
            onClick={() => toggle(item.id, 'done')}
            aria-pressed={outcomes[item.id] === 'done'}
            className={cn(
              'tap shrink-0 rounded-xl border px-3 text-sm font-medium',
              outcomes[item.id] === 'done'
                ? 'border-[var(--positive)] bg-[var(--positive-soft)] text-[var(--positive)]'
                : 'border-[var(--border)] text-[var(--text-muted)]',
            )}
          >
            Taught
          </button>
          <button
            type="button"
            onClick={() => toggle(item.id, 'skipped')}
            aria-pressed={outcomes[item.id] === 'skipped'}
            className={cn(
              'tap shrink-0 rounded-xl border px-3 text-sm font-medium',
              outcomes[item.id] === 'skipped'
                ? 'border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]'
                : 'border-[var(--border)] text-[var(--text-muted)]',
            )}
          >
            Skipped
          </button>
        </div>
      ))}
    </div>
  )
}

/** Step 3: one note, one skill update and one milestone per student, inline. */
function QuickStudentNote({
  row,
  tricks,
  classId,
}: {
  row: ClassRoster
  tricks: { id: string; name: string }[]
  classId: string
}) {
  const { notify } = useToast()
  const [open, setOpen] = React.useState(false)
  const [note, setNote] = React.useState(row.performance_notes ?? '')
  const [achievement, setAchievement] = React.useState(row.achievements ?? '')
  const [trickId, setTrickId] = React.useState('')
  const [milestoneTitle, setMilestoneTitle] = React.useState('')
  const [pending, startTransition] = React.useTransition()

  const name = row.students ? studentName(row.students) : 'Student'

  function save() {
    startTransition(async () => {
      const form = new FormData()
      form.set('class_student_id', row.id)
      form.set('performance_notes', note)
      form.set('achievements', achievement)
      const result = await saveStudentClassRecord({ status: 'idle' }, form)

      if (trickId) {
        await setSkillStatus({
          student_id: row.student_id,
          trick_id: trickId,
          status: 'achieved',
        })
      }

      if (milestoneTitle.trim()) {
        const milestoneForm = new FormData()
        milestoneForm.set('student_id', row.student_id)
        milestoneForm.set('class_id', classId)
        milestoneForm.set('achieved_on', new Date().toISOString().slice(0, 10))
        milestoneForm.set('title', milestoneTitle.trim())
        if (trickId) milestoneForm.set('trick_id', trickId)
        await createMilestone({ status: 'idle' }, milestoneForm)
      }

      const toast = toToast(result, `Saved for ${name}.`)
      if (toast) notify(toast.message, toast.tone)
      if (result.status === 'success') setOpen(false)
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="tap flex w-full items-center justify-between px-3 text-left text-sm font-medium"
      >
        {name}
        <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-[var(--border)] p-3">
          <Field label="How did they do?" htmlFor={`q-note-${row.id}`}>
            <Textarea
              id={`q-note-${row.id}`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Strong shoulder engagement today."
            />
          </Field>

          <Field label="Achievement" htmlFor={`q-ach-${row.id}`}>
            <Input
              id={`q-ach-${row.id}`}
              value={achievement}
              onChange={(e) => setAchievement(e.target.value)}
              placeholder="First clean shoulder mount entry"
            />
          </Field>

          <Field
            label="Mark a trick achieved"
            htmlFor={`q-trick-${row.id}`}
            hint="Records the achievement date automatically."
          >
            <select
              id={`q-trick-${row.id}`}
              value={trickId}
              onChange={(e) => setTrickId(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="">No change</option>
              {tricks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Milestone"
            htmlFor={`q-mile-${row.id}`}
            hint="Leave blank if this was not a first."
          >
            <Input
              id={`q-mile-${row.id}`}
              value={milestoneTitle}
              onChange={(e) => setMilestoneTitle(e.target.value)}
              placeholder="First unassisted shoulder mount"
            />
          </Field>

          <Button size="sm" loading={pending} onClick={save}>
            {milestoneTitle.trim() ? (
              <>
                <Trophy className="size-4" />
                Save with milestone
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
