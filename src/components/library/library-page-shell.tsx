'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { LibraryList, type LibraryRow } from './library-list'
import { TrickForm } from './trick-form'
import { ExerciseForm } from './exercise-form'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page'

/** Shared page shell for both libraries: header, add sheet, filtered list. */
export function LibraryPageShell({
  kind,
  rows,
  levels,
  categories,
  openNew,
}: {
  kind: 'tricks' | 'exercises'
  rows: LibraryRow[]
  levels: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  openNew: boolean
}) {
  const [addOpen, setAddOpen] = React.useState(openNew)
  const isTricks = kind === 'tricks'

  return (
    <>
      <PageHeader
        title={isTricks ? 'Tricks' : 'Exercises'}
        description={
          isTricks
            ? 'Your master skill library, with prerequisites and progressions.'
            : 'Conditioning and preparation work you can drop into any lesson.'
        }
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">{isTricks ? 'Add trick' : 'Add exercise'}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        }
      />

      <LibraryList
        rows={rows}
        kind={kind}
        levels={levels}
        categories={categories}
        onAdd={() => setAddOpen(true)}
        emptyTitle={isTricks ? 'Build your trick library' : 'Add your first conditioning exercise'}
        emptyDescription={
          isTricks
            ? 'Add the skills you teach so you can plan lessons and track who has landed what.'
            : 'Add the drills and conditioning you use, then link them to the tricks they prepare for.'
        }
      />

      <Sheet
        open={addOpen}
        onOpenChange={setAddOpen}
        title={isTricks ? 'Add a trick' : 'Add an exercise'}
        description="A name is enough to start — you can fill in the detail later."
      >
        {isTricks ? (
          <TrickForm levels={levels} categories={categories} onDone={() => setAddOpen(false)} />
        ) : (
          <ExerciseForm levels={levels} categories={categories} onDone={() => setAddOpen(false)} />
        )}
      </Sheet>
    </>
  )
}
