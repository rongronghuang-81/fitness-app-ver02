'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const inputBase =
  'w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2.5 ' +
  'text-[var(--text)] placeholder:text-[var(--text-subtle)] transition-shadow ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent ' +
  'disabled:opacity-60 aria-[invalid=true]:border-[var(--negative)]'

/**
 * A labelled form control. The label is always a real <label> bound by id, and
 * the error is wired up with aria-describedby / aria-invalid so screen readers
 * announce it (§50).
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string
  htmlFor: string
  error?: string | undefined
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {required ? (
          <span className="ml-0.5 text-[var(--negative)]" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-[var(--negative)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputBase, className)} {...props} />
  },
)

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(inputBase, 'resize-y', className)} {...props} />
})

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(inputBase, 'appearance-none bg-no-repeat pr-9', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: 'right 0.75rem center',
      }}
      {...props}
    />
  )
})

/** Large, thumb-friendly checkbox row for mobile lists. */
export function CheckboxRow({
  label,
  description,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  const id = React.useId()
  return (
    <label
      htmlFor={props.id ?? id}
      className="tap flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--surface-muted)]"
    >
      <input
        id={props.id ?? id}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 rounded accent-[var(--accent)]"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="block text-xs text-muted">{description}</span> : null}
      </span>
    </label>
  )
}
