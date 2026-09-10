import { describe, expect, it } from 'vitest'
import { describeItem, diffLessons, groupBySection, itemKey } from '@/lib/domain/lesson'
import type { LessonItem } from '@/types/database'

function item(partial: Partial<LessonItem>): LessonItem {
  return {
    id: crypto.randomUUID(),
    owner_id: 'owner',
    lesson_id: 'lesson',
    section: 'tricks',
    position: 0,
    trick_id: null,
    exercise_id: null,
    free_text: null,
    sets: null,
    reps: null,
    duration_seconds: null,
    tempo: null,
    notes: null,
    outcome: 'planned',
    created_at: '',
    updated_at: '',
    ...partial,
  }
}

describe('groupBySection', () => {
  it('groups items and orders them by position', () => {
    const grouped = groupBySection([
      item({ section: 'tricks', position: 1, free_text: 'B' }),
      item({ section: 'tricks', position: 0, free_text: 'A' }),
      item({ section: 'warmup', position: 0, free_text: 'W' }),
    ])
    expect(grouped.tricks.map((i) => i.free_text)).toEqual(['A', 'B'])
    expect(grouped.warmup).toHaveLength(1)
    expect(grouped.cooldown).toEqual([])
  })
})

describe('itemKey', () => {
  it('identifies items by their linked library row', () => {
    expect(itemKey(item({ trick_id: 't1' }))).toBe('trick:t1')
    expect(itemKey(item({ exercise_id: 'e1' }))).toBe('exercise:e1')
  })

  it('falls back to normalised free text', () => {
    expect(itemKey(item({ free_text: '  Extra Conditioning ' }))).toBe(
      'text:extra conditioning',
    )
  })
})

describe('diffLessons', () => {
  it('reports what was taught, dropped and added — the §48 example', () => {
    const planned = [
      { key: 'trick:sm', label: 'Shoulder mount' },
      { key: 'trick:ay', label: 'Ayesha prep' },
      { key: 'trick:ja', label: 'Janeiro' },
    ]
    const actual = [
      { key: 'trick:sm', label: 'Shoulder mount' },
      { key: 'trick:ay', label: 'Ayesha prep' },
      { key: 'text:extra shoulder conditioning', label: 'Extra shoulder conditioning' },
    ]

    const diff = diffLessons(planned, actual)
    expect(diff.asPlanned).toEqual(['Shoulder mount', 'Ayesha prep'])
    expect(diff.dropped).toEqual(['Janeiro'])
    expect(diff.added).toEqual(['Extra shoulder conditioning'])
  })

  it('reports no changes when the lesson ran to plan', () => {
    const same = [{ key: 'trick:sm', label: 'Shoulder mount' }]
    expect(diffLessons(same, same)).toEqual({
      asPlanned: ['Shoulder mount'],
      dropped: [],
      added: [],
    })
  })
})

describe('describeItem', () => {
  it('uses the linked library name', () => {
    expect(describeItem(item({ trick_id: 't1' }), { trick: 'Ayesha' })).toBe('Ayesha')
  })

  it('appends sets, reps and duration', () => {
    expect(
      describeItem(item({ exercise_id: 'e1', sets: 3, reps: '10' }), { exercise: 'Scapular Pull' }),
    ).toBe('Scapular Pull · 3 × 10')
    expect(describeItem(item({ free_text: 'Dead hang', duration_seconds: 90 }), {})).toBe(
      'Dead hang · 1m 30s',
    )
  })
})
