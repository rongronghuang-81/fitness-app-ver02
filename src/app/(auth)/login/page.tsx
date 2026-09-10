import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <h1 className="text-lg font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Your teaching notebook, classes and student records.</p>

      <LoginForm next={next ?? null} />

      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/forgot-password" className="font-medium text-[var(--accent)] hover:underline">
          Forgot your password?
        </Link>
      </p>
    </div>
  )
}
