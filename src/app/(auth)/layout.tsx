import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-xl bg-[var(--accent)] text-base font-bold text-[var(--accent-text)]"
          >
            P
          </span>
          <span className="text-lg font-semibold tracking-tight">Pole Studio</span>
        </Link>
        {children}
      </div>
    </main>
  )
}
