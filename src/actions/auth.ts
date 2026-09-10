'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { publicEnv } from '@/lib/env'
import { loginSchema, newPasswordSchema, resetRequestSchema } from '@/lib/validation/schemas'
import { safeRelativePath } from '@/lib/redirect'
import type { ActionState } from '@/actions/types'
import { fieldErrors, failure } from '@/actions/types'

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    // Deliberately vague: do not reveal whether the address has an account.
    return failure('That email and password combination did not work.')
  }

  revalidatePath('/', 'layout')
  redirect(safeRelativePath(formData.get('next')))
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/update-password`,
  })

  // Always report success — otherwise this endpoint enumerates accounts.
  return {
    status: 'success',
    message: 'If that address has an account, a reset link is on its way.',
  }
}

export async function updatePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) return fieldErrors(parsed.error)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return failure('This reset link has expired. Request a new one.')

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return failure(error.message)

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
