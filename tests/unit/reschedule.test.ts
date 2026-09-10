import { describe, expect, it } from 'vitest'
import {
  planTermReschedule,
  type ReschedulableClass,
  type TermSchedule,
} from '@/lib/domain/schedule'

// Wednesdays at 19:00 from 9 Sep 2026: 9th, 16th, 23rd.
const WED_7PM: TermSchedule = {
  startDate: '2026-09-09',
  weekday: 3,
  startTime: '19:00',
  durationMinutes: 60,
}

function classes(...overrides: Partial<ReschedulableClass>[]): ReschedulableClass[] {
  const base = ['2026-09-09', '2026-09-16', '2026-09-23']
  return base.map((scheduledDate, i) => ({
    id: `week-${i + 1}`,
    weekNumber: i + 1,
    scheduledDate,
    startTime: '19:00:00',
    durationMinutes: 60,
    status: 'planned',
    completedAt: null,
    ...overrides[i],
  }))
}

describe('planTermReschedule', () => {
  it('does nothing when the slot has not changed', () => {
    expect(planTermReschedule(classes(), WED_7PM, { ...WED_7PM })).toEqual([])
  })

  it('moves every untouched class when the weekday changes', () => {
    const moves = planTermReschedule(classes(), WED_7PM, { ...WED_7PM, weekday: 4 })
    expect(moves.map((m) => m.scheduledDate)).toEqual([
      '2026-09-10',
      '2026-09-17',
      '2026-09-24',
    ])
  })

  it('moves the time without moving the date', () => {
    const moves = planTermReschedule(classes(), WED_7PM, { ...WED_7PM, startTime: '20:00' })
    expect(moves).toHaveLength(3)
    expect(moves.every((m) => m.startTime === '20:00')).toBe(true)
    expect(moves.map((m) => m.scheduledDate)).toEqual([
      '2026-09-09',
      '2026-09-16',
      '2026-09-23',
    ])
  })

  it('shifts the whole run when the start date moves', () => {
    const moves = planTermReschedule(classes(), WED_7PM, {
      ...WED_7PM,
      startDate: '2026-09-16',
    })
    expect(moves.map((m) => m.scheduledDate)).toEqual([
      '2026-09-16',
      '2026-09-23',
      '2026-09-30',
    ])
  })

  it('leaves a class that was already taught exactly where it is', () => {
    const moves = planTermReschedule(
      classes({ status: 'completed', completedAt: '2026-09-09T12:00:00Z' }),
      WED_7PM,
      { ...WED_7PM, weekday: 4 },
    )
    expect(moves.map((m) => m.id)).toEqual(['week-2', 'week-3'])
  })

  it('leaves a class the instructor rescheduled by hand', () => {
    const moves = planTermReschedule(
      classes({}, { scheduledDate: '2026-09-18', status: 'rescheduled' }),
      WED_7PM,
      { ...WED_7PM, weekday: 4 },
    )
    expect(moves.map((m) => m.id)).toEqual(['week-1', 'week-3'])
  })

  it('leaves a cancelled class alone', () => {
    const moves = planTermReschedule(
      classes({}, {}, { status: 'cancelled' }),
      WED_7PM,
      { ...WED_7PM, weekday: 4 },
    )
    expect(moves.map((m) => m.id)).toEqual(['week-1', 'week-2'])
  })

  it('leaves a class whose time was changed individually', () => {
    // Week 2 was moved to 20:00 for that week only.
    const moves = planTermReschedule(
      classes({}, { startTime: '20:00:00' }),
      WED_7PM,
      { ...WED_7PM, weekday: 4 },
    )
    expect(moves.map((m) => m.id)).toEqual(['week-1', 'week-3'])
  })

  it('leaves a class whose duration was changed individually', () => {
    const moves = planTermReschedule(
      classes({}, {}, { durationMinutes: 90 }),
      WED_7PM,
      { ...WED_7PM, weekday: 4 },
    )
    expect(moves.map((m) => m.id)).toEqual(['week-1', 'week-2'])
  })

  it('treats HH:mm and HH:mm:ss as the same slot', () => {
    // Postgres returns `19:00:00`; the form submits `19:00`.
    const moves = planTermReschedule(classes(), { ...WED_7PM, startTime: '19:00:00' }, WED_7PM)
    expect(moves).toEqual([])
  })

  it('carries a duration change onto the moved classes', () => {
    const moves = planTermReschedule(classes(), WED_7PM, { ...WED_7PM, durationMinutes: 90 })
    expect(moves.every((m) => m.durationMinutes === 90)).toBe(true)
  })
})
