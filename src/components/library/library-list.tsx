'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Search, Star } from 'lucide-react'
import { toggleFavorite } from '@/actions/library'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export interface LibraryRow {
  id: string
  name: string
  is_favorite: boolean
  active: boolean
  difficulty: number | null
  /** Level names for a trick, or the single level name for an exercise. */
  levels: string[]
  categories: string[]
  /** Exercise-only. */
  targetArea?: string | null
  equipment?: string | null
}

/**
 * Shared list for both libraries (§32 filters, §34 favourites).
 * Favourites sort to the top so the things used every week are one tap away.
 */
export function LibraryList({
  rows,
  kind,
  categories,
  levels,
  onAdd,
  emptyTitle,
  emptyDescription,
}: {
  rows: LibraryRow[]
  kind: 'tricks' | 'exercises'
  categories: { id: string; name: string }[]
  levels: { id: string; name: string }[]
  onAdd: () => void
  emptyTitle: string
  emptyDescription: string
}) {
  const { notify } = useToast()
  const [query, setQuery] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [level, setLevel] = React.useState('')
  const [difficulty, setDifficulty] = React.useState('')
  const [showArchived, setShowArchived] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((row) => {
        if (!showArchived && !row.active) return false
        if (q && !row.name.toLowerCase().includes(q)) return false
        if (category && !row.categories.includes(category)) return false
        if (level && !row.levels.includes(level)) return false
        if (difficulty && String(row.difficulty ?? '') !== difficulty) return false
        return true
      })
      .sort(
        (a, b) => Number(b.is_favorite) - Number(a.is_favorite) || a.name.localeCompare(b.name),
      )
  }, [rows, query, category, level, difficulty, showArchived])

  function favourite(row: LibraryRow) {
    startTransition(async () => {
      const result = await toggleFavorite(kind, row.id, !row.is_favorite)
      if (result.status === 'error') notify(result.message, 'error')
    })
  }

  return (
    <>
      <div className="mb-4 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={kind === 'tricks' ? 'Search tricks' : 'Search exercises'}
            aria-label={kind === 'tricks' ? 'Search tricks' : 'Search exercises'}
            className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] py-2.5 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label="Filter by level"
          >
            <option value="">All levels</option>
            {levels.map((l) => (
              <option key={l.id} value={l.name}>
                {l.name}
              </option>
            ))}
          </Select>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            aria-label="Filter by difficulty"
          >
            <option value="">Any difficulty</option>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={String(d)}>
                Level {d}
              </option>
            ))}
          </Select>
          <Select
            value={showArchived ? 'all' : 'active'}
            onChange={(e) => setShowArchived(e.target.value === 'all')}
            aria-label="Filter by status"
          >
            <option value="active">Active</option>
            <option value="all">Include archived</option>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        rows.length === 0 ? (
          <EmptyState
            icon={Plus}
            title={emptyTitle}
            description={emptyDescription}
            action={<Button onClick={onAdd}>Add the first one</Button>}
          />
        ) : (
          <EmptyState icon={Search} title="No matches" description="Try a different filter." />
        )
      ) : (
        <ul className="space-y-2">
          {filtered.map((row) => (
            <li
              key={row.id}
              className={cn(
                'flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]',
                !row.active && 'opacity-60',
              )}
            >
              <button
                type="button"
                disabled={pending}
                onClick={() => favourite(row)}
                aria-label={row.is_favorite ? `Unfavourite ${row.name}` : `Favourite ${row.name}`}
                aria-pressed={row.is_favorite}
                className="tap flex shrink-0 items-center justify-center rounded-lg disabled:opacity-50"
              >
                <Star
                  className={cn(
                    'size-4',
                    row.is_favorite
                      ? 'fill-[var(--warning)] text-[var(--warning)]'
                      : 'text-[var(--text-subtle)]',
                  )}
                />
              </button>

              <Link href={`/${kind}/${row.id}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{row.name}</span>
                <span className="block truncate text-xs text-muted">
                  {[
                    ...row.levels,
                    ...row.categories,
                    row.targetArea ?? null,
                    row.equipment ?? null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'No categories yet'}
                </span>
              </Link>

              {row.difficulty ? <Badge>Lv {row.difficulty}</Badge> : null}
              {!row.active ? <Badge tone="warning">Archived</Badge> : null}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
