'use client'

import * as React from 'react'
import { Archive, ArchiveRestore, Pencil, Star } from 'lucide-react'
import { setExerciseArchived, setTrickArchived, toggleFavorite } from '@/actions/library'
import { TrickForm } from './trick-form'
import { ExerciseForm } from './exercise-form'
import { Sheet, ConfirmDialog } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'
import type { Exercise, Trick } from '@/types/database'
import { cn } from '@/lib/utils'

/** Favourite / edit / archive controls shared by both detail pages. */
export function LibraryDetailHeader({
  kind,
  item,
  levels,
  categories,
  selectedLevelIds,
  selectedCategoryIds,
}: {
  kind: 'tricks' | 'exercises'
  item: (Trick | Exercise) & { id: string; name: string; is_favorite: boolean; active: boolean }
  levels: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  selectedLevelIds?: string[]
  selectedCategoryIds: string[]
}) {
  const { notify } = useToast()
  const [editOpen, setEditOpen] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function favourite() {
    startTransition(async () => {
      const result = await toggleFavorite(kind, item.id, !item.is_favorite)
      if (result.status === 'error') notify(result.message, 'error')
    })
  }

  function archive() {
    startTransition(async () => {
      const result =
        kind === 'tricks'
          ? await setTrickArchived(item.id, item.active)
          : await setExerciseArchived(item.id, item.active)
      const toast = toToast(result)
      if (toast) notify(toast.message, toast.tone)
      setConfirmOpen(false)
    })
  }

  return (
    <>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={favourite}
          disabled={pending}
          aria-pressed={item.is_favorite}
          aria-label={item.is_favorite ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Star
            className={cn(
              'size-4',
              item.is_favorite ? 'fill-[var(--warning)] text-[var(--warning)]' : '',
            )}
          />
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          aria-label={item.active ? 'Archive' : 'Restore'}
        >
          {item.active ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
        </Button>
      </div>

      <Sheet open={editOpen} onOpenChange={setEditOpen} title={`Edit ${item.name}`}>
        {kind === 'tricks' ? (
          <TrickForm
            trick={item as Trick}
            levels={levels}
            categories={categories}
            selectedLevelIds={selectedLevelIds ?? []}
            selectedCategoryIds={selectedCategoryIds}
            onDone={() => setEditOpen(false)}
          />
        ) : (
          <ExerciseForm
            exercise={item as Exercise}
            levels={levels}
            categories={categories}
            selectedCategoryIds={selectedCategoryIds}
            onDone={() => setEditOpen(false)}
          />
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={item.active ? `Archive ${item.name}?` : `Restore ${item.name}?`}
        description={
          item.active
            ? 'It will be hidden from pickers and lists. Lessons that already reference it keep working.'
            : 'It will appear in pickers and lists again.'
        }
        confirmLabel={item.active ? 'Archive' : 'Restore'}
        destructive={item.active}
        onConfirm={archive}
        pending={pending}
      />
    </>
  )
}
