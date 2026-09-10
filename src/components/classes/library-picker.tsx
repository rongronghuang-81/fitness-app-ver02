'use client'

import * as React from 'react'
import { Plus, Search, Star } from 'lucide-react'
import { quickCreateExercise, quickCreateTrick } from '@/actions/library'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'

export interface LibraryOption {
  id: string
  name: string
  is_favorite: boolean
}

/**
 * Search-select-add picker for tricks and exercises (§35).
 *
 * The instructor never has to leave the lesson to reach the library, and if the
 * thing they are looking for does not exist, it can be created inline from the
 * text they already typed.
 */
export function LibraryPicker({
  open,
  onOpenChange,
  kind,
  options,
  onPick,
  title,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: 'trick' | 'exercise'
  options: LibraryOption[]
  onPick: (option: { id: string; name: string }) => void
  title?: string
}) {
  const { notify } = useToast()
  const [query, setQuery] = React.useState('')
  const [creating, startCreate] = React.useTransition()

  const q = query.trim().toLowerCase()
  const filtered = React.useMemo(() => {
    const matches = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options
    // Favourites first, then alphabetical (§34).
    return [...matches].sort(
      (a, b) => Number(b.is_favorite) - Number(a.is_favorite) || a.name.localeCompare(b.name),
    )
  }, [options, q])

  const exactMatch = filtered.some((o) => o.name.toLowerCase() === q)

  function createInline() {
    const name = query.trim()
    if (!name) return
    startCreate(async () => {
      const result = kind === 'trick' ? await quickCreateTrick(name) : await quickCreateExercise(name)
      const toast = toToast(result)
      if (toast) notify(toast.message, toast.tone)
      if (result.status === 'success' && result.id) {
        onPick({ id: result.id, name })
        setQuery('')
        onOpenChange(false)
      }
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery('')
        onOpenChange(next)
      }}
      title={title ?? (kind === 'trick' ? 'Add a trick' : 'Add an exercise')}
      description="Search your library, or create it from what you type."
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={kind === 'trick' ? 'ayesha, shoulder…' : 'scap, hollow…'}
          aria-label={kind === 'trick' ? 'Search tricks' : 'Search exercises'}
          className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] py-2.5 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
      </div>

      <ul className="mt-3 space-y-0.5">
        {filtered.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => {
                onPick(option)
                setQuery('')
                onOpenChange(false)
              }}
              className="tap flex w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-medium hover:bg-[var(--surface-muted)]"
            >
              {option.is_favorite ? (
                <Star
                  className="size-3.5 shrink-0 fill-[var(--warning)] text-[var(--warning)]"
                  aria-label="Favourite"
                />
              ) : null}
              <span className="min-w-0 truncate">{option.name}</span>
            </button>
          </li>
        ))}
      </ul>

      {q && !exactMatch ? (
        <Button
          variant="secondary"
          className="mt-3 w-full justify-center"
          loading={creating}
          onClick={createInline}
        >
          <Plus className="size-4" />
          Create “{query.trim()}”
        </Button>
      ) : null}

      {filtered.length === 0 && !q ? (
        <p className="py-6 text-center text-sm text-muted">
          Your {kind} library is empty. Type a name above to create the first one.
        </p>
      ) : null}
    </Sheet>
  )
}
