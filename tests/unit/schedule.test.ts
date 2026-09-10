import { describe, expect, it } from 'vitest'
import {
  addDays,
  endTime,
  firstClassDate,
  formatTime,
  generateClassDates,
  termEndDate,
  weekdayOf,
} from '@/lib/domain/schedule'

describe('generateClassDates', () => {
  it('reproduces the worked example from the brief', () => {
    // 6-week term starting Wednesday 9 September 2026.
    const dates = generateClassDates('2026-09-09', 3, 6).map((c) => c.date)
    expect(dates).toEqual([
      '2026-09-09',
      '2026-09-16',
      '2026-09-23',
      '2026-09-30',
      '2026-10-07',
      '2026-10-14',
    ])
  })

  it('numbers the weeks from 1', () => {
    const generated = generateClassDates('2026-09-09', 3, 4)
    expect(generated.map((c) => c.weekNumber)).toEqual([1, 2, 3, 4])
  })

  it('supports the 4, 6 and 8 week presets', () => {
    for (const weeks of [4, 6, 8]) {
      expect(generateClassDates('2026-01-05', 1, weeks)).toHaveLength(weeks)
    }
  })

  it('supports a custom number of weeks', () => {
    expect(generateClassDates('2026-01-05', 1, 12)).toHaveLength(12)
  })

  it('rolls forward when the start date is not on the class weekday', () => {
    // 7 Sep 2026 is a Monday; the first Wednesday class is the 9th.
    expect(generateClassDates('2026-09-07', 3, 2).map((c) => c.date)).toEqual([
      '2026-09-09',
      '2026-09-16',
    ])
  })

  it('treats a start date already on the weekday as week 1', () => {
    expect(firstClassDate('2026-09-09', 3)).toBe('2026-09-09')
  })

  it('rolls forward a full week when the weekday is the day before', () => {
    // 10 Sep 2026 is a Thursday; the next Wednesday is the 16th.
    expect(firstClassDate('2026-09-10', 3)).toBe('2026-09-16')
  })

  it('keeps every class on the same weekday', () => {
    const dates = generateClassDates('2026-02-24', 2, 8)
    expect(dates.every((c) => weekdayOf(c.date) === 2)).toBe(true)
  })

  it('crosses month, year and leap-day boundaries correctly', () => {
    // Thursdays from 24 Dec 2026 into 2027.
    expect(generateClassDates('2026-12-24', 4, 3).map((c) => c.date)).toEqual([
      '2026-12-24',
      '2026-12-31',
      '2027-01-07',
    ])
    // 2028 is a leap year: 24 Feb + 7 days = 2 Mar via 29 Feb.
    expect(addDays('2028-02-24', 7)).toBe('2028-03-02')
  })

  it('rejects an out-of-range week count', () => {
    expect(() => generateClassDates('2026-09-09', 3, 0)).toThrow()
    expect(() => generateClassDates('2026-09-09', 3, 53)).toThrow()
  })

  it('reports the last class date of a term', () => {
    expect(termEndDate('2026-09-09', 3, 6)).toBe('2026-10-14')
  })
})

describe('time formatting', () => {
  it('formats 24-hour times for display', () => {
    expect(formatTime('19:00')).toBe('7:00 PM')
    expect(formatTime('19:00:00')).toBe('7:00 PM')
    expect(formatTime('09:30')).toBe('9:30 AM')
    expect(formatTime('00:15')).toBe('12:15 AM')
    expect(formatTime('12:00')).toBe('12:00 PM')
  })

  it('derives the end time from a duration', () => {
    expect(endTime('19:00', 60)).toBe('8:00 PM')
    expect(endTime('19:30', 90)).toBe('9:00 PM')
    expect(endTime('23:30', 60)).toBe('12:30 AM')
  })
})
