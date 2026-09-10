import type { Metadata } from 'next'
import { getTaxonomy, listTricks } from '@/lib/queries/library'
import { LibraryPageShell } from '@/components/library/library-page-shell'

export const metadata: Metadata = { title: 'Tricks' }

export default async function TricksPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const [params, rows, taxonomy] = await Promise.all([searchParams, listTricks(), getTaxonomy()])

  return (
    <LibraryPageShell
      kind="tricks"
      rows={rows}
      levels={taxonomy.levels}
      categories={taxonomy.trickCategories}
      openNew={params.new === '1'}
    />
  )
}
