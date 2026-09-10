/**
 * Weekly term scheduling.
 *
 * Pure date arithmetic on `yyyy-MM-dd` strings — no Date-object timezone
 * surprises. The database function `generate_term_classes` implements the same
 * rule; these helpers let the UI preview the dates before anything is saved.
 */

export const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface GeneratedClass {
  weekNumber: number
  date: string
}

/** Parses `yyyy-MM-dd` into a UTC-midnight Date, avoiding local-timezone drift. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) throw new Error(`Invalid date: ${iso}`)
  return new Date(Date.UTC(y, m - 1, d))
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toISODate(d)
}

/** Day of week for an ISO date, 0 = Sunday. */
export function weekdayOf(iso: string): WeekdayIndex {
  return parseISODate(iso).getUTCDay() as WeekdayIndex
}

/**
 * The first occurrence of `weekday` on or after `startDate`.
 * If startDate already falls on that weekday, startDate itself is week 1.
 */
export function firstClassDate(startDate: string, weekday: WeekdayIndex): string {
  const offset = (weekday - weekdayOf(startDate) + 7) % 7
  return addDays(startDate, offset)
}

/**
 * The full set of weekly class dates for a term.
 *
 * A 6-week term starting Wednesday 9 Sep 2026 yields
 * 9 Sep, 16 Sep, 23 Sep, 30 Sep, 7 Oct, 14 Oct.
 */
export function generateClassDates(
  startDate: string,
  weekday: WeekdayIndex,
  numberOfWeeks: number,
): GeneratedClass[] {
  if (numberOfWeeks < 1 || numberOfWeeks > 52) {
    throw new Error('A term must run for between 1 and 52 weeks.')
  }
  const first = firstClassDate(startDate, weekday)
  return Array.from({ length: numberOfWeeks }, (_, i) => ({
    weekNumber: i + 1,
    date: addDays(first, i * 7),
  }))
}

/** Last scheduled date of a term, for "term ends" summaries. */
export function termEndDate(
  startDate: string,
  weekday: WeekdayIndex,
  numberOfWeeks: number,
): string {
  const dates = generateClassDates(startDate, weekday, numberOfWeeks)
  return dates[dates.length - 1]?.date ?? startDate
}

/** `19:00:00` → `7:00 PM`. Accepts `HH:mm` or `HH:mm:ss`. */
export function formatTime(time: string): string {
  const [hRaw, mRaw] = time.split(':')
  const h = Number(hRaw)
  const m = mRaw ?? '00'
  if (Number.isNaN(h)) return time
  const suffix = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${m} ${suffix}`
}

/** `19:00` + 60 → `8:00 PM`. Used for "7:00 – 8:00 PM" class headers. */
export function endTime(startTime: string, durationMinutes: number): string {
  const [hRaw, mRaw] = startTime.split(':')
  const total = (Number(hRaw) || 0) * 60 + (Number(mRaw) || 0) + durationMinutes
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return formatTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
}
