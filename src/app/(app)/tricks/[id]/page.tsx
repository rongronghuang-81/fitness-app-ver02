import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTaxonomy, getTrickDetail } from '@/lib/queries/library'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page'
import { LibraryDetailHeader } from '@/components/library/library-detail-header'
import { TrickRelationships } from '@/components/library/trick-relationships'
import { TrickExerciseLinks } from '@/components/library/trick-exercise-links'
import type { Trick } from '@/types/database'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const detail = await getTrickDetail(id)
  return { title: detail?.trick.name ?? 'Trick' }
}

export default async function TrickPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getTrickDetail(id)
  if (!detail) notFound()

  const supabase = await createClient()
  const [taxonomy, { data: allTricks }, { data: allExercises }] = await Promise.all([
    getTaxonomy(),
    supabase.from('tricks').select('id, name').eq('active', true).order('name'),
    supabase.from('exercises').select('id, name').eq('active', true).order('name'),
  ])

  const trick = detail.trick as Trick

  return (
    <>
      <PageHeader
        title={trick.name}
        description={detail.levelNames.join(' · ') || undefined}
        action={
          <LibraryDetailHeader
            kind="tricks"
            item={trick}
            levels={taxonomy.levels}
            categories={taxonomy.trickCategories}
            selectedLevelIds={detail.levelIds}
            selectedCategoryIds={detail.categoryIds}
          />
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {trick.difficulty ? <Badge tone="accent">Difficulty {trick.difficulty}</Badge> : null}
        {trick.grip ? <Badge>{trick.grip}</Badge> : null}
        {detail.categoryNames.map((name) => (
          <Badge key={name}>{name}</Badge>
        ))}
        {!trick.active ? <Badge tone="warning">Archived</Badge> : null}
      </div>

      {trick.description ? (
        <p className="mb-6 whitespace-pre-wrap text-sm text-muted">{trick.description}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {trick.key_cues ? (
          <TextCard title="Key cues" body={trick.key_cues} />
        ) : null}
        {trick.common_errors ? (
          <TextCard title="Common errors" body={trick.common_errors} />
        ) : null}
        {trick.safety_notes ? (
          <TextCard title="Safety notes" body={trick.safety_notes} tone="warning" />
        ) : null}
        {trick.entry || trick.exit ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Entry and exit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {trick.entry ? (
                <p>
                  <span className="text-muted">Entry: </span>
                  {trick.entry}
                </p>
              ) : null}
              {trick.exit ? (
                <p>
                  <span className="text-muted">Exit: </span>
                  {trick.exit}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
        {trick.instructor_notes ? (
          <TextCard title="Instructor notes" body={trick.instructor_notes} />
        ) : null}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <TrickExerciseLinks
          side="trick"
          trickId={id}
          links={detail.exercises.map((link) => ({
            id: link.id,
            relationship: link.relationship,
            otherId: link.exercises?.id ?? '',
            otherName: link.exercises?.name ?? 'Exercise',
            detail: link.exercises?.target_area ?? null,
          }))}
          options={allExercises ?? []}
        />

        <TrickRelationships
          trickId={id}
          relationships={detail.relationships}
          allTricks={allTricks ?? []}
        />
      </div>
    </>
  )
}

function TextCard({
  title,
  body,
  tone,
}: {
  title: string
  body: string
  tone?: 'warning'
}) {
  return (
    <Card className={tone === 'warning' ? 'border-[var(--warning)]' : undefined}>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-muted">{body}</p>
      </CardContent>
    </Card>
  )
}
