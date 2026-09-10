import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted">
        That page does not exist, or the record has been removed.
      </p>
      <Link
        href="/dashboard"
        className="tap mt-4 inline-flex items-center rounded-xl bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-text)]"
      >
        Back to dashboard
      </Link>
    </main>
  )
}
