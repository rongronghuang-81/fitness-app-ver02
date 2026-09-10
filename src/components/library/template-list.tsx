'use client'

import * as React from 'react'
import { BookOpen, Star, Trash2 } from 'lucide-react'
import { deleteTemplate, saveTemplate, toggleFavorite } from '@/actions/library'
import { idle, type ActionState } from '@/actions/types'
import { Sheet, ConfirmDialog } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'
import { SECTION_LABELS } from '@/lib/domain/lesson'
import type { LessonSection } from '@/types/database'
import { cn } from '@/lib/utils'

export interface TemplateRow {
  id: string
  name: string
  description: string | null
  is_favorite: boolean
  levels: { name: string } | null
  itemCounts: Partial<Record<LessonSection, number>>
}

export function TemplateList({
  templates,
  levels,
}: {
  templates: TemplateRow[]
  levels: { id: string; name: string }[]
}) {
  const { notify } = useToast()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState<TemplateRow | null>(null)
  const [pending, startTransition] = React.useTransition()

  // As in the taxonomy editor: a transition keeps the result, the toast and
  // closing the sheet in one update rather than a setState inside an effect.
  const [state, setState] = React.useState<ActionState>(idle)
  const [saving, startSaving] = React.useTransition()
  const errors = state.status === 'error' ? state.errors : undefined

  function action(formData: FormData) {
    startSaving(async () => {
      const result = await saveTemplate(null, idle, formData)
      setState(result)
      const toast = toToast(result, 'Template created.')
      if (toast) notify(toast.message, toast.tone)
      if (result.status === 'success') setCreateOpen(false)
    })
  }

  const sorted = React.useMemo(
    () =>
      [...templates].sort(
        (a, b) => Number(b.is_favorite) - Number(a.is_favorite) || a.name.localeCompare(b.name),
      ),
    [templates],
  )

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>New template</Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No lesson templates yet"
          description="Save a lesson you liked as a template, or build one from scratch, then apply it to any class."
          action={<Button onClick={() => setCreateOpen(true)}>Create a template</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map((template) => {
            const counts = Object.entries(template.itemCounts).filter(([, n]) => n > 0)
            return (
              <li
                key={template.id}
                className="flex items-start gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]"
              >
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await toggleFavorite('lesson_templates', template.id, !template.is_favorite)
                    })
                  }
                  aria-pressed={template.is_favorite}
                  aria-label={
                    template.is_favorite
                      ? `Unfavourite ${template.name}`
                      : `Favourite ${template.name}`
                  }
                  className="tap flex shrink-0 items-center justify-center rounded-lg disabled:opacity-50"
                >
                  <Star
                    className={cn(
                      'size-4',
                      template.is_favorite
                        ? 'fill-[var(--warning)] text-[var(--warning)]'
                        : 'text-[var(--text-subtle)]',
                    )}
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{template.name}</p>
                  {template.description ? (
                    <p className="text-xs text-muted">{template.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-subtle">
                    {counts.length === 0
                      ? 'No items yet'
                      : counts
                          .map(([section, n]) => `${SECTION_LABELS[section as LessonSection]} ${n}`)
                          .join(' · ')}
                    {template.levels ? ` · ${template.levels.name}` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmDelete(template)}
                  aria-label={`Delete ${template.name}`}
                  className="tap flex shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--negative)] disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Sheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New lesson template"
        description="Create the shell now; add items by saving a class lesson into it later."
      >
        <form action={action} className="space-y-4" noValidate>
          <Field label="Name" htmlFor="tpl-name" error={errors?.name} required>
            <Input
              id="tpl-name"
              name="name"
              autoFocus
              placeholder="Beginner Spin Basics"
              required
            />
          </Field>
          <Field label="Level" htmlFor="tpl-level">
            <Select id="tpl-level" name="level_id" defaultValue="">
              <option value="">Not set</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description" htmlFor="tpl-description">
            <Textarea id="tpl-description" name="description" rows={2} />
          </Field>
          <Field label="Objective" htmlFor="tpl-objective">
            <Textarea id="tpl-objective" name="objective" rows={2} />
          </Field>
          <Field label="Homework" htmlFor="tpl-homework">
            <Textarea id="tpl-homework" name="homework" rows={2} />
          </Field>
          <Button type="submit" loading={saving}>
            Create template
          </Button>
        </form>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.name}?`}
        description="Lessons already created from this template are not affected."
        confirmLabel="Delete"
        pending={pending}
        onConfirm={() =>
          startTransition(async () => {
            if (!confirmDelete) return
            const result = await deleteTemplate(confirmDelete.id)
            const toast = toToast(result)
            if (toast) notify(toast.message, toast.tone)
            setConfirmDelete(null)
          })
        }
      />
    </>
  )
}
