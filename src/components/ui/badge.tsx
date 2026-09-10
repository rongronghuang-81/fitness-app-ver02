import * as React from 'react'
import { cn } from '@/lib/utils'

export type BadgeTone =
  | 'neutral'
  | 'positive'
  | 'warning'
  | 'negative'
  | 'info'
  | 'accent'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]',
  positive: 'bg-[var(--positive-soft)] text-[var(--positive)] border-transparent',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning)] border-transparent',
  negative: 'bg-[var(--negative-soft)] text-[var(--negative)] border-transparent',
  info: 'bg-[var(--info-soft)] text-[var(--info)] border-transparent',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)] border-transparent',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}
