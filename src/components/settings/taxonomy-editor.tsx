'use client'

import * as React from 'react'
import { Archive, Plus } from 'lucide-react'
import { archiveTaxonomy, saveCategory, saveLevel } from '@/actions/library'
import { idle, type ActionState } from '@/actions/types'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'

interface Item {
  id: string
  name: string
  sort_order: number
}

/** Editable levels and categories (§19, §20, §23, §45). */
export function TaxonomyEditor({
  title,
  description,
  items,
  table,
  kind,
}: {
  title: string
  description: string
  items: Item[]
  table: 'levels' | 'categories'
  kind?: 'trick' | 'exercise'
}) {
  const { notify } = useToast()
  const [addOpen, setAddOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  // Driving the form with a transition rather than useActionState + an effect
  // means the toast and the sheet close in the same update as the result,
  // instead of cascading a second render.
  const [state, setState] = React.useState<ActionState>(idle)
  const [saving, startSaving] = React.useTransition()
  const errors = state.status === 'error' ? state.errors : undefined

  function action(formData: FormData) {
    startSaving(async () => {
      const save = table === 'levels' ? saveLevel : saveCategory
      const result = await save(null, idle, formData)
      setState(result)
      const toast = toToast(result)
      if (toast) notify(toast.message, toast.tone)
      if (result.status === 'success') setAddOpen(false)
    })
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted">{description}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-subtle">Nothing here yet.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] py-1 pl-3 pr-1.5 text-sm"
            >
              {item.name}
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await archiveTaxonomy(table, item.id)
                    const toast = toToast(result)
                    if (toast) notify(toast.message, toast.tone)
                  })
                }
                aria-label={`Archive ${item.name}`}
                className="flex size-6 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--border)] disabled:opacity-50"
              >
                <Archive className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={addOpen} onOpenChange={setAddOpen} title={`Add to ${title.toLowerCase()}`}>
        <form action={action} className="space-y-4" noValidate>
          {kind ? <input type="hidden" name="kind" value={kind} /> : null}
          <Field label="Name" htmlFor={`${table}-${kind ?? 'level'}-name`} error={errors?.name} required>
            <Input
              id={`${table}-${kind ?? 'level'}-name`}
              name="name"
              autoFocus
              required
              aria-invalid={Boolean(errors?.name)}
            />
          </Field>
          <Field
            label="Sort order"
            htmlFor={`${table}-${kind ?? 'level'}-sort`}
            hint="Lower numbers appear first."
          >
            <Input
              id={`${table}-${kind ?? 'level'}-sort`}
              name="sort_order"
              type="number"
              min={0}
              max={999}
              defaultValue={items.length}
            />
          </Field>
          <Button type="submit" loading={saving}>
            Add
          </Button>
        </form>
      </Sheet>
    </section>
  )
}
