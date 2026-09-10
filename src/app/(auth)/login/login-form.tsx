'use client'

import { useActionState } from 'react'
import { signIn } from '@/actions/auth'
import { idle } from '@/actions/types'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'

export function LoginForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState(signIn, idle)
  const errors = state.status === 'error' ? state.errors : undefined

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

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
          aria-describedby={errors?.email ? 'email-error' : undefined}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={errors?.password} required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(errors?.password)}
          aria-describedby={errors?.password ? 'password-error' : undefined}
        />
      </Field>

      {state.status === 'error' && !errors ? <FormError>{state.message}</FormError> : null}

      <Button type="submit" size="lg" loading={pending} className="w-full justify-center">
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
