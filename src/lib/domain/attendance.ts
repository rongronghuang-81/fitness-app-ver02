import type { AttendanceStatus } from '@/types/database'

/**
 * Attendance maths for the student profile (§8) and dashboards.
 *
 * "Late" counts as attended — the student was in the room. "Excused" is
 * excluded from the denominator entirely, so an instructor-cancelled absence
 * does not damage a student's attendance rate.
 */

export const ATTENDANCE_OPTIONS: {
  value: Exclude<AttendanceStatus, 'unmarked'>
  label: string
  tone: 'positive' | 'negative' | 'warning' | 'neutral'
}[] = [
  { value: 'present', label: 'Present', tone: 'positive' },
  { value: 'late', label: 'Late', tone: 'warning' },
  { value: 'absent', label: 'Absent', tone: 'negative' },
  { value: 'excused', label: 'Excused', tone: 'neutral' },
]

export const ATTENDED_STATUSES: AttendanceStatus[] = ['present', 'late']

export interface AttendanceSummary {
  total: number
  attended: number
  absent: number
  excused: number
  unmarked: number
  /** 0–100, rounded. Null when nothing countable has happened yet. */
  percentage: number | null
}

export function summariseAttendance(statuses: AttendanceStatus[]): AttendanceSummary {
  let attended = 0
  let absent = 0
  let excused = 0
  let unmarked = 0

  for (const status of statuses) {
    if (status === 'present' || status === 'late') attended += 1
    else if (status === 'absent') absent += 1
    else if (status === 'excused') excused += 1
    else unmarked += 1
  }

  const countable = attended + absent
  return {
    total: statuses.length,
    attended,
    absent,
    excused,
    unmarked,
    percentage: countable === 0 ? null : Math.round((attended / countable) * 100),
  }
}

export function attendanceLabel(status: AttendanceStatus): string {
  return ATTENDANCE_OPTIONS.find((o) => o.value === status)?.label ?? 'Not marked'
}
