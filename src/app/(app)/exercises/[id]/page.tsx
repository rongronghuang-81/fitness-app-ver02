import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getExerciseDetail, getTaxonomy } from '@/lib/queries/library'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DetailRow, PageHeader } from '@/components/ui/page'
import { LibraryDetailHeader } from '@/components/library/library-detail-header'
import { TrickExerciseLinks } from '@/components/library/trick-exercise-links'
import { formatDuration } from '@/lib/domain/lesson'
import type { Exercise } from '@/types/database'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const detail = await getExerciseDetail(id)
  return { title: detail?.exercise.name ?? 'Exercise' }
}

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getExerciseDetail(id)
  if (!detail) notFound()

  const supabase = await createClient()
  const [taxonomy, { data: allTricks }] = await Promise.all([
    getTaxonomy(),
    supabase.from('tricks').select('id, name').eq('active', true).order('name'),
  ])

  const exercise = detail.exercise as unknown as Exercise & {
    levels: { id: string; name: string } | null
  }

  const hasPrescription =
    exercise.sets || exercise.reps || exercise.duration_seconds || exercise.tempo

  return (
    <>
      <PageHeader
        title={exercise.name}
        description={exercise.levels?.name}
        action={
          <LibraryDetailHeader
            kind="exercises"
            item={exercise}
            levels={taxonomy.levels}
            categories={taxonomy.exerciseCategories}
            selectedCategoryIds={detail.categoryIds}
          />
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {exercise.difficulty ? <Badge tone="accent">Difficulty {exercise.difficulty}</Badge> : null}
        {exercise.target_area ? <Badge>{exercise.target_area}</Badge> : null}
        {exercise.equipment ? <Badge>{exercise.equipment}</Badge> : null}
        {detail.categoryNames.map((name) => (
          <Badge key={name}>{name}</Badge>
        ))}
        {!exercise.active ? <Badge tone="warning">Archived</Badge> : null}
      </div>

      {exercise.description ? (
        <p className="mb-6 whitespace-pre-wrap text-sm text-muted">{exercise.description}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {hasPrescription ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Prescription</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-[var(--border)]">
                {exercise.sets ? <DetailRow label="Sets">{exercise.sets}</DetailRow> : null}
                {exercise.reps ? <DetailRow label="Reps">{exercise.reps}</DetailRow> : null}
                {exercise.duration_seconds ? (
                  <DetailRow label="Hold">{formatDuration(exercise.duration_seconds)}</DetailRow>
                ) : null}
                {exercise.tempo ? <DetailRow label="Tempo">{exercise.tempo}</DetailRow> : null}
              </dl>
            </CardContent>
          </Card>
        ) : null}

        {exercise.progression || exercise.regression ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Scaling</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-[var(--border)]">
                {exercise.progression ? (
                  <DetailRow label="Harder">{exercise.progression}</DetailRow>
                ) : null}
                {exercise.regression ? (
                  <DetailRow label="Easier">{exercise.regression}</DetailRow>
                ) : null}
              </dl>
            </CardContent>
          </Card>
        ) : null}

        {exercise.instructor_notes ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Instructor notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted">{exercise.instructor_notes}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="mt-8">
        <TrickExerciseLinks
          side="exercise"
          exerciseId={id}
          links={detail.tricks.map((link) => ({
            id: link.id,
            relationship: link.relationship,
            otherId: link.tricks?.id ?? '',
            otherName: link.tricks?.name ?? 'Trick',
            detail: link.tricks?.difficulty ? `Difficulty ${link.tricks.difficulty}` : null,
          }))}
          options={allTricks ?? []}
        />
      </div>
    </>
  )
}
