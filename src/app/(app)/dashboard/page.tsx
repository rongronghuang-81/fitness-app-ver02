import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertCircle,
  CalendarPlus,
  Dumbbell,
  Sparkles,
  Trophy,
  UserPlus,
} from 'lucide-react'
import { getDashboardData, getStalledStudents } from '@/lib/queries/dashboard'
import { ClassCard } from '@/components/classes/class-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionTitle } from '@/components/ui/page'
import { formatDate, formatDateShort, studentName } from '@/lib/domain/format'
import { daysSince } from '@/lib/domain/progress'

export const metadata: Metadata = { title: 'Dashboard' }

const QUICK_ACTIONS = [
  { href: '/students?new=1', label: 'Add student', icon: UserPlus },
  { href: '/terms/new', label: 'Create term', icon: CalendarPlus },
  { href: '/tricks?new=1', label: 'Add trick', icon: Sparkles },
  { href: '/exercises?new=1', label: 'Add exercise', icon: Dumbbell },
]

export default async function DashboardPage() {
  const [data, stalled] = await Promise.all([getDashboardData(), getStalledStudents()])

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm text-muted">{formatDate(data.today)}</p>
        <h1 className="mt-0.5 text-2xl font-semibold">
          {data.todayClasses.length > 0
            ? `${data.todayClasses.length} class${data.todayClasses.length === 1 ? '' : 'es'} today`
            : 'No classes today'}
        </h1>
      </header>

      {/* Quick actions sit high: the dashboard prioritises action over stats (§6). */}
      <nav aria-label="Quick actions" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="tap flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-medium shadow-[var(--shadow-card)] transition-colors hover:border-[var(--border-strong)]"
          >
            <action.icon className="size-4 shrink-0 text-[var(--accent)]" />
            <span className="truncate">{action.label}</span>
          </Link>
        ))}
      </nav>

      {data.todayClasses.length > 0 ? (
        <section aria-labelledby="today-heading" className="space-y-2.5">
          <SectionTitle>
            <span id="today-heading">Today</span>
          </SectionTitle>
          {data.todayClasses.map((c) => (
            <ClassCard key={c.id} data={c} showRelativeDay />
          ))}
        </section>
      ) : null}

      {data.needsCompleting.length > 0 ? (
        <section aria-labelledby="followup-heading" className="space-y-2.5">
          <SectionTitle>
            <span id="followup-heading" className="flex items-center gap-1.5">
              <AlertCircle className="size-3.5 text-[var(--warning)]" aria-hidden="true" />
              Not yet completed
            </span>
          </SectionTitle>
          <p className="text-sm text-muted">
            These classes have passed but were never marked complete.
          </p>
          {data.needsCompleting.map((c) => (
            <ClassCard key={c.id} data={c} />
          ))}
        </section>
      ) : null}

      <section aria-labelledby="upcoming-heading" className="space-y-2.5">
        <SectionTitle>
          <span id="upcoming-heading">Coming up</span>
        </SectionTitle>
        {data.upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="No upcoming classes"
            description="Create a term to generate your weekly classes."
            action={
              <Link
                href="/terms/new"
                className="tap inline-flex items-center rounded-xl bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-text)]"
              >
                Create a term
              </Link>
            }
          />
        ) : (
          data.upcoming.map((c) => <ClassCard key={c.id} data={c} showRelativeDay />)
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Trophy className="size-4 text-[var(--accent)]" aria-hidden="true" />
              Recent milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentMilestones.length === 0 ? (
              <p className="text-sm text-muted">
                Milestones you record after class will appear here.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {data.recentMilestones.map((m) => (
                  <li key={m.id} className="text-sm">
                    <Link
                      href={m.students ? `/students/${m.students.id}` : '#'}
                      className="font-medium hover:underline"
                    >
                      {m.students ? studentName(m.students) : 'Student'}
                    </Link>
                    <span className="text-muted"> — {m.title}</span>
                    <span className="block text-xs text-subtle">
                      {formatDateShort(m.achieved_on)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Due a progress update</CardTitle>
          </CardHeader>
          <CardContent>
            {stalled.length === 0 ? (
              <p className="text-sm text-muted">
                {data.activeStudentCount === 0
                  ? 'Add your first student to start tracking attendance and progress.'
                  : 'Everyone has a recent progress update. Nicely kept.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {stalled.map((s) => {
                  const days = daysSince(s.lastUpdate)
                  return (
                    <li key={s.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <Link href={`/students/${s.id}`} className="font-medium hover:underline">
                        {s.name}
                      </Link>
                      <span className="shrink-0 text-xs text-subtle">
                        {days === null ? 'No updates yet' : `${days} days ago`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
