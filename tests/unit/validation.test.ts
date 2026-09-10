import { describe, expect, it } from 'vitest'
import {
  lessonItemSchema,
  mediaMetadataSchema,
  studentSchema,
  termSchema,
} from '@/lib/validation/schemas'

const uuid = () => crypto.randomUUID()

describe('studentSchema', () => {
  it('accepts a student created from a first name alone', () => {
    const result = studentSchema.safeParse({ first_name: 'Sarah' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.last_name).toBeNull()
  })

  it('rejects an empty name', () => {
    expect(studentSchema.safeParse({ first_name: '   ' }).success).toBe(false)
  })

  it('rejects a malformed email but allows a blank one', () => {
    expect(studentSchema.safeParse({ first_name: 'A', email: 'nope' }).success).toBe(false)
    expect(studentSchema.safeParse({ first_name: 'A', email: '' }).success).toBe(true)
  })

  it('normalises blank optional fields to null rather than empty strings', () => {
    const parsed = studentSchema.parse({ first_name: 'Sarah', phone: '', goals: '' })
    expect(parsed.phone).toBeNull()
    expect(parsed.goals).toBeNull()
  })
})

describe('termSchema', () => {
  const base = {
    name: 'Intermediate Pole',
    start_date: '2026-09-09',
    weekday: 3,
    start_time: '19:00',
    duration_minutes: 60,
    number_of_weeks: 6,
  }

  it('accepts the 4, 6 and 8 week presets', () => {
    for (const number_of_weeks of [4, 6, 8]) {
      expect(termSchema.safeParse({ ...base, number_of_weeks }).success).toBe(true)
    }
  })

  it('accepts a custom week count inside the allowed range', () => {
    expect(termSchema.safeParse({ ...base, number_of_weeks: 10 }).success).toBe(true)
  })

  it('rejects zero and out-of-range week counts', () => {
    expect(termSchema.safeParse({ ...base, number_of_weeks: 0 }).success).toBe(false)
    expect(termSchema.safeParse({ ...base, number_of_weeks: 60 }).success).toBe(false)
  })

  it('rejects a malformed date or weekday', () => {
    expect(termSchema.safeParse({ ...base, start_date: '09/09/2026' }).success).toBe(false)
    expect(termSchema.safeParse({ ...base, weekday: 7 }).success).toBe(false)
  })

  it('coerces numeric fields arriving as form strings', () => {
    const parsed = termSchema.parse({ ...base, number_of_weeks: '6', weekday: '3' })
    expect(parsed.number_of_weeks).toBe(6)
    expect(parsed.weekday).toBe(3)
  })
})

describe('lessonItemSchema', () => {
  it('accepts an item linked to a trick', () => {
    expect(lessonItemSchema.safeParse({ section: 'tricks', trick_id: uuid() }).success).toBe(true)
  })

  it('accepts a free-text item', () => {
    expect(
      lessonItemSchema.safeParse({ section: 'conditioning', free_text: 'Extra shoulder work' })
        .success,
    ).toBe(true)
  })

  it('rejects an empty item', () => {
    const result = lessonItemSchema.safeParse({ section: 'warmup' })
    expect(result.success).toBe(false)
  })

  it('rejects an item linked to both a trick and an exercise', () => {
    expect(
      lessonItemSchema.safeParse({ section: 'tricks', trick_id: uuid(), exercise_id: uuid() })
        .success,
    ).toBe(false)
  })
})

describe('mediaMetadataSchema', () => {
  const base = {
    storage_path: 'owner/student/clip.mp4',
    file_type: 'video' as const,
    mime_type: 'video/mp4' as const,
    file_size: 1024,
  }

  it('requires at least one relationship', () => {
    expect(mediaMetadataSchema.safeParse(base).success).toBe(false)
    expect(mediaMetadataSchema.safeParse({ ...base, student_id: uuid() }).success).toBe(true)
  })

  it('rejects a disallowed file type', () => {
    expect(
      mediaMetadataSchema.safeParse({
        ...base,
        student_id: uuid(),
        mime_type: 'application/pdf',
      }).success,
    ).toBe(false)
  })

  it('rejects a file above the upload limit', () => {
    expect(
      mediaMetadataSchema.safeParse({
        ...base,
        student_id: uuid(),
        file_size: 600 * 1024 * 1024,
      }).success,
    ).toBe(false)
  })
})
