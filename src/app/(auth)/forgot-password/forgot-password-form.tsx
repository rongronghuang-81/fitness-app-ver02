'use client'

import { useActionState } from 'react'
import { requestPasswordReset } from '@/actions/auth'
import { idle } from '@/actions/types'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { FormError, FormSuccess } from '@/components/ui/form-error'

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, idle)
  const errors = state.status === 'error' ? state.errors : undefined

  if (state.status === 'success') {
    return (
      <div className="mt-6">
        <FormSuccess>{state.message}</FormSuccess>
      </div>
    )
  }

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <Field label="Email" htmlFor="email" error={errors?.email} required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          required
          aria-invalid={Boolean(errors?.email)}
        />
      </Field>

      {state.status === 'error' && !errors ? <FormError>{state.message}</FormError> : null}

      <Button type="submit" size="lg" loading={pending} className="w-full justify-center">
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  )
}
