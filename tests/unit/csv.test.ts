import { describe, expect, it } from 'vitest'
import { csvFilename, escapeCsvValue, toCsv } from '@/lib/domain/csv'

describe('escapeCsvValue', () => {
  it('leaves simple values alone', () => {
    expect(escapeCsvValue('Sarah')).toBe('Sarah')
    expect(escapeCsvValue(42)).toBe('42')
  })

  it('quotes values containing a comma', () => {
    expect(escapeCsvValue('Tan, Sarah')).toBe('"Tan, Sarah"')
  })

  it('doubles embedded quotes', () => {
    expect(escapeCsvValue('She said "clean entry"')).toBe('"She said ""clean entry"""')
  })

  it('quotes values containing newlines', () => {
    expect(escapeCsvValue('line one\nline two')).toBe('"line one\nline two"')
  })

  it('renders null and undefined as empty', () => {
    expect(escapeCsvValue(null)).toBe('')
    expect(escapeCsvValue(undefined)).toBe('')
  })
})

describe('toCsv', () => {
  it('writes a header row and CRLF line endings', () => {
    const csv = toCsv(['name', 'attendance'], [['Sarah', '83%']])
    expect(csv).toContain('name,attendance\r\n')
    expect(csv).toContain('Sarah,83%\r\n')
  })

  it('starts with a BOM so Excel reads UTF-8 correctly', () => {
    expect(toCsv(['a'], [['é']]).charCodeAt(0)).toBe(0xfeff)
  })

  it('escapes cells that would otherwise break the row structure', () => {
    const csv = toCsv(['note'], [['Great work, really']])
    expect(csv).toContain('"Great work, really"')
  })
})

describe('csvFilename', () => {
  it('date-stamps the export', () => {
    expect(csvFilename('students', new Date('2026-09-30T00:00:00Z'))).toBe(
      'students-2026-09-30.csv',
    )
  })
})
