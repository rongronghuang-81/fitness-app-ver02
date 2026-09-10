'use client'

import * as React from 'react'
import { Check, GripVertical, Plus, Trash2, X } from 'lucide-react'
import { addLessonItem, removeLessonItem, saveLessonDetails } from '@/actions/classes'
import { LibraryPicker, type LibraryOption } from './library-picker'
import { LESSON_SECTIONS } from '@/lib/domain/lesson'
import { formatDuration } from '@/lib/domain/lesson'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'
import type { LessonItem, LessonKind, LessonSection } from '@/types/database'

interface LessonBundle {
  id: string | null
  objective: string | null
  combinations: string | null
  homework: string | null
  instructor_notes: string | null
  items: LessonItem[]
}

/**
 * The structured lesson plan (§13). Used for both the planned lesson and the
 * "what actually happened" record — they are the same shape, stored separately
 * so the plan survives (§14).
 */
export function LessonPlan({
  classId,
  kind,
  lesson,
  tricks,
  exercises,
  onCopyPrevious,
  readOnlyNotice,
}: {
  classId: string
  kind: LessonKind
  lesson: LessonBundle
  tricks: (LibraryOption & { difficulty: number | null })[]
  exercises: (LibraryOption & { target_area: string | null })[]
  onCopyPrevious?: React.ReactNode
  readOnlyNotice?: string
}) {
  const { notify } = useToast()
  const [picker, setPicker] = React.useState<{ section: LessonSection; kind: 'trick' | 'exercise' } | null>(
    null,
  )
  const [noteSection, setNoteSection] = React.useState<LessonSection | null>(null)
  const [pending, startTransition] = React.useTransition()

  const trickNames = React.useMemo(
    () => new Map(tricks.map((t) => [t.id, t.name] as const)),
    [tricks],
  )
  const exerciseNames = React.useMemo(
    () => new Map(exercises.map((e) => [e.id, e.name] as const)),
    [exercises],
  )

  function add(section: LessonSection, pick: { id: string; name: string }, as: 'trick' | 'exercise') {
    startTransition(async () => {
      const result = await addLessonItem(classId, kind, {
        section,
        ...(as === 'trick' ? { trick_id: pick.id } : { exercise_id: pick.id }),
      })
      const toast = toToast(result, `${pick.name} added.`)
      if (toast && toast.tone === 'error') notify(toast.message, 'error')
    })
  }

  function addFreeText(section: LessonSection, text: string) {
    startTransition(async () => {
      const result = await addLessonItem(classId, kind, { section, free_text: text })
      const toast = toToast(result)
      if (toast && toast.tone === 'error') notify(toast.message, 'error')
      setNoteSection(null)
    })
  }

  function remove(itemId: string) {
    startTransition(async () => {
      const result = await removeLessonItem(classId, itemId)
      const toast = toToast(result)
      if (toast && toast.tone === 'error') notify(toast.message, 'error')
    })
  }

  return (
    <div className="space-y-5">
      {readOnlyNotice ? (
        <p className="rounded-xl bg-[var(--info-soft)] px-3 py-2.5 text-sm text-[var(--info)]">
          {readOnlyNotice}
        </p>
      ) : null}

      {onCopyPrevious ? <div className="flex flex-wrap gap-2">{onCopyPrevious}</div> : null}

      <LessonDetailsForm classId={classId} kind={kind} lesson={lesson} />

      {LESSON_SECTIONS.map((section) => {
        const items = lesson.items
          .filter((i) => i.section === section.id)
          .sort((a, b) => a.position - b.position)

        return (
          <section
            key={section.id}
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold">{section.label}</h3>
              <span className="text-xs text-subtle">{section.hint}</span>
            </div>

            {items.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2"
                  >
                    <GripVertical className="size-3.5 shrink-0 text-[var(--text-subtle)]" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-sm">
                      {item.trick_id
                        ? (trickNames.get(item.trick_id) ?? 'Trick')
                        : item.exercise_id
                          ? (exerciseNames.get(item.exercise_id) ?? 'Exercise')
                          : item.free_text}
                      {item.sets || item.reps || item.duration_seconds ? (
                        <span className="text-muted">
                          {' · '}
                          {[
                            item.sets && item.reps
                              ? `${item.sets} × ${item.reps}`
                              : (item.sets ?? item.reps ?? null),
                            item.duration_seconds ? formatDuration(item.duration_seconds) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(item.id)}
                      aria-label="Remove item"
                      className="tap flex shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--negative)] disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-subtle">Nothing here yet.</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {section.accepts !== 'trick' ? (
                <Button
                  variant="subtle"
                  size="sm"
                  disabled={pending}
                  onClick={() => setPicker({ section: section.id, kind: 'exercise' })}
                >
                  <Plus className="size-4" />
                  Exercise
                </Button>
              ) : null}
              {section.accepts !== 'exercise' ? (
                <Button
                  variant="subtle"
                  size="sm"
                  disabled={pending}
                  onClick={() => setPicker({ section: section.id, kind: 'trick' })}
                >
                  <Plus className="size-4" />
                  Trick
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setNoteSection(section.id)}
              >
                <Plus className="size-4" />
                Note
              </Button>
            </div>

            {noteSection === section.id ? (
              <InlineNoteInput
                onCancel={() => setNoteSection(null)}
                onSubmit={(text) => addFreeText(section.id, text)}
                pending={pending}
              />
            ) : null}
          </section>
        )
      })}

      {picker ? (
        <LibraryPicker
          open
          onOpenChange={(open) => !open && setPicker(null)}
          kind={picker.kind}
          options={picker.kind === 'trick' ? tricks : exercises}
          onPick={(pick) => add(picker.section, pick, picker.kind)}
        />
      ) : null}
    </div>
  )
}

/** Free-text item entry, inline rather than a browser prompt. */
function InlineNoteInput({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (text: string) => void
  onCancel: () => void
  pending: boolean
}) {
  const [value, setValue] = React.useState('')

  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const text = value.trim()
        if (text) onSubmit(text)
      }}
    >
      <input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel()
        }}
        placeholder="Extra shoulder conditioning"
        aria-label="Item description"
        className="min-w-0 flex-1 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
      />
      <button
        type="submit"
        disabled={pending || value.trim().length === 0}
        aria-label="Add item"
        className="tap flex items-center justify-center rounded-xl bg-[var(--accent)] px-3 text-[var(--accent-text)] disabled:opacity-50"
      >
        <Check className="size-4" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel"
        className="tap flex items-center justify-center rounded-xl border border-[var(--border-strong)] px-3"
      >
        <X className="size-4" />
      </button>
    </form>
  )
}

