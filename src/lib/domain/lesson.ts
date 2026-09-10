import type { LessonItem, LessonSection } from '@/types/database'

/** The lesson-plan sections, in teaching order (§13). */
export const LESSON_SECTIONS: {
  id: LessonSection
  label: string
  /** What can be added here: library exercises, library tricks, or free text. */
  accepts: 'exercise' | 'trick' | 'either'
  hint: string
}[] = [
  { id: 'warmup', label: 'Warm-up', accepts: 'exercise', hint: 'Mobilise and raise the heart rate' },
  { id: 'conditioning', label: 'Conditioning', accepts: 'exercise', hint: 'Strength work for today’s skills' },
  { id: 'preparation', label: 'Preparation', accepts: 'either', hint: 'Drills that build toward the trick' },
  { id: 'tricks', label: 'Tricks & skills', accepts: 'trick', hint: 'The skills being taught' },
  { id: 'combinations', label: 'Combinations', accepts: 'either', hint: 'Linking skills into sequences' },
  { id: 'cooldown', label: 'Cooldown', accepts: 'exercise', hint: 'Stretch and decompress' },
]

export const SECTION_LABELS: Record<LessonSection, string> = LESSON_SECTIONS.reduce(
  (acc, s) => ({ ...acc, [s.id]: s.label }),
  {} as Record<LessonSection, string>,
)

export type ItemsBySection = Record<LessonSection, LessonItem[]>

export function emptyItemsBySection(): ItemsBySection {
  return {
    warmup: [],
    conditioning: [],
    preparation: [],
    tricks: [],
    combinations: [],
    cooldown: [],
  }
}

export function groupBySection(items: LessonItem[]): ItemsBySection {
  const grouped = emptyItemsBySection()
  for (const item of items) {
    grouped[item.section]?.push(item)
  }
  for (const key of Object.keys(grouped) as LessonSection[]) {
    grouped[key].sort((a, b) => a.position - b.position)
  }
  return grouped
}

export function lessonIsEmpty(items: LessonItem[]): boolean {
  return items.length === 0
}

/**
 * Human summary of a lesson item: the linked library name, or the free text.
 * The caller supplies the resolved names because the item only stores ids.
 */
export function describeItem(
  item: Pick<LessonItem, 'trick_id' | 'exercise_id' | 'free_text' | 'sets' | 'reps' | 'duration_seconds'>,
  names: { trick?: string | null; exercise?: string | null },
): string {
  const base =
    (item.trick_id ? names.trick : item.exercise_id ? names.exercise : null) ??
    item.free_text ??
    'Untitled item'

  const detail: string[] = []
  if (item.sets && item.reps) detail.push(`${item.sets} × ${item.reps}`)
  else if (item.sets) detail.push(`${item.sets} sets`)
  else if (item.reps) detail.push(item.reps)
  if (item.duration_seconds) detail.push(formatDuration(item.duration_seconds))

  return detail.length > 0 ? `${base} · ${detail.join(' · ')}` : base
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const rem = seconds % 60
  return rem === 0 ? `${mins} min` : `${mins}m ${rem}s`
}

/**
 * Diff a planned lesson against what was actually taught, for the
 * "planned vs actual" view (§14). Comparison is by linked library id, falling
 * back to normalised free text.
 */
export interface LessonDiff {
  asPlanned: string[]
  added: string[]
  dropped: string[]
}

export function diffLessons(
  planned: { key: string; label: string }[],
  actual: { key: string; label: string }[],
): LessonDiff {
  const plannedKeys = new Set(planned.map((i) => i.key))
  const actualKeys = new Set(actual.map((i) => i.key))

  return {
    asPlanned: planned.filter((i) => actualKeys.has(i.key)).map((i) => i.label),
    dropped: planned.filter((i) => !actualKeys.has(i.key)).map((i) => i.label),
    added: actual.filter((i) => !plannedKeys.has(i.key)).map((i) => i.label),
  }
}

/** Stable comparison key for diffing: library id if linked, else the text. */
export function itemKey(
  item: Pick<LessonItem, 'trick_id' | 'exercise_id' | 'free_text'>,
): string {
  if (item.trick_id) return `trick:${item.trick_id}`
  if (item.exercise_id) return `exercise:${item.exercise_id}`
  return `text:${(item.free_text ?? '').trim().toLowerCase()}`
}
