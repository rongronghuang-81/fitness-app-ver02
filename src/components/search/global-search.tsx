'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { SearchResult } from '@/types/database'
import { Sheet } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<SearchResult['kind'], string> = {
  student: 'Student',
  trick: 'Trick',
  exercise: 'Exercise',
  term: 'Term',
  class: 'Class',
}

const KIND_PATH: Record<SearchResult['kind'], string> = {
  student: '/students',
  trick: '/tricks',
  exercise: '/exercises',
  term: '/terms',
  class: '/classes',
}

/**
 * Global search (§31). Debounced, cancels stale requests, and searches through
 * the `global_search` RPC so RLS scopes the results.
 */
export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  // Results are stored with the term they answer, so "still loading" is derived
  // rather than set — no synchronous state updates inside the effect.
  const [answered, setAnswered] = React.useState<{ term: string; items: SearchResult[] }>({
    term: '',
    items: [],
  })
  const inputRef = React.useRef<HTMLInputElement>(null)

  const term = query.trim()
  const isSearchable = term.length >= 2
  const loading = isSearchable && answered.term !== term
  // Memoised so the grouping below does not recompute on unrelated renders.
  const results = React.useMemo(
    () => (answered.term === term ? answered.items : []),
    [answered, term],
  )

  // Cmd/Ctrl-K opens search from anywhere.
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  React.useEffect(() => {
    if (!isSearchable) return

    let cancelled = false
    const timer = window.setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase.rpc('global_search', { p_query: term, p_limit: 6 })
      // Record the term alongside its results even on failure, so a failed
      // lookup settles into "no matches" instead of spinning forever.
      if (!cancelled) setAnswered({ term, items: (data as SearchResult[] | null) ?? [] })
    }, 220)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [term, isSearchable])

  function go(result: SearchResult) {
    setOpen(false)
    setQuery('')
    router.push(`${KIND_PATH[result.kind]}/${result.id}`)
  }

  const grouped = React.useMemo(() => {
    const map = new Map<SearchResult['kind'], SearchResult[]>()
    for (const r of results) {
      const list = map.get(r.kind) ?? []
      list.push(r)
      map.set(r.kind, list)
    }
    return [...map.entries()]
  }, [results])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap flex items-center gap-2 rounded-xl border border-[var(--border-strong)] px-3 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)] lg:w-64 lg:justify-start"
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden lg:inline">Search…</span>
        <span className="sr-only lg:hidden">Search</span>
        <kbd className="ml-auto hidden rounded border border-[var(--border)] px-1.5 py-0.5 text-[0.625rem] lg:inline">
          ⌘K
        </kbd>
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Students, terms, classes, tricks and exercises"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sarah, shoulder, ayesha, September…"
            aria-label="Search"
            className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] py-2.5 pl-9 pr-9 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-4 min-h-24">
          {loading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted">
              <Spinner /> Searching…
            </p>
          ) : !isSearchable ? (
            <p className="py-6 text-center text-sm text-subtle">
              Type at least two characters. Partial matches work.
            </p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Nothing matched “{term}”.
            </p>
          ) : (
            <div className="space-y-4">
              {grouped.map(([kind, items]) => (
                <div key={kind}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-subtle">
                    {KIND_LABEL[kind]}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map((result) => (
                      <li key={`${result.kind}-${result.id}`}>
                        <button
                          type="button"
                          onClick={() => go(result)}
                          className={cn(
                            'tap flex w-full flex-col items-start justify-center rounded-xl px-3 py-2 text-left',
                            'hover:bg-[var(--surface-muted)] focus-visible:bg-[var(--surface-muted)]',
                          )}
                        >
                          <span className="text-sm font-medium">{result.title}</span>
                          {result.subtitle ? (
                            <span className="text-xs text-muted">{result.subtitle}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </Sheet>
    </>
  )
}
