'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveExercise } from '@/actions/library'
import { idle } from '@/actions/types'
import { Button } from '@/components/ui/button'
import { CheckboxRow, Field, Input, Select, Textarea } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { useToast } from '@/components/ui/toast'
import type { Exercise } from '@/types/database'

export function ExerciseForm({
  exercise,
  levels,
  categories,
  selectedCategoryIds = [],
  onDone,
}: {
  exercise?: Exercise | null
  levels: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  selectedCategoryIds?: string[]
  onDone?: (id?: string) => void
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [state, action, pending] = useActionState(
    saveExercise.bind(null, exercise?.id ?? null),
    idle,
  )
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
      <Field label="Name" htmlFor="ex-name" error={errors?.name} required>
        <Input
          id="ex-name"
          name="name"
          defaultValue={exercise?.name ?? ''}
          placeholder="Scapular Pull"
          autoFocus={!exercise}
          required
          aria-invalid={Boolean(errors?.name)}
        />
      </Field>

      <Field label="Description" htmlFor="ex-description" error={errors?.description}>
        <Textarea id="ex-description" name="description" defaultValue={exercise?.description ?? ''} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Level" htmlFor="ex-level" error={errors?.level_id}>
          <Select id="ex-level" name="level_id" defaultValue={exercise?.level_id ?? ''}>
            <option value="">Not set</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Difficulty (1–5)" htmlFor="ex-difficulty" error={errors?.difficulty}>
          <Select id="ex-difficulty" name="difficulty" defaultValue={exercise?.difficulty ?? ''}>
            <option value="">Not set</option>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
      </div>

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
        <Field label="Target area" htmlFor="ex-target" error={errors?.target_area}>
          <Input
            id="ex-target"
            name="target_area"
            defaultValue={exercise?.target_area ?? ''}
            placeholder="Shoulder"
          />
        </Field>
        <Field label="Equipment" htmlFor="ex-equipment" error={errors?.equipment}>
          <Input
            id="ex-equipment"
            name="equipment"
            defaultValue={exercise?.equipment ?? ''}
            placeholder="Pole, resistance band"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Sets" htmlFor="ex-sets" error={errors?.sets}>
          <Input
            id="ex-sets"
            name="sets"
            type="number"
            min={1}
            max={50}
            inputMode="numeric"
            defaultValue={exercise?.sets ?? ''}
          />
        </Field>
        <Field label="Reps" htmlFor="ex-reps" error={errors?.reps}>
          <Input id="ex-reps" name="reps" defaultValue={exercise?.reps ?? ''} placeholder="8–10" />
        </Field>
        <Field label="Hold (seconds)" htmlFor="ex-duration" error={errors?.duration_seconds}>
          <Input
            id="ex-duration"
            name="duration_seconds"
            type="number"
            min={1}
            max={7200}
            inputMode="numeric"
            defaultValue={exercise?.duration_seconds ?? ''}
          />
        </Field>
      </div>

      <Field label="Tempo" htmlFor="ex-tempo" error={errors?.tempo}>
        <Input id="ex-tempo" name="tempo" defaultValue={exercise?.tempo ?? ''} placeholder="3-1-3" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Progression" htmlFor="ex-progression" error={errors?.progression}>
          <Input id="ex-progression" name="progression" defaultValue={exercise?.progression ?? ''} />
        </Field>
        <Field label="Regression" htmlFor="ex-regression" error={errors?.regression}>
          <Input id="ex-regression" name="regression" defaultValue={exercise?.regression ?? ''} />
        </Field>
      </div>

      <Field label="Instructor notes" htmlFor="ex-notes" error={errors?.instructor_notes}>
        <Textarea
          id="ex-notes"
          name="instructor_notes"
          defaultValue={exercise?.instructor_notes ?? ''}
        />
      </Field>

      {exercise ? <input type="hidden" name="active" value={String(exercise.active)} /> : null}
      {state.status === 'error' && !errors ? <FormError>{state.message}</FormError> : null}

      <Button type="submit" loading={pending}>
        {pending ? 'Saving…' : exercise ? 'Save exercise' : 'Add exercise'}
      </Button>
    </form>
  )
}
