import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTermsForStudent, getStudentProfile } from '@/lib/queries/students'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DetailRow } from '@/components/ui/page'
import { EmptyState } from '@/components/ui/empty-state'
import { MediaGallery } from '@/components/media/media-gallery'
import { SkillProgressList } from '@/components/progress/skill-progress-list'
import { StudentHeader } from '@/components/students/student-header'
import { summariseAttendance } from '@/lib/domain/attendance'
import { attendanceLabel } from '@/lib/domain/attendance'
import { formatDate, formatDateShort, studentName } from '@/lib/domain/format'
import { formatTime } from '@/lib/domain/schedule'
import type { AttendanceStatus } from '@/types/database'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const profile = await getStudentProfile(id)
  return { title: profile ? studentName(profile.student) : 'Student' }
}

const ATTENDANCE_TONE: Record<AttendanceStatus, 'positive' | 'negative' | 'warning' | 'neutral'> = {
  present: 'positive',
  late: 'warning',
  absent: 'negative',
  excused: 'neutral',
  unmarked: 'neutral',
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getStudentProfile(id)
  if (!profile) notFound()

  const supabase = await createClient()
  const [enrolments, { data: levels }, { data: tricks }, { data: statuses }] = await Promise.all([
    getCurrentTermsForStudent(id),
    supabase.from('levels').select('id, name').eq('active', true).order('sort_order'),
    supabase.from('tricks').select('id, name').eq('active', true).order('name'),
    supabase.from('skill_statuses').select('*').order('sort_order'),
  ])

  const name = studentName(profile.student)
  const summary = summariseAttendance(profile.attendance.map((a) => a.attendance_status))
  const currentTerms = enrolments.filter((e) => e.status === 'enrolled' && e.terms)

  return (
    <>
      <StudentHeader
        student={profile.student}
        levels={levels ?? []}
        attendancePercentage={summary.percentage}
      />

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList aria-label="Student sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
        </TabsList>

        {/* --- Overview --- */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="pt-4 sm:pt-5">
              <dl className="divide-y divide-[var(--border)]">
                <DetailRow label="Name">{name}</DetailRow>
                <DetailRow label="Level">
                  {profile.student.levels ? (
                    <Badge tone="accent">{profile.student.levels.name}</Badge>
                  ) : (
                    <span className="text-muted">Not set</span>
                  )}
                </DetailRow>
                <DetailRow label="Current term">
                  {currentTerms.length === 0 ? (
                    <span className="text-muted">Not enrolled in a term</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {currentTerms.map((e) => (
                        <li key={e.terms!.id}>
                          <Link href={`/terms/${e.terms!.id}`} className="text-[var(--accent)] hover:underline">
                            {e.terms!.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </DetailRow>
                <DetailRow label="Joined">{formatDate(profile.student.date_joined)}</DetailRow>
                {profile.student.email ? (
                  <DetailRow label="Email">
                    <a href={`mailto:${profile.student.email}`} className="text-[var(--accent)] hover:underline">
                      {profile.student.email}
                    </a>
                  </DetailRow>
                ) : null}
                {profile.student.phone ? (
                  <DetailRow label="Phone">
                    <a href={`tel:${profile.student.phone}`} className="text-[var(--accent)] hover:underline">
                      {profile.student.phone}
                    </a>
                  </DetailRow>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted">
                  {profile.student.goals || 'No goals recorded yet.'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Instructor notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted">
                  {profile.student.general_notes || 'No notes yet.'}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- Attendance --- */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total classes" value={String(summary.total)} />
            <Stat label="Attended" value={String(summary.attended)} />
            <Stat
              label="Attendance"
              value={summary.percentage === null ? '—' : `${summary.percentage}%`}
            />
          </div>

          {profile.attendance.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No classes yet"
              description="Enrol this student in a term and their attendance will build up here."
            />
          ) : (
            <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
              {profile.attendance.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/classes/${row.classes!.id}`}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-[var(--surface-muted)]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {row.classes!.terms?.name ?? 'Class'} · Week {row.classes!.week_number}
                      </span>
                      <span className="block text-xs text-muted">
                        {formatDate(row.classes!.scheduled_date)}
                      </span>
                    </span>
                    <Badge tone={ATTENDANCE_TONE[row.attendance_status]}>
                      {attendanceLabel(row.attendance_status)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* --- Progress --- */}
        <TabsContent value="progress">
          <SkillProgressList
            studentId={id}
            rows={profile.progress}
            allTricks={tricks ?? []}
            statuses={statuses ?? []}
          />
        </TabsContent>

        {/* --- Milestones --- */}
        <TabsContent value="milestones">
          {profile.milestones.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No milestones yet"
              description="Record a milestone when this student lands something for the first time."
            />
          ) : (
            <ol className="space-y-3">
              {profile.milestones.map((m) => (
                <li
                  key={m.id}
                  className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold">{m.title}</h3>
                    <time
                      dateTime={m.achieved_on}
                      className="shrink-0 text-xs text-subtle"
                    >
                      {formatDateShort(m.achieved_on)}
                    </time>
                  </div>
                  {m.description ? (
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted">{m.description}</p>
                  ) : null}
                  {m.instructor_note ? (
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-subtle">
                      {m.instructor_note}
                    </p>
                  ) : null}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {m.tricks ? (
                      <Link href={`/tricks/${m.tricks.id}`}>
                        <Badge tone="accent">{m.tricks.name}</Badge>
                      </Link>
                    ) : null}
                    {m.classes ? (
                      <Link href={`/classes/${m.classes.id}`}>
                        <Badge>Class {formatDateShort(m.classes.scheduled_date)}</Badge>
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        {/* --- Media --- */}
        <TabsContent value="media">
          <MediaGallery items={profile.media} />
        </TabsContent>

        {/* --- Class history --- */}
        <TabsContent value="classes">
          {profile.attendance.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No class history"
              description="Notes you write about this student in a class will show up here."
            />
          ) : (
            <ul className="space-y-2">
              {profile.attendance.map((row) => {
                const hasNotes =
                  row.performance_notes || row.achievements || row.difficulties || row.homework
                return (
                  <li
                    key={row.id}
                    className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/classes/${row.classes!.id}`}
                        className="min-w-0 text-sm font-medium hover:underline"
                      >
                        {row.classes!.terms?.name ?? 'Class'} · Week {row.classes!.week_number}
                      </Link>
                      <span className="shrink-0 text-xs text-subtle">
                        {formatDateShort(row.classes!.scheduled_date)} ·{' '}
                        {formatTime(row.classes!.start_time)}
                      </span>
                    </div>

                    {hasNotes ? (
                      <dl className="mt-2 space-y-1.5 text-sm">
                        {row.achievements ? (
                          <NoteLine label="Achieved" tone="positive" value={row.achievements} />
                        ) : null}
                        {row.performance_notes ? (
                          <NoteLine label="Notes" value={row.performance_notes} />
                        ) : null}
                        {row.difficulties ? (
                          <NoteLine label="Working on" tone="warning" value={row.difficulties} />
                        ) : null}
                        {row.homework ? <NoteLine label="Homework" value={row.homework} /> : null}
                      </dl>
                    ) : (
                      <p className="mt-1.5 text-sm text-subtle">No notes for this class.</p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3 text-center shadow-[var(--shadow-card)]">
      <p className="text-xl font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  )
}

function NoteLine({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'positive' | 'warning'
}) {
  return (
    <div className="flex gap-2">
      <dt
        className={`shrink-0 text-xs font-semibold uppercase tracking-wide ${
          tone === 'positive'
            ? 'text-[var(--positive)]'
            : tone === 'warning'
              ? 'text-[var(--warning)]'
              : 'text-subtle'
        }`}
      >
        {label}
      </dt>
      <dd className="min-w-0 whitespace-pre-wrap">{value}</dd>
    </div>
  )
}
