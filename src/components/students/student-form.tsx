'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createStudent, updateStudent } from '@/actions/students'
import { idle } from '@/actions/types'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { useToast } from '@/components/ui/toast'
import type { Level, Student } from '@/types/database'

/**
 * One form for both create and edit. Only the first name is required, so the
 * instructor can add a student mid-conversation and fill in the rest later (§7).
 */
export function StudentForm({
  student,
  levels,
  onDone,
}: {
  student?: Student | null
  levels: Pick<Level, 'id' | 'name'>[]
  onDone?: (id?: string) => void
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [state, action, pending] = useActionState(
    student ? updateStudent.bind(null, student.id) : createStudent,
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="first_name" error={errors?.first_name} required>
          <Input
            id="first_name"
            name="first_name"
            defaultValue={student?.first_name ?? ''}
            autoComplete="given-name"
            autoFocus={!student}
            required
            aria-invalid={Boolean(errors?.first_name)}
          />
        </Field>
        <Field label="Last name" htmlFor="last_name" error={errors?.last_name}>
          <Input
            id="last_name"
            name="last_name"
            defaultValue={student?.last_name ?? ''}
            autoComplete="family-name"
          />
        </Field>
      </div>

      <Field
        label="Preferred name"
        htmlFor="preferred_name"
        hint="What you actually call them in class."
        error={errors?.preferred_name}
      >
        <Input
          id="preferred_name"
          name="preferred_name"
          defaultValue={student?.preferred_name ?? ''}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="email" error={errors?.email}>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            defaultValue={student?.email ?? ''}
            aria-invalid={Boolean(errors?.email)}
          />
        </Field>
        <Field label="Phone" htmlFor="phone" error={errors?.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={student?.phone ?? ''}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Level" htmlFor="current_level_id" error={errors?.current_level_id}>
          <Select
            id="current_level_id"
            name="current_level_id"
            defaultValue={student?.current_level_id ?? ''}
          >
            <option value="">Not set</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Joined" htmlFor="date_joined" error={errors?.date_joined}>
          <Input
            id="date_joined"
            name="date_joined"
            type="date"
            defaultValue={student?.date_joined ?? new Date().toISOString().slice(0, 10)}
          />
        </Field>
      </div>

      <Field label="Goals" htmlFor="goals" hint="What they want to work towards." error={errors?.goals}>
        <Textarea id="goals" name="goals" defaultValue={student?.goals ?? ''} />
      </Field>

      <Field label="Notes" htmlFor="general_notes" error={errors?.general_notes}>
        <Textarea
          id="general_notes"
          name="general_notes"
          defaultValue={student?.general_notes ?? ''}
          placeholder="Injuries, preferences, anything to remember."
        />
      </Field>

      {student ? <input type="hidden" name="active" value={String(student.active)} /> : null}

      {state.status === 'error' && !errors ? <FormError>{state.message}</FormError> : null}

      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={pending} className="flex-1 justify-center sm:flex-none">
          {pending ? 'Saving…' : student ? 'Save changes' : 'Add student'}
        </Button>
      </div>
    </form>
  )
}
