import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getClassDetail,
  getLibraryOptions,
  getPreviousClassLesson,
} from '@/lib/queries/classes'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page'
import { AttendanceStrip } from '@/components/classes/attendance-strip'
import { ClassActions } from '@/components/classes/class-actions'
import { LessonPlan } from '@/components/classes/lesson-plan'
import { PlannedVsActual } from '@/components/classes/planned-vs-actual'
import { StudentNoteCard } from '@/components/classes/student-note-card'
import { MediaUpload } from '@/components/media/media-upload'
import { MediaGallery } from '@/components/media/media-gallery'
import { CLASS_STATUS_LABEL, CLASS_STATUS_TONE } from '@/components/classes/class-card'
import { formatDate } from '@/lib/domain/format'
import { endTime, formatTime } from '@/lib/domain/schedule'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const detail = await getClassDetail(id)
  return {
    title: detail
      ? `${detail.classRow.terms?.name ?? 'Class'} · Week ${detail.classRow.week_number}`
      : 'Class',
  }
}

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getClassDetail(id)
  if (!detail) notFound()

  const supabase = await createClient()
  const [library, previous, { data: classMedia }, { data: allStudents }] = await Promise.all([
    getLibraryOptions(),
    getPreviousClassLesson(detail.classRow.term_id, detail.classRow.week_number),
    supabase
      .from('media')
      .select('id, file_type, caption, created_at, class_id, trick_id, tricks ( id, name )')
      .eq('class_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('students')
      .select('id, first_name, last_name, preferred_name')
      .eq('active', true)
      .order('first_name'),
  ])

  const trickNames = new Map(library.tricks.map((t) => [t.id, t.name] as const))
  const exerciseNames = new Map(library.exercises.map((e) => [e.id, e.name] as const))
  const students = detail.roster
    .map((r) => r.students)
    .filter((s): s is NonNullable<typeof s> => s !== null)

  const isLocked = detail.classRow.status === 'cancelled'

  return (
    <>
      <PageHeader
        title={`${detail.classRow.terms?.name ?? 'Class'} · Week ${detail.classRow.week_number}`}
        description={`${formatDate(detail.classRow.scheduled_date)} · ${formatTime(detail.classRow.start_time)} – ${endTime(detail.classRow.start_time, detail.classRow.duration_minutes)}${detail.classRow.terms?.location ? ` · ${detail.classRow.terms.location}` : ''}`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={CLASS_STATUS_TONE[detail.classRow.status] ?? 'neutral'}>
          {CLASS_STATUS_LABEL[detail.classRow.status] ?? detail.classRow.status}
        </Badge>
        {detail.classRow.terms ? (
          <Link href={`/terms/${detail.classRow.terms.id}`}>
            <Badge>
              Week {detail.classRow.week_number} of {detail.classRow.terms.number_of_weeks}
            </Badge>
          </Link>
        ) : null}
        {detail.classRow.theme ? <Badge tone="accent">{detail.classRow.theme}</Badge> : null}
      </div>

      <div className="mb-6">
        <ClassActions
          classId={id}
          status={detail.classRow.status}
          roster={detail.roster}
          plannedItems={detail.planned.items}
          actualItems={detail.actual.items}
          plannedLessonId={detail.planned.id}
          tricks={library.tricks}
          templates={library.templates}
          previous={previous}
          generalNotes={detail.classRow.general_notes}
          scheduledDate={detail.classRow.scheduled_date}
          startTime={detail.classRow.start_time}
          durationMinutes={detail.classRow.duration_minutes}
          theme={detail.classRow.theme}
        />
      </div>

      <Tabs defaultValue="attendance">
        <TabsList aria-label="Class sections">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="plan">Lesson plan</TabsTrigger>
          <TabsTrigger value="actual">What happened</TabsTrigger>
          <TabsTrigger value="notes">Student notes</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <AttendanceStrip
            classId={id}
            roster={detail.roster}
            allStudents={allStudents ?? []}
          />
        </TabsContent>

        <TabsContent value="plan">
          <LessonPlan
            classId={id}
            kind="planned"
            lesson={detail.planned}
            tricks={library.tricks}
            exercises={library.exercises}
            {...(isLocked ? { readOnlyNotice: 'This class is cancelled. Restore it to make changes.' } : {})}
          />
        </TabsContent>

        <TabsContent value="actual" className="space-y-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold">Compared with the plan</h3>
            <PlannedVsActual
              plannedItems={detail.planned.items}
              actualItems={detail.actual.items}
              trickNames={trickNames}
              exerciseNames={exerciseNames}
            />
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">What was actually taught</h3>
            <LessonPlan
              classId={id}
              kind="actual"
              lesson={detail.actual}
              tricks={library.tricks}
              exercises={library.exercises}
            />
          </section>
        </TabsContent>

        <TabsContent value="notes" className="space-y-2">
          {detail.roster.length === 0 ? (
            <p className="text-sm text-muted">Nobody is on this class yet.</p>
          ) : (
            detail.roster.map((row) => <StudentNoteCard key={row.id} row={row} />)
          )}

          {detail.classRow.general_notes ? (
            <div className="mt-4 rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-subtle">
                General class notes
              </h4>
              <p className="mt-1.5 whitespace-pre-wrap text-sm">{detail.classRow.general_notes}</p>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <MediaUpload students={students} tricks={library.tricks} classId={id} />
          <MediaGallery
            items={
              (classMedia ?? []) as unknown as {
                id: string
                file_type: 'photo' | 'video'
                caption: string | null
                created_at: string
                class_id: string | null
                trick_id: string | null
                tricks: { id: string; name: string } | null
              }[]
            }
          />
        </TabsContent>
      </Tabs>
    </>
  )
}
