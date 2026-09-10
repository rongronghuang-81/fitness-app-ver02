import type { Metadata } from 'next'
import { getTaxonomy, listExercises } from '@/lib/queries/library'
import { LibraryPageShell } from '@/components/library/library-page-shell'

export const metadata: Metadata = { title: 'Exercises' }

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const [params, rows, taxonomy] = await Promise.all([searchParams, listExercises(), getTaxonomy()])

  return (
    <LibraryPageShell
      kind="exercises"
      rows={rows}
      levels={taxonomy.levels}
      categories={taxonomy.exerciseCategories}
      openNew={params.new === '1'}
    />
  )
}
