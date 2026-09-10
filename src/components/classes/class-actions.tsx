'use client'

import * as React from 'react'
import { Ban, Check, Copy, LayoutTemplate, RotateCcw } from 'lucide-react'
import { applyTemplate, copyLesson } from '@/actions/classes'
import { setClassStatus } from '@/actions/terms'
import { createTemplateFromLesson } from '@/actions/library'
import { CompleteClassFlow } from './complete-class-flow'
import { Sheet, ConfirmDialog } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { CheckboxRow, Field, Input } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'
import { LESSON_SECTIONS } from '@/lib/domain/lesson'
import type { ClassRoster } from '@/lib/queries/classes'
import type { LessonItem, LessonSection } from '@/types/database'

/** The class-level action bar: complete, copy, template, cancel (§15, §18, §53). */
export function ClassActions({
  classId,
  status,
  roster,
  plannedItems,
  actualItems,
  plannedLessonId,
  tricks,
  templates,
  previous,
  generalNotes,
}: {
  classId: string
  status: string
  roster: ClassRoster[]
  plannedItems: LessonItem[]
  actualItems: LessonItem[]
  plannedLessonId: string | null
  tricks: { id: string; name: string }[]
  templates: { id: string; name: string; is_favorite: boolean }[]
  previous: { classId: string; weekNumber: number; lessonId: string } | null
  generalNotes: string | null
}) {
  const { notify } = useToast()
  const [completeOpen, setCompleteOpen] = React.useState(false)
  const [copyOpen, setCopyOpen] = React.useState(false)
  const [templateOpen, setTemplateOpen] = React.useState(false)
  const [saveTemplateOpen, setSaveTemplateOpen] = React.useState(false)
  const [cancelOpen, setCancelOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  const [sections, setSections] = React.useState<LessonSection[]>(
    LESSON_SECTIONS.map((s) => s.id),
  )
  const [replace, setReplace] = React.useState(false)
  const [templateName, setTemplateName] = React.useState('')

  function run(fn: () => Promise<Awaited<ReturnType<typeof copyLesson>>>, close: () => void) {
    startTransition(async () => {
      const result = await fn()
      const toast = toToast(result)
      if (toast) notify(toast.message, toast.tone)
      if (result.status === 'success') close()
    })
  }

  function toggleSection(id: LessonSection, checked: boolean) {
    setSections((prev) => (checked ? [...prev, id] : prev.filter((s) => s !== id)))
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status !== 'completed' && status !== 'cancelled' ? (
          <Button onClick={() => setCompleteOpen(true)}>
            <Check className="size-4" />
            Complete class
          </Button>
        ) : null}

        {previous ? (
          <Button variant="secondary" onClick={() => setCopyOpen(true)}>
            <Copy className="size-4" />
            <span className="hidden sm:inline">Copy week {previous.weekNumber}</span>
            <span className="sm:hidden">Copy previous</span>
          </Button>
        ) : null}

        {templates.length > 0 ? (
          <Button variant="secondary" onClick={() => setTemplateOpen(true)}>
            <LayoutTemplate className="size-4" />
            <span className="hidden sm:inline">Apply template</span>
            <span className="sm:hidden">Template</span>
          </Button>
        ) : null}

        {plannedLessonId ? (
          <Button variant="ghost" onClick={() => setSaveTemplateOpen(true)}>
            Save as template
          </Button>
        ) : null}

        {status === 'cancelled' ? (
          <Button
            variant="ghost"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setClassStatus(classId, 'planned')
                const toast = toToast(result)
                if (toast) notify(toast.message, toast.tone)
              })
            }
          >
            <RotateCcw className="size-4" />
            Restore
          </Button>
        ) : status !== 'completed' ? (
          <Button variant="ghost" onClick={() => setCancelOpen(true)}>
            <Ban className="size-4" />
            Cancel
          </Button>
        ) : null}
      </div>

      <CompleteClassFlow
        classId={classId}
        roster={roster}
        plannedItems={plannedItems}
        actualItems={actualItems}
        tricks={tricks}
        generalNotes={generalNotes}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
      />

      {/* Copy previous lesson, section by section (§15). */}
      <Sheet
        open={copyOpen}
        onOpenChange={setCopyOpen}
        title={`Copy week ${previous?.weekNumber ?? ''}`}
        description="Choose which parts to bring across. You can edit everything afterwards."
        footer={
          <Button
            className="w-full justify-center"
            loading={pending}
            disabled={sections.length === 0}
            onClick={() =>
              previous &&
              run(
                () =>
                  copyLesson({
                    sourceLessonId: previous.lessonId,
                    targetClassId: classId,
                    sections,
                    replace,
                  }),
                () => setCopyOpen(false),
              )
            }
          >
            Copy into this lesson
          </Button>
        }
      >
        <SectionChooser sections={sections} onToggle={toggleSection} />
        <div className="mt-3">
          <CheckboxRow
            label="Replace what's already here"
            description="Otherwise the copied items are added to the existing plan."
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
          />
        </div>
      </Sheet>

      {/* Apply a saved template (§33). */}
      <Sheet
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        title="Apply a template"
        description="Templates fill in a starting plan you can then edit."
      >
        <SectionChooser sections={sections} onToggle={toggleSection} />
        <ul className="mt-4 space-y-1">
          {templates.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                disabled={pending || sections.length === 0}
                onClick={() =>
                  run(
                    () =>
                      applyTemplate({
                        templateId: template.id,
                        targetClassId: classId,
                        sections,
                        replace,
                      }),
                    () => setTemplateOpen(false),
                  )
                }
                className="tap flex w-full items-center rounded-xl px-3 text-left text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
              >
                {template.name}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      {/* Save this lesson as a reusable template. */}
      <Sheet
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
        title="Save as template"
        description="Reuse this plan for future classes."
        footer={
          <Button
            className="w-full justify-center"
            loading={pending}
            disabled={!templateName.trim()}
            onClick={() =>
              plannedLessonId &&
              run(
                () => createTemplateFromLesson(plannedLessonId, templateName),
                () => {
                  setSaveTemplateOpen(false)
                  setTemplateName('')
                },
              )
            }
          >
            Save template
          </Button>
        }
      >
        <Field label="Template name" htmlFor="template-name" required>
          <Input
            id="template-name"
            autoFocus
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Beginner Spin Basics"
          />
        </Field>
      </Sheet>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this class?"
        description="It stays in the term and keeps its lesson plan and notes. You can restore it at any time."
        confirmLabel="Cancel class"
        pending={pending}
        onConfirm={() =>
          startTransition(async () => {
            const result = await setClassStatus(classId, 'cancelled')
            const toast = toToast(result)
            if (toast) notify(toast.message, toast.tone)
            setCancelOpen(false)
          })
        }
      />
    </>
  )
}

function SectionChooser({
  sections,
  onToggle,
}: {
  sections: LessonSection[]
  onToggle: (id: LessonSection, checked: boolean) => void
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 text-sm font-medium">Sections</legend>
      {LESSON_SECTIONS.map((section) => (
        <CheckboxRow
          key={section.id}
          label={section.label}
          checked={sections.includes(section.id)}
          onChange={(e) => onToggle(section.id, e.target.checked)}
        />
      ))}
    </fieldset>
  )
}
