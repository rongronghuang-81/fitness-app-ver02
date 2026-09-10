'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surfacing the digest makes a production report traceable to a server log.
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        aria-hidden="true"
        className="mb-3 flex size-11 items-center justify-center rounded-full bg-[var(--negative-soft)]"
      >
        <AlertCircle className="size-5 text-[var(--negative)]" />
      </div>
      <h1 className="text-base font-semibold">Something went wrong</h1>
      <p className="mt-1 max-w-sm text-sm text-muted">
        That page could not be loaded. Nothing you saved has been lost.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-subtle">Reference: {error.digest}</p>
      ) : null}
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
