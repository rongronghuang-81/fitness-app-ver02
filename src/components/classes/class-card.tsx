import Link from 'next/link'
import { Clock, Users } from 'lucide-react'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { endTime, formatTime } from '@/lib/domain/schedule'
import { formatDate, relativeDay } from '@/lib/domain/format'
import { cn } from '@/lib/utils'

export const CLASS_STATUS_TONE: Record<string, BadgeTone> = {
  planned: 'info',
  completed: 'positive',
  cancelled: 'negative',
  rescheduled: 'warning',
}

export const CLASS_STATUS_LABEL: Record<string, string> = {
  planned: 'Planned',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
}

export interface ClassCardData {
  id: string
  scheduled_date: string
  start_time: string
  duration_minutes: number
  status: string
  theme: string | null
  week_number: number
  term: { id: string; name: string; number_of_weeks: number } | null
  students: { id: string; name: string }[]
}

/** The class summary used on the dashboard, calendar agenda and class list. */
export function ClassCard({
  data,
  showRelativeDay = false,
  className,
}: {
  data: ClassCardData
  showRelativeDay?: boolean
  className?: string
}) {
  return (
    <Link
      href={`/classes/${data.id}`}
      className={cn(
        'block rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] transition-colors hover:border-[var(--border-strong)]',
        data.status === 'cancelled' && 'opacity-60',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {data.term?.name ?? 'Class'}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Week {data.week_number}
            {data.term ? ` of ${data.term.number_of_weeks}` : ''}
            {data.theme ? ` · ${data.theme}` : ''}
          </p>
        </div>
        <Badge tone={CLASS_STATUS_TONE[data.status] ?? 'neutral'}>
          {CLASS_STATUS_LABEL[data.status] ?? data.status}
        </Badge>
      </div>

      <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Time</dt>
          <Clock className="size-3.5" aria-hidden="true" />
          <dd>
            {showRelativeDay ? `${relativeDay(data.scheduled_date)} · ` : ''}
            {formatTime(data.start_time)} – {endTime(data.start_time, data.duration_minutes)}
          </dd>
        </div>
        {!showRelativeDay ? (
          <div>
            <dt className="sr-only">Date</dt>
            <dd>{formatDate(data.scheduled_date)}</dd>
          </div>
        ) : null}
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Students</dt>
          <Users className="size-3.5" aria-hidden="true" />
          <dd className="truncate">
            {data.students.length > 0
              ? data.students.map((s) => s.name).join(', ')
              : 'No students yet'}
          </dd>
        </div>
      </dl>
    </Link>
  )
}
