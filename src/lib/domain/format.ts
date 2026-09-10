import type { Student } from '@/types/database'

/** The name the instructor actually uses — mirrors student_display_name() in SQL. */
export function studentName(
  student: Pick<Student, 'first_name' | 'last_name' | 'preferred_name'>,
): string {
  const first = student.preferred_name?.trim() || student.first_name
  const last = student.last_name?.trim()
  return last ? `${first} ${last}` : first
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

const DATE_FMT = new Intl.DateTimeFormat('en-SG', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const DATE_SHORT_FMT = new Intl.DateTimeFormat('en-SG', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const MONTH_FMT = new Intl.DateTimeFormat('en-SG', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** `2026-09-09` → `Wed, 9 Sep 2026`. Formatted in UTC so the day never shifts. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return DATE_FMT.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  return DATE_SHORT_FMT.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))
}

export function formatMonth(iso: string): string {
  return MONTH_FMT.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))
}

/** Relative wording the instructor reads at a glance. */
export function relativeDay(iso: string, today = todayISO()): string {
  if (iso === today) return 'Today'
  const diff = Math.round(
    (new Date(`${iso}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) /
      86_400_000,
  )
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff < 7) return `In ${diff} days`
  if (diff < -1 && diff > -7) return `${Math.abs(diff)} days ago`
  return formatDate(iso)
}

/** Today in Singapore, as `yyyy-MM-dd`. */
export function todayISO(timeZone = 'Asia/Singapore'): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(new Date())
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
