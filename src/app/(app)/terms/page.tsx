import type { Metadata } from 'next'
import Link from 'next/link'
import { Layers, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/domain/format'
import { formatTime, termEndDate, WEEKDAY_LABELS, type WeekdayIndex } from '@/lib/domain/schedule'

export const metadata: Metadata = { title: 'Terms' }

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'neutral',
  active: 'positive',
  completed: 'info',
  cancelled: 'negative',
}

export default async function TermsPage() {
  const supabase = await createClient()
  const { data: terms } = await supabase
    .from('terms')
    .select('id, name, status, start_date, weekday, start_time, number_of_weeks, location, levels ( name ), term_students ( id )')
    .order('start_date', { ascending: false })

  const rows = (terms ?? []) as unknown as {
    id: string
    name: string
    status: string
    start_date: string
    weekday: number
    start_time: string
    number_of_weeks: number
    location: string | null
    levels: { name: string } | null
    term_students: { id: string }[]
  }[]

  return (
    <>
      <PageHeader
        title="Terms"
        description="Multi-week programmes and the classes they generate."
        action={
          <Button asChild>
            <Link href="/terms/new">
              <Plus className="size-4" />
              New term
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No terms yet"
          description="Create a term to generate your weekly classes."
          action={
            <Button asChild>
              <Link href="/terms/new">Create a term</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((term) => (
            <li key={term.id}>
              <Link
                href={`/terms/${term.id}`}
                className="block rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] transition-colors hover:border-[var(--border-strong)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold">{term.name}</h2>
                    <p className="mt-0.5 text-xs text-muted">
                      {WEEKDAY_LABELS[term.weekday as WeekdayIndex]}s ·{' '}
                      {formatTime(term.start_time)} · {term.number_of_weeks} weeks
                      {term.location ? ` · ${term.location}` : ''}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[term.status] ?? 'neutral'}>{term.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-subtle">
                  {formatDate(term.start_date)} –{' '}
                  {formatDate(
                    termEndDate(term.start_date, term.weekday as WeekdayIndex, term.number_of_weeks),
                  )}
                  {' · '}
                  {term.term_students.length}{' '}
                  {term.term_students.length === 1 ? 'student' : 'students'}
                  {term.levels ? ` · ${term.levels.name}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
