'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, TrendingUp } from 'lucide-react'
import { setSkillStatus } from '@/actions/progress'
import { SKILL_STATUS_ORDER, skillStatusMeta } from '@/lib/domain/progress'
import { formatDateShort } from '@/lib/domain/format'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'
import { DetailRow } from '@/components/ui/page'
import type { SkillStatus } from '@/types/database'

export interface ProgressRow {
  id: string
  status: string
  introduced_date: string | null
  first_attempted_date: string | null
  first_achieved_date: string | null
  consistent_date: string | null
  last_practised_date: string | null
  instructor_notes: string | null
  updated_at: string
  tricks: { id: string; name: string; difficulty: number | null } | null
}

/** A student's skill progression (§8 Progress, §25). */
export function SkillProgressList({
  studentId,
  rows,
  allTricks,
  statuses,
}: {
  studentId: string
  rows: ProgressRow[]
  allTricks: { id: string; name: string }[]
  statuses: SkillStatus[]
}) {
  const { notify } = useToast()
  const [detail, setDetail] = React.useState<ProgressRow | null>(null)
  const [addOpen, setAddOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  const statusList = statuses.length > 0
    ? [...statuses].sort((a, b) => a.sort_order - b.sort_order)
    : SKILL_STATUS_ORDER.map((code, i) => ({
        code,
        label: skillStatusMeta(code).label,
        description: null,
        sort_order: i,
        is_achieved: i >= 3,
      }))

  const tracked = new Set(rows.map((r) => r.tricks?.id).filter(Boolean))
  const untracked = allTricks.filter((t) => !tracked.has(t.id))

  function update(trickId: string, status: string) {
    startTransition(async () => {
      const result = await setSkillStatus({ student_id: studentId, trick_id: trickId, status })
      const toast = toToast(result, 'Progress updated.')
      if (toast) notify(toast.message, toast.tone)
      if (result.status === 'success') {
        setAddOpen(false)
        setDetail(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Track a trick
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No skills tracked yet"
          description="Track a trick to record when it was introduced, practised and achieved."
          action={<Button onClick={() => setAddOpen(true)}>Track a trick</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const meta = skillStatusMeta(row.status)
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setDetail(row)}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-[var(--shadow-card)] hover:border-[var(--border-strong)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {row.tricks?.name ?? 'Trick'}
                    </span>
                    <span className="block text-xs text-muted">
                      {row.last_practised_date
                        ? `Last practised ${formatDateShort(row.last_practised_date)}`
                        : 'Not practised yet'}
                    </span>
                  </span>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Detail: the full date history for one trick. */}
      <Sheet
        open={detail !== null}
        onOpenChange={(open) => !open && setDetail(null)}
        title={detail?.tricks?.name ?? 'Skill'}
        description="Tap a status to update it. Dates are recorded automatically."
      >
        {detail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {statusList.map((status) => {
                const meta = skillStatusMeta(status.code)
                const active = detail.status === status.code
                return (
                  <button
                    key={status.code}
                    type="button"
                    disabled={pending}
                    onClick={() => detail.tricks && update(detail.tricks.id, status.code)}
                    aria-pressed={active}
                    className={`tap rounded-xl border px-3 text-sm font-medium disabled:opacity-50 ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border-strong)] hover:bg-[var(--surface-muted)]'
                    }`}
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>

            <dl className="divide-y divide-[var(--border)]">
              <DetailRow label="Introduced">{formatDateShort(detail.introduced_date)}</DetailRow>
              <DetailRow label="First tried">
                {formatDateShort(detail.first_attempted_date)}
              </DetailRow>
              <DetailRow label="Achieved">{formatDateShort(detail.first_achieved_date)}</DetailRow>
              <DetailRow label="Consistent">{formatDateShort(detail.consistent_date)}</DetailRow>
              <DetailRow label="Last practised">
                {formatDateShort(detail.last_practised_date)}
              </DetailRow>
            </dl>

            {detail.instructor_notes ? (
              <p className="whitespace-pre-wrap rounded-xl bg-[var(--surface-muted)] p-3 text-sm">
                {detail.instructor_notes}
              </p>
            ) : null}

            {detail.tricks ? (
              <Link
                href={`/tricks/${detail.tricks.id}`}
                className="inline-block text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Open trick →
              </Link>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      {/* Add: pick a trick, set its starting status. */}
      <Sheet
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Track a trick"
        description="Choose a trick to start recording progress on."
      >
        {untracked.length === 0 ? (
          <p className="text-sm text-muted">
            Every trick in your library is already tracked for this student.
          </p>
        ) : (
          <ul className="space-y-1">
            {untracked.map((trick) => (
              <li key={trick.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => update(trick.id, 'introduced')}
                  className="tap flex w-full items-center justify-between rounded-xl px-3 text-left text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
                >
                  {trick.name}
                  <span className="text-xs text-subtle">Mark introduced</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  )
}
