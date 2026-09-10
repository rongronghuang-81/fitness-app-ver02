import { AlertCircle } from 'lucide-react'

/** Form-level error banner. Announced immediately — the submit just failed. */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-[var(--negative-soft)] px-3 py-2.5 text-sm text-[var(--negative)]"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

export function FormSuccess({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-xl bg-[var(--positive-soft)] px-3 py-2.5 text-sm text-[var(--positive)]"
    >
      {children}
    </div>
  )
}
