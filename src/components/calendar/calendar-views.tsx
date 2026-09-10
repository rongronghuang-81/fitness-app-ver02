'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { ClassCard, CLASS_STATUS_TONE, type ClassCardData } from '@/components/classes/class-card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { formatDate, formatMonth } from '@/lib/domain/format'
import { addDays, formatTime, parseISODate, toISODate } from '@/lib/domain/schedule'
import { cn } from '@/lib/utils'

type View = 'agenda' | 'week' | 'month'

/**
 * Calendar with agenda, week and month views (§30).
 *
 * Agenda is the default because on a phone, before a class, "what's next" beats
 * a grid. The month grid is the desktop planning view.
 */
export function CalendarViews({
  classes,
  initialMonth,
  today,
}: {
  classes: ClassCardData[]
  initialMonth: string
  /** Resolved on the server in the instructor's timezone, not the browser's. */
  today: string
}) {
  const [view, setView] = React.useState<View>('agenda')
  const [anchor, setAnchor] = React.useState(initialMonth)

  const byDate = React.useMemo(() => {
    const map = new Map<string, ClassCardData[]>()
    for (const item of classes) {
      const list = map.get(item.scheduled_date) ?? []
      list.push(item)
      map.set(item.scheduled_date, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.start_time.localeCompare(b.start_time))
    return map
  }, [classes])

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Calendar view"
        className="inline-flex rounded-xl border border-[var(--border-strong)] p-0.5"
      >
        {(['agenda', 'week', 'month'] as View[]).map((option) => (
          <button
            key={option}
            role="tab"
            aria-selected={view === option}
            onClick={() => setView(option)}
            className={cn(
              'tap rounded-[0.625rem] px-4 text-sm font-medium capitalize transition-colors',
              view === option
                ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                : 'text-[var(--text-muted)]',
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {view === 'agenda' ? <AgendaView classes={classes} today={today} /> : null}
      {view === 'week' ? (
        <WeekView byDate={byDate} anchor={anchor} onAnchor={setAnchor} today={today} />
      ) : null}
      {view === 'month' ? (
        <MonthView byDate={byDate} anchor={anchor} onAnchor={setAnchor} today={today} />
      ) : null}
    </div>
  )
}

function AgendaView({ classes, today }: { classes: ClassCardData[]; today: string }) {
  const upcoming = classes.filter((c) => c.scheduled_date >= today)
  const past = classes.filter((c) => c.scheduled_date < today).reverse()

  if (classes.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nothing scheduled"
        description="Create a term to generate your weekly classes."
        action={
          <Button asChild>
            <Link href="/terms/new">Create a term</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 ? (
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle">Upcoming</h2>
          {upcoming.map((item) => (
            <ClassCard key={item.id} data={item} showRelativeDay />
          ))}
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle">Past</h2>
          {past.slice(0, 25).map((item) => (
            <ClassCard key={item.id} data={item} />
          ))}
        </section>
      ) : null}
    </div>
  )
}

function WeekView({
  byDate,
  anchor,
  onAnchor,
  today,
}: {
  byDate: Map<string, ClassCardData[]>
  anchor: string
  onAnchor: (iso: string) => void
  today: string
}) {
  // Weeks start on Monday.
  const anchorDate = parseISODate(anchor)
  const offset = (anchorDate.getUTCDay() + 6) % 7
  const monday = addDays(anchor, -offset)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  return (
    <div>
      <Nav
        label={`${formatDate(monday)} – ${formatDate(days[6]!)}`}
        onPrev={() => onAnchor(addDays(anchor, -7))}
        onNext={() => onAnchor(addDays(anchor, 7))}
        onToday={() => onAnchor(today)}
      />
      <ul className="mt-3 space-y-2">
        {days.map((day) => {
          const items = byDate.get(day) ?? []
          return (
            <li
              key={day}
              className={cn(
                'rounded-[var(--radius-card)] border p-3',
                day === today
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border)] bg-[var(--surface)]',
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
                {formatDate(day)}
              </p>
              {items.length === 0 ? (
                <p className="mt-1 text-sm text-subtle">No classes</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/classes/${item.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-muted)] px-2.5 py-2 text-sm hover:bg-[var(--border)]"
                      >
                        <span className="min-w-0 truncate">
                          {formatTime(item.start_time)} · {item.term?.name ?? 'Class'}
                        </span>
                        <Badge tone={CLASS_STATUS_TONE[item.status] ?? 'neutral'}>
                          W{item.week_number}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function MonthView({
  byDate,
  anchor,
  onAnchor,
  today,
}: {
  byDate: Map<string, ClassCardData[]>
  anchor: string
  onAnchor: (iso: string) => void
  today: string
}) {
  const anchorDate = parseISODate(anchor)
  const year = anchorDate.getUTCFullYear()
  const month = anchorDate.getUTCMonth()

  const first = toISODate(new Date(Date.UTC(year, month, 1)))
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const leading = (parseISODate(first).getUTCDay() + 6) % 7

  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toISODate(new Date(Date.UTC(year, month, i + 1))),
    ),
  ]

  return (
    <div>
      <Nav
        label={formatMonth(first)}
        onPrev={() => onAnchor(toISODate(new Date(Date.UTC(year, month - 1, 1))))}
        onNext={() => onAnchor(toISODate(new Date(Date.UTC(year, month + 1, 1))))}
        onToday={() => onAnchor(today)}
      />

      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[34rem]">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-subtle">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (!day) return <div key={`pad-${index}`} />
              const items = byDate.get(day) ?? []
              return (
                <div
                  key={day}
                  className={cn(
                    'min-h-20 rounded-lg border p-1.5',
                    day === today
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border)] bg-[var(--surface)]',
                  )}
                >
                  <span className="text-xs font-medium">{Number(day.slice(-2))}</span>
                  <ul className="mt-1 space-y-0.5">
                    {items.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/classes/${item.id}`}
                          title={`${item.term?.name ?? 'Class'} · Week ${item.week_number}`}
                          className={cn(
                            'block truncate rounded px-1 py-0.5 text-[0.6875rem] font-medium',
                            item.status === 'cancelled'
                              ? 'bg-[var(--negative-soft)] text-[var(--negative)] line-through'
                              : item.status === 'completed'
                                ? 'bg-[var(--positive-soft)] text-[var(--positive)]'
                                : 'bg-[var(--surface-muted)] text-[var(--text)]',
                          )}
                        >
                          {formatTime(item.start_time)} {item.term?.name ?? 'Class'}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Nav({
  label,
  onPrev,
  onNext,
  onToday,
}: {
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous"
        className="tap flex items-center justify-center rounded-xl border border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next"
        className="tap flex items-center justify-center rounded-xl border border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
      >
        <ChevronRight className="size-4" />
      </button>
      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</p>
      <button
        type="button"
        onClick={onToday}
        className="tap rounded-xl px-3 text-sm font-medium text-[var(--accent)]"
      >
        Today
      </button>
    </div>
  )
}
