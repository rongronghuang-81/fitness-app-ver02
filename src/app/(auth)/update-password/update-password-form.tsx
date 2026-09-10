'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/actions/auth'
import { idle } from '@/actions/types'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, idle)
  const errors = state.status === 'error' ? state.errors : undefined

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <Field label="New password" htmlFor="password" error={errors?.password} required>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={errors?.confirm} required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>

      {state.status === 'error' && !errors ? <FormError>{state.message}</FormError> : null}

      <Button type="submit" size="lg" loading={pending} className="w-full justify-center">
        {pending ? 'Saving…' : 'Save password'}
      </Button>
    </form>
  )
}