function LessonDetailsForm({
  classId,
  kind,
  lesson,
}: {
  classId: string
  kind: LessonKind
  lesson: LessonBundle
}) {
  const { notify } = useToast()
  const [state, action, pending] = React.useActionState(
    saveLessonDetails.bind(null, classId, kind),
    { status: 'idle' as const },
  )

  React.useEffect(() => {
    const toast = toToast(state)
    if (toast) notify(toast.message, toast.tone)
  }, [state, notify])

  return (
    <form
      action={action}
      className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]"
    >
      <Field label="Lesson objective" htmlFor={`${kind}-objective`}>
        <Textarea
          id={`${kind}-objective`}
          name="objective"
          rows={2}
          defaultValue={lesson.objective ?? ''}
          placeholder="Clean shoulder mount entry"
        />
      </Field>
      <Field label="Combinations / choreography" htmlFor={`${kind}-combinations`}>
        <Textarea
          id={`${kind}-combinations`}
          name="combinations"
          rows={2}
          defaultValue={lesson.combinations ?? ''}
        />
      </Field>
      <Field label="Homework" htmlFor={`${kind}-homework`}>
        <Textarea
          id={`${kind}-homework`}
          name="homework"
          rows={2}
          defaultValue={lesson.homework ?? ''}
          placeholder="Scapular pulls, hollow body holds"
        />
      </Field>
      <Field label="Instructor notes" htmlFor={`${kind}-notes`}>
        <Textarea
          id={`${kind}-notes`}
          name="instructor_notes"
          rows={2}
          defaultValue={lesson.instructor_notes ?? ''}
        />
      </Field>
      <Button type="submit" variant="secondary" size="sm" loading={pending}>
        {pending ? 'Saving…' : 'Save lesson details'}
      </Button>
    </form>
  )
}
