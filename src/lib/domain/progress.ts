import type { SkillStatusCode } from '@/types/database'

/**
 * Skill-progression presentation. The list of statuses lives in the
 * `skill_statuses` table so it can grow; these are the display defaults for the
 * five shipped statuses, with a safe fallback for any added later.
 */

export const SKILL_STATUS_ORDER: SkillStatusCode[] = [
  'not_started',
  'introduced',
  'practising',
  'achieved',
  'consistent',
]

export const SKILL_STATUS_META: Record<
  string,
  { label: string; tone: 'neutral' | 'info' | 'warning' | 'positive' | 'accent'; short: string }
> = {
  not_started: { label: 'Not started', tone: 'neutral', short: '—' },
  introduced: { label: 'Introduced', tone: 'info', short: 'Intro' },
  practising: { label: 'Practising', tone: 'warning', short: 'Practising' },
  achieved: { label: 'Achieved', tone: 'positive', short: 'Achieved' },
  consistent: { label: 'Consistent', tone: 'accent', short: 'Consistent' },
}

export function skillStatusMeta(code: string) {
  return (
    SKILL_STATUS_META[code] ?? {
      label: code.replace(/_/g, ' '),
      tone: 'neutral' as const,
      short: code,
    }
  )
}

/** Rank of a status, for "has the student got at least this far?" checks. */
export function statusRank(code: string): number {
  const index = SKILL_STATUS_ORDER.indexOf(code as SkillStatusCode)
  return index === -1 ? 0 : index
}

export function hasAchieved(code: string): boolean {
  return statusRank(code) >= statusRank('achieved')
}

/** Progress bar value for a student's whole skill list. */
export function progressBreakdown(statuses: string[]) {
  const counts = { introduced: 0, practising: 0, achieved: 0, consistent: 0 }
  for (const s of statuses) {
    if (s === 'introduced') counts.introduced += 1
    else if (s === 'practising') counts.practising += 1
    else if (s === 'achieved') counts.achieved += 1
    else if (s === 'consistent') counts.consistent += 1
  }
  const tracked = counts.introduced + counts.practising + counts.achieved + counts.consistent
  const landed = counts.achieved + counts.consistent
  return {
    ...counts,
    tracked,
    landed,
    percentage: tracked === 0 ? null : Math.round((landed / tracked) * 100),
  }
}

/** Days since a date string, or null. Drives "no update in a while" nudges. */
export function daysSince(iso: string | null, today = new Date()): number | null {
  if (!iso) return null
  const then = new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime()
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return Math.floor((now - then) / 86_400_000)
}
