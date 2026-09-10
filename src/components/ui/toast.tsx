'use client'

import * as React from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'success' | 'error' | 'info'
interface Toast {
  id: number
  tone: Tone
  message: string
}

const ToastContext = React.createContext<{
  notify: (message: string, tone?: Tone) => void
} | null>(null)

/** Feedback for every save, so nothing ever fails silently (§51). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const nextId = React.useRef(0)

  const notify = React.useCallback((message: string, tone: Tone = 'success') => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, tone, message }])
    // Errors stay longer — they usually need reading.
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, tone === 'error' ? 7000 : 3500)
  }, [])

  const value = React.useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        // Polite so it does not interrupt, but still announced.
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        {toasts.map((toast) => (
          <ToastRow
            key={toast.id}
            toast={toast}
            onDismiss={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? AlertCircle : Info
  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-[var(--shadow-raised)]',
        toast.tone === 'success' && 'border-transparent bg-[var(--positive-soft)] text-[var(--positive)]',
        toast.tone === 'error' && 'border-transparent bg-[var(--negative-soft)] text-[var(--negative)]',
        toast.tone === 'info' && 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)]',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100">
        <X className="size-4" />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
