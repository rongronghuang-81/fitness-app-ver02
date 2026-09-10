import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, SectionTitle } from '@/components/ui/page'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TermRoster } from '@/components/terms/term-roster'
import { TermClassList } from '@/components/terms/term-class-list'
import { formatDate } from '@/lib/domain/format'
import { formatTime, termEndDate, WEEKDAY_LABELS, type WeekdayIndex } from '@/lib/domain/schedule'

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'neutral',
  active: 'positive',
  completed: 'info',
  cancelled: 'negative',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('terms').select('name').eq('id', id).maybeSingle()
  return { title: data?.name ?? 'Term' }
}

export default async function TermPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: term }, { data: classes }, { data: enrolments }, { data: students }] =
    await Promise.all([
      supabase.from('terms').select('*, levels ( id, name )').eq('id', id).maybeSingle(),
      supabase
        .from('classes')
        .select('id, week_number, scheduled_date, start_time, duration_minutes, status, theme, class_students ( id )')
        .eq('term_id', id)
        .order('week_number'),
      supabase
        .from('term_students')
        .select('student_id, status, students ( id, first_name, last_name, preferred_name )')
        .eq('term_id', id),
      supabase
        .from('students')
        .select('id, first_name, last_name, preferred_name')
        .eq('active', true)
        .order('first_name'),
    ])

  if (!term) notFound()

  const endDate = termEndDate(
    term.start_date,
    term.weekday as WeekdayIndex,
    term.number_of_weeks,
  )

  return (
    <>
      <PageHeader
        title={term.name}
        description={`${WEEKDAY_LABELS[term.weekday as WeekdayIndex]}s at ${formatTime(term.start_time)} · ${formatDate(term.start_date)} – ${formatDate(endDate)}`}
        action={
          <Button variant="secondary" asChild>
            <Link href={`/terms/${id}/edit`}>
              <Pencil className="size-4" />
              <span className="hidden sm:inline">Edit</span>
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone={STATUS_TONE[term.status] ?? 'neutral'}>{term.status}</Badge>
        <Badge>{term.number_of_weeks} weeks</Badge>
        <Badge>{term.duration_minutes} min</Badge>
        {term.location ? <Badge>{term.location}</Badge> : null}
        {term.levels ? <Badge tone="accent">{term.levels.name}</Badge> : null}
      </div>

      {term.description ? (
        <p className="mb-6 whitespace-pre-wrap text-sm text-muted">{term.description}</p>
      ) : null}

      <div className="space-y-8">
        <TermRoster
          termId={id}
          enrolments={
            (enrolments ?? []) as unknown as {
              student_id: string
              status: string
              students: {
                id: string
                first_name: string
                last_name: string | null
                preferred_name: string | null
              } | null
            }[]
          }
          allStudents={students ?? []}
        />

        <section className="space-y-3">
          <SectionTitle>Classes</SectionTitle>
          <TermClassList
            termName={term.name}
            classes={
              (classes ?? []) as unknown as {
                id: string
                week_number: number
                scheduled_date: string
                start_time: string
                duration_minutes: number
                status: string
                theme: string | null
                class_students: { id: string }[]
              }[]
            }
          />
        </section>

        {term.notes ? (
          <section className="space-y-2">
            <SectionTitle>Notes</SectionTitle>
            <p className="whitespace-pre-wrap rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-4 text-sm">
              {term.notes}
            </p>
          </section>
        ) : null}
      </div>
    </>
  )
}
