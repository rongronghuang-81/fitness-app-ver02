import type { Metadata } from 'next'
import { UpdatePasswordForm } from './update-password-form'

export const metadata: Metadata = { title: 'Choose a new password' }

export default function UpdatePasswordPage() {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <h1 className="text-lg font-semibold">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted">At least 8 characters.</p>
      <UpdatePasswordForm />
    </div>
  )
}
