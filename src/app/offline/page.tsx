import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'

export const metadata: Metadata = { title: 'Offline' }

/**
 * Shown by the service worker when a navigation fails with no connection.
 * Deliberately static and data-free so it can be cached safely.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div
        aria-hidden="true"
        className="mb-4 flex size-14 items-center justify-center rounded-full bg-[var(--surface-muted)]"
      >
        <WifiOff className="size-6 text-[var(--text-subtle)]" />
      </div>
      <h1 className="text-lg font-semibold">You&apos;re offline</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted">
        Pole Studio needs a connection to load your classes and student records. It will pick up
        where you left off as soon as you&apos;re back on wifi or data.
      </p>
      <p className="mt-4 text-xs text-subtle">
        Anything you already submitted has been saved.
      </p>
    </main>
  )
}
