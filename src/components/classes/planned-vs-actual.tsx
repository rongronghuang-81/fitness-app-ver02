'use client'

import { ArrowRight, Minus, Plus } from 'lucide-react'
import { diffLessons, itemKey, SECTION_LABELS } from '@/lib/domain/lesson'
import type { LessonItem } from '@/types/database'

/**
 * The planned-versus-actual summary (§14).
 *
 * The point of storing both is being able to see, weeks later, that Janeiro was
 * planned and postponed — not just that it never happened.
 */
export function PlannedVsActual({
  plannedItems,
  actualItems,
  trickNames,
  exerciseNames,
}: {
  plannedItems: LessonItem[]
  actualItems: LessonItem[]
  trickNames: Map<string, string>
  exerciseNames: Map<string, string>
}) {
  function label(item: LessonItem): string {
    const base = item.trick_id
      ? (trickNames.get(item.trick_id) ?? 'Trick')
      : item.exercise_id
        ? (exerciseNames.get(item.exercise_id) ?? 'Exercise')
        : (item.free_text ?? 'Item')
    return `${base} · ${SECTION_LABELS[item.section]}`
  }

  const diff = diffLessons(
    plannedItems.map((i) => ({ key: itemKey(i), label: label(i) })),
    actualItems.map((i) => ({ key: itemKey(i), label: label(i) })),
  )

  if (actualItems.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] p-6 text-center text-sm text-muted">
        Nothing recorded yet. Complete the class to capture what actually happened — the plan above
        is never overwritten.
      </p>
    )
  }

  const unchanged = diff.dropped.length === 0 && diff.added.length === 0

  return (
    <div className="space-y-4">
      {unchanged ? (
        <p className="rounded-xl bg-[var(--positive-soft)] px-3 py-2.5 text-sm text-[var(--positive)]">
          The class ran exactly to plan.
        </p>
      ) : null}

      {diff.asPlanned.length > 0 ? (
        <DiffGroup
          icon={ArrowRight}
          tone="var(--text-muted)"
          title="Taught as planned"
          items={diff.asPlanned}
        />
      ) : null}

      {diff.added.length > 0 ? (
        <DiffGroup icon={Plus} tone="var(--positive)" title="Added on the day" items={diff.added} />
      ) : null}

      {diff.dropped.length > 0 ? (
        <DiffGroup
          icon={Minus}
          tone="var(--warning)"
          title="Planned but not taught"
          items={diff.dropped}
        />
      ) : null}
    </div>
  )
}

function DiffGroup({
  icon: Icon,
  tone,
  title,
  items,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  tone: string
  title: string
  items: string[]
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: tone }}>
        {title}
      </h4>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <Icon className="mt-0.5 size-3.5 shrink-0" style={{ color: tone }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
