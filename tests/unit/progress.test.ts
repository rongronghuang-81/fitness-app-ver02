import { describe, expect, it } from 'vitest'
import {
  daysSince,
  hasAchieved,
  progressBreakdown,
  skillStatusMeta,
  statusRank,
} from '@/lib/domain/progress'

describe('skill status ordering', () => {
  it('ranks the shipped statuses in progression order', () => {
    expect(statusRank('not_started')).toBeLessThan(statusRank('introduced'))
    expect(statusRank('introduced')).toBeLessThan(statusRank('practising'))
    expect(statusRank('practising')).toBeLessThan(statusRank('achieved'))
    expect(statusRank('achieved')).toBeLessThan(statusRank('consistent'))
  })

  it('treats achieved and consistent as landed', () => {
    expect(hasAchieved('achieved')).toBe(true)
    expect(hasAchieved('consistent')).toBe(true)
    expect(hasAchieved('practising')).toBe(false)
  })

  it('degrades gracefully for a status added later in the database', () => {
    // The status list is a table, not an enum, so the UI must not crash on a
    // code it has never seen.
    const meta = skillStatusMeta('competition_ready')
    expect(meta.label).toBe('competition ready')
    expect(meta.tone).toBe('neutral')
  })
})

describe('progressBreakdown', () => {
  it('counts landed skills against tracked skills', () => {
    const result = progressBreakdown([
      'introduced',
      'practising',
      'achieved',
      'consistent',
    ])
    expect(result.tracked).toBe(4)
    expect(result.landed).toBe(2)
    expect(result.percentage).toBe(50)
  })

  it('ignores skills that have not been started', () => {
    expect(progressBreakdown(['not_started', 'not_started']).tracked).toBe(0)
  })

  it('returns null instead of 0% when nothing is tracked', () => {
    expect(progressBreakdown([]).percentage).toBeNull()
  })
})

describe('daysSince', () => {
  const today = new Date('2026-09-30T08:00:00Z')

  it('counts whole days back', () => {
    expect(daysSince('2026-09-23', today)).toBe(7)
    expect(daysSince('2026-09-30', today)).toBe(0)
  })

  it('returns null when there is no date', () => {
    expect(daysSince(null, today)).toBeNull()
  })

  it('accepts a full timestamp', () => {
    expect(daysSince('2026-09-29T14:00:00Z', today)).toBe(1)
  })
})
