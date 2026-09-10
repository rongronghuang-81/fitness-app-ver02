'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, X } from 'lucide-react'
import { linkExerciseToTrick, unlinkExerciseFromTrick } from '@/actions/library'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Field, Select } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'

/**
 * The trick ⇄ exercise link (§24), rendered from either side.
 *
 * On a trick page this reads "recommended preparation"; on an exercise page it
 * reads "useful for". Same rows, same actions.
 */
export function TrickExerciseLinks({
  side,
  trickId,
  exerciseId,
  links,
  options,
}: {
  side: 'trick' | 'exercise'
  trickId?: string
  exerciseId?: string
  links: { id: string; relationship: string; otherId: string; otherName: string; detail: string | null }[]
  options: { id: string; name: string }[]
}) {
  const { notify } = useToast()
  const [addOpen, setAddOpen] = React.useState(false)
  const [targetId, setTargetId] = React.useState('')
  const [relationship, setRelationship] = React.useState<'preparation' | 'conditioning' | 'support'>(
    'preparation',
  )
  const [pending, startTransition] = React.useTransition()

  const linkedIds = new Set(links.map((l) => l.otherId))
  const available = options.filter((o) => !linkedIds.has(o.id))

  function add() {
    if (!targetId) return
    startTransition(async () => {
      const result = await linkExerciseToTrick({
        trick_id: side === 'trick' ? trickId! : targetId,
        exercise_id: side === 'trick' ? targetId : exerciseId!,
        relationship,
      })
      const toast = toToast(result)
      if (toast) notify(toast.message, toast.tone)
      if (result.status === 'success') {
        setAddOpen(false)
        setTargetId('')
      }
    })
  }

  function remove(linkId: string, otherId: string) {
    startTransition(async () => {
      const result = await unlinkExerciseFromTrick(
        linkId,
        side === 'trick' ? trickId! : otherId,
        side === 'trick' ? otherId : exerciseId!,
      )
      const toast = toToast(result)
      if (toast) notify(toast.message, toast.tone)
    })
  }

  const heading = side === 'trick' ? 'Recommended preparation' : 'Tricks this supports'
  const hrefBase = side === 'trick' ? '/exercises' : '/tricks'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{heading}</h3>
        <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Link
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-muted">
          {side === 'trick'
            ? 'Link the conditioning that builds towards this trick.'
            : 'Link the tricks this exercise prepares for.'}
        </p>
      ) : (
        <ul className="space-y-1">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2"
            >
              <Link href={`${hrefBase}/${link.otherId}`} className="min-w-0 flex-1 hover:underline">
                <span className="block truncate text-sm font-medium">{link.otherName}</span>
                {link.detail ? (
                  <span className="block text-xs text-muted">{link.detail}</span>
                ) : null}
              </Link>
              <span className="shrink-0 text-xs text-subtle">{link.relationship}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(link.id, link.otherId)}
                aria-label={`Unlink ${link.otherName}`}
                className="tap flex shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--negative)] disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={addOpen}
        onOpenChange={setAddOpen}
        title={side === 'trick' ? 'Link an exercise' : 'Link a trick'}
      >
        <div className="space-y-4">
          <Field label={side === 'trick' ? 'Exercise' : 'Trick'} htmlFor="link-target">
            <Select id="link-target" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Choose…</option>
              {available.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Type" htmlFor="link-rel">
            <Select
              id="link-rel"
              value={relationship}
              onChange={(e) =>
                setRelationship(e.target.value as 'preparation' | 'conditioning' | 'support')
              }
            >
              <option value="preparation">Preparation</option>
              <option value="conditioning">Conditioning</option>
              <option value="support">Supporting work</option>
            </Select>
          </Field>

          <Button loading={pending} disabled={!targetId} onClick={add}>
            Add link
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
