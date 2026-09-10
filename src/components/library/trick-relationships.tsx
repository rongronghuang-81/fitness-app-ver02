'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, X } from 'lucide-react'
import { addTrickRelationship, removeTrickRelationship } from '@/actions/library'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Field, Select } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'

type RelType = 'prerequisite' | 'progression' | 'regression' | 'related'

export interface RelationshipRow {
  id: string
  relationship_type: RelType
  notes: string | null
  from_trick_id: string
  to_trick_id: string
  from_trick: { id: string; name: string } | null
  to_trick: { id: string; name: string } | null
}

/**
 * Trick relationships (§21).
 *
 * Edges are directed and read "this trick HAS relationship_type that trick", so
 * a prerequisite recorded on Ayesha also shows up on Invert as "leads to".
 * `related` is symmetric and mirrored by a database trigger.
 */
const GROUPS: { type: RelType; forward: string; inverse: string }[] = [
  { type: 'prerequisite', forward: 'Prerequisites', inverse: 'Prerequisite for' },
  { type: 'progression', forward: 'Progressions', inverse: 'Progresses from' },
  { type: 'regression', forward: 'Regressions', inverse: 'Regression for' },
  { type: 'related', forward: 'Related', inverse: 'Related' },
]

export function TrickRelationships({
  trickId,
  relationships,
  allTricks,
}: {
  trickId: string
  relationships: RelationshipRow[]
  allTricks: { id: string; name: string }[]
}) {
  const { notify } = useToast()
  const [addOpen, setAddOpen] = React.useState(false)
  const [type, setType] = React.useState<RelType>('prerequisite')
  const [targetId, setTargetId] = React.useState('')
  const [pending, startTransition] = React.useTransition()

  const options = allTricks.filter((t) => t.id !== trickId)

  function add() {
    if (!targetId) return
    startTransition(async () => {
      const result = await addTrickRelationship({
        from_trick_id: trickId,
        to_trick_id: targetId,
        relationship_type: type,
      })
      const toast = toToast(result)
      if (toast) notify(toast.message, toast.tone)
      if (result.status === 'success') {
        setAddOpen(false)
        setTargetId('')
      }
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeTrickRelationship(id, trickId)
      const toast = toToast(result)
      if (toast) notify(toast.message, toast.tone)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Related tricks</h3>
        <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Link
        </Button>
      </div>

      {relationships.length === 0 ? (
        <p className="text-sm text-muted">
          No links yet. Record prerequisites and progressions so you can see the path to a skill.
        </p>
      ) : (
        GROUPS.map((group) => {
          const forward = relationships.filter(
            (r) => r.relationship_type === group.type && r.from_trick_id === trickId,
          )
          // `related` is mirrored, so showing the inverse too would duplicate it.
          const inverse =
            group.type === 'related'
              ? []
              : relationships.filter(
                  (r) => r.relationship_type === group.type && r.to_trick_id === trickId,
                )

          if (forward.length === 0 && inverse.length === 0) return null

          return (
            <div key={group.type} className="space-y-2">
              {forward.length > 0 ? (
                <RelGroup
                  title={group.forward}
                  rows={forward.map((r) => ({
                    id: r.id,
                    trick: r.to_trick,
                    removable: true,
                  }))}
                  onRemove={remove}
                  pending={pending}
                />
              ) : null}
              {inverse.length > 0 ? (
                <RelGroup
                  title={group.inverse}
                  rows={inverse.map((r) => ({
                    id: r.id,
                    trick: r.from_trick,
                    // Owned by the other trick's page — edit it there.
                    removable: false,
                  }))}
                  onRemove={remove}
                  pending={pending}
                />
              ) : null}
            </div>
          )
        })
      )}

      <Sheet open={addOpen} onOpenChange={setAddOpen} title="Link a trick">
        <div className="space-y-4">
          <Field label="Relationship" htmlFor="rel-type">
            <Select
              id="rel-type"
              value={type}
              onChange={(e) => setType(e.target.value as RelType)}
            >
              <option value="prerequisite">Needs first (prerequisite)</option>
              <option value="progression">Leads to (progression)</option>
              <option value="regression">Easier version (regression)</option>
              <option value="related">Related</option>
            </Select>
          </Field>

          <Field label="Trick" htmlFor="rel-target">
            <Select id="rel-target" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Choose a trick…</option>
              {options.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
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

function RelGroup({
  title,
  rows,
  onRemove,
  pending,
}: {
  title: string
  rows: { id: string; trick: { id: string; name: string } | null; removable: boolean }[]
  onRemove: (id: string) => void
  pending: boolean
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-subtle">{title}</h4>
      <ul className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2"
          >
            <Link
              href={row.trick ? `/tricks/${row.trick.id}` : '#'}
              className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
            >
              {row.trick?.name ?? 'Trick'}
            </Link>
            {row.removable ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => onRemove(row.id)}
                aria-label={`Remove link to ${row.trick?.name ?? 'trick'}`}
                className="tap flex shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--negative)] disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
