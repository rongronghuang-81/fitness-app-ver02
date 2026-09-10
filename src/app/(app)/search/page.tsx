import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page'
import { EmptyState } from '@/components/ui/empty-state'
import type { SearchResult } from '@/types/database'

export const metadata: Metadata = { title: 'Search' }

const KIND_LABEL: Record<SearchResult['kind'], string> = {
  student: 'Students',
  term: 'Terms',
  class: 'Classes',
  trick: 'Tricks',
  exercise: 'Exercises',
}

const KIND_PATH: Record<SearchResult['kind'], string> = {
  student: '/students',
  term: '/terms',
  class: '/classes',
  trick: '/tricks',
  exercise: '/exercises',
}

/**
 * Full-page search results (§31). The header's Cmd-K panel covers the quick
 * case; this is the shareable, deep-linkable version.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  let results: SearchResult[] = []
  if (query.length >= 2) {
    const supabase = await createClient()
    const { data } = await supabase.rpc('global_search', { p_query: query, p_limit: 20 })
    results = (data as SearchResult[] | null) ?? []
  }

  const grouped = new Map<SearchResult['kind'], SearchResult[]>()
  for (const result of results) {
    const list = grouped.get(result.kind) ?? []
    list.push(result)
    grouped.set(result.kind, list)
  }

  return (
    <>
      <PageHeader
        title={query ? `Results for “${query}”` : 'Search'}
        description="Students, terms, classes, tricks and exercises."
      />

      <form action="/search" method="get" className="mb-6">
        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Sarah, shoulder, ayesha, September…"
            className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] py-2.5 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
      </form>

      {query.length < 2 ? (
        <p className="text-sm text-muted">Type at least two characters. Partial matches work.</p>
      ) : results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing found"
          description={`Nothing matched “${query}”. Try a shorter or different term.`}
        />
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([kind, items]) => (
            <section key={kind}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">
                {KIND_LABEL[kind]}
              </h2>
              <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
                {items.map((result) => (
                  <li key={`${result.kind}-${result.id}`}>
                    <Link
                      href={`${KIND_PATH[result.kind]}/${result.id}`}
                      className="block p-3 hover:bg-[var(--surface-muted)]"
                    >
                      <span className="block text-sm font-medium">{result.title}</span>
                      {result.subtitle ? (
                        <span className="block text-xs text-muted">{result.subtitle}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
