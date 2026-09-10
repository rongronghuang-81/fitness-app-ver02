'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveTrick } from '@/actions/library'
import { idle } from '@/actions/types'
import { Button } from '@/components/ui/button'
import { CheckboxRow, Field, Input, Select, Textarea } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { useToast } from '@/components/ui/toast'
import type { Trick } from '@/types/database'

export function TrickForm({
  trick,
  levels,
  categories,
  selectedLevelIds = [],
  selectedCategoryIds = [],
  onDone,
}: {
  trick?: Trick | null
  levels: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  selectedLevelIds?: string[]
  selectedCategoryIds?: string[]
  onDone?: (id?: string) => void
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [state, action, pending] = useActionState(saveTrick.bind(null, trick?.id ?? null), idle)
  const errors = state.status === 'error' ? state.errors : undefined

  useEffect(() => {
    if (state.status === 'success') {
      if (state.message) notify(state.message)
      onDone?.(state.id)
      router.refresh()
    }
  }, [state, notify, onDone, router])

  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Name" htmlFor="trick-name" error={errors?.name} required>
        <Input
          id="trick-name"
          name="name"
          defaultValue={trick?.name ?? ''}
          placeholder="Shoulder Mount"
          autoFocus={!trick}
          required
          aria-invalid={Boolean(errors?.name)}
        />
      </Field>

      <Field label="Description" htmlFor="trick-description" error={errors?.description}>
        <Textarea id="trick-description" name="description" defaultValue={trick?.description ?? ''} />
      </Field>

      {/* A trick can sit at more than one level (§19). */}
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Levels</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {levels.map((level) => (
            <CheckboxRow
              key={level.id}
              name="level_ids[]"
              value={level.id}
              label={level.name}
              defaultChecked={selectedLevelIds.includes(level.id)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Categories</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {categories.map((category) => (
            <CheckboxRow
              key={category.id}
              name="category_ids[]"
              value={category.id}
              label={category.name}
              defaultChecked={selectedCategoryIds.includes(category.id)}
            />
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Difficulty (1–5)" htmlFor="trick-difficulty" error={errors?.difficulty}>
          <Select id="trick-difficulty" name="difficulty" defaultValue={trick?.difficulty ?? ''}>
            <option value="">Not set</option>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Grip" htmlFor="trick-grip" error={errors?.grip}>
          <Input id="trick-grip" name="grip" defaultValue={trick?.grip ?? ''} placeholder="Split grip" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Entry" htmlFor="trick-entry" error={errors?.entry}>
          <Input id="trick-entry" name="entry" defaultValue={trick?.entry ?? ''} />
        </Field>
        <Field label="Exit" htmlFor="trick-exit" error={errors?.exit}>
          <Input id="trick-exit" name="exit" defaultValue={trick?.exit ?? ''} />
        </Field>
      </div>

      <Field label="Key cues" htmlFor="trick-cues" error={errors?.key_cues}>
        <Textarea
          id="trick-cues"
          name="key_cues"
          defaultValue={trick?.key_cues ?? ''}
          placeholder="Shoulders down, ribs in, drive through the elbow."
        />
      </Field>

      <Field label="Common errors" htmlFor="trick-errors" error={errors?.common_errors}>
        <Textarea id="trick-errors" name="common_errors" defaultValue={trick?.common_errors ?? ''} />
      </Field>

      <Field label="Safety notes" htmlFor="trick-safety" error={errors?.safety_notes}>
        <Textarea id="trick-safety" name="safety_notes" defaultValue={trick?.safety_notes ?? ''} />
      </Field>

      <Field label="Instructor notes" htmlFor="trick-notes" error={errors?.instructor_notes}>
        <Textarea
          id="trick-notes"
          name="instructor_notes"
          defaultValue={trick?.instructor_notes ?? ''}
        />
      </Field>

      {trick ? <input type="hidden" name="active" value={String(trick.active)} /> : null}
      {state.status === 'error' && !errors ? <FormError>{state.message}</FormError> : null}

      <Button type="submit" loading={pending}>
        {pending ? 'Saving…' : trick ? 'Save trick' : 'Add trick'}
      </Button>
    </form>
  )
}
