'use client'

import * as React from 'react'
import { updateProfile } from '@/actions/settings'
import { idle } from '@/actions/types'
import { Button } from '@/components/ui/button'
import { CheckboxRow, Field, Input, Select } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { useToast } from '@/components/ui/toast'
import type { Profile } from '@/types/database'

export function ProfileForm({ profile }: { profile: Profile }) {
  const { notify } = useToast()
  const [state, action, pending] = React.useActionState(updateProfile, idle)
  const errors = state.status === 'error' ? state.errors : undefined

  React.useEffect(() => {
    if (state.status === 'success' && state.message) notify(state.message)
  }, [state, notify])

  return (
    <form
      action={action}
      className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]"
      noValidate
    >
      <div>
        <h2 className="text-sm font-semibold">Instructor profile and defaults</h2>
        <p className="text-xs text-muted">
          Defaults are pre-filled when you create a term, so most terms need no schedule typing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="full_name" error={errors?.full_name}>
          <Input id="full_name" name="full_name" defaultValue={profile.full_name ?? ''} />
        </Field>
        <Field label="Email" htmlFor="profile-email" hint="Change this from your login provider.">
          <Input id="profile-email" value={profile.email} disabled readOnly />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Time zone" htmlFor="timezone" error={errors?.timezone}>
          <Input id="timezone" name="timezone" defaultValue={profile.timezone} />
        </Field>
        <Field label="Theme" htmlFor="theme" error={errors?.theme}>
          <Select id="theme" name="theme" defaultValue={profile.theme}>
            <option value="system">Match my device</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Default class length"
          htmlFor="default_class_duration_minutes"
          error={errors?.default_class_duration_minutes}
        >
          <Input
            id="default_class_duration_minutes"
            name="default_class_duration_minutes"
            type="number"
            min={15}
            max={480}
            step={5}
            inputMode="numeric"
            defaultValue={profile.default_class_duration_minutes}
          />
        </Field>
        <Field
          label="Default term length"
          htmlFor="default_term_weeks"
          error={errors?.default_term_weeks}
        >
          <Input
            id="default_term_weeks"
            name="default_term_weeks"
            type="number"
            min={1}
            max={52}
            inputMode="numeric"
            defaultValue={profile.default_term_weeks}
          />
        </Field>
        <Field
          label="Default start time"
          htmlFor="default_start_time"
          error={errors?.default_start_time}
        >
          <Input
            id="default_start_time"
            name="default_start_time"
            type="time"
            defaultValue={profile.default_start_time.slice(0, 5)}
          />
        </Field>
      </div>

      <CheckboxRow
        id="default_attendance_present"
        name="default_attendance_present"
        label="Start everyone as Present"
        description="Off by default: attendance is only recorded when you actually mark it."
        defaultChecked={profile.default_attendance_present}
      />

      {state.status === 'error' && !errors ? <FormError>{state.message}</FormError> : null}

      <Button type="submit" loading={pending}>
        {pending ? 'Saving…' : 'Save settings'}
      </Button>
    </form>
  )
}
