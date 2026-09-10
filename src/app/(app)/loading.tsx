import { Spinner } from '@/components/ui/button'

export default function Loading() {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
      <Spinner className="size-5 text-[var(--accent)]" />
      <span className="sr-only">Loading</span>
    </div>
  )
}
