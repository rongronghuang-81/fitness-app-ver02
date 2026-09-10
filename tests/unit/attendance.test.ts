import { describe, expect, it } from 'vitest'
import { summariseAttendance } from '@/lib/domain/attendance'
import type { AttendanceStatus } from '@/types/database'

const s = (...v: AttendanceStatus[]) => v

describe('summariseAttendance', () => {
  it('counts present and late as attended', () => {
    const result = summariseAttendance(s('present', 'late', 'absent'))
    expect(result.attended).toBe(2)
    expect(result.absent).toBe(1)
    expect(result.percentage).toBe(67)
  })

  it('excludes excused absences from the percentage', () => {
    // 3 present, 1 excused → 100%, not 75%.
    const result = summariseAttendance(s('present', 'present', 'present', 'excused'))
    expect(result.excused).toBe(1)
    expect(result.percentage).toBe(100)
  })

  it('excludes classes that have not been marked yet', () => {
    const result = summariseAttendance(s('present', 'unmarked', 'unmarked'))
    expect(result.unmarked).toBe(2)
    expect(result.percentage).toBe(100)
  })

  it('returns null rather than 0% when nothing is countable', () => {
    expect(summariseAttendance(s('unmarked', 'excused')).percentage).toBeNull()
    expect(summariseAttendance([]).percentage).toBeNull()
  })

  it('reports the full class count regardless of status', () => {
    expect(summariseAttendance(s('present', 'absent', 'excused', 'unmarked')).total).toBe(4)
  })
})
