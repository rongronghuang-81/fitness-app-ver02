import { describe, expect, it } from 'vitest'
import { safeRelativePath } from '@/lib/redirect'

describe('safeRelativePath', () => {
  it('keeps an ordinary in-app path', () => {
    expect(safeRelativePath('/students/abc')).toBe('/students/abc')
    expect(safeRelativePath('/classes/1?tab=notes')).toBe('/classes/1?tab=notes')
  })

  it('rejects an absolute URL', () => {
    expect(safeRelativePath('https://evil.example/steal')).toBe('/dashboard')
  })

  it('rejects a protocol-relative URL', () => {
    expect(safeRelativePath('//evil.example')).toBe('/dashboard')
  })

  it('rejects the backslash variant some browsers treat as protocol-relative', () => {
    expect(safeRelativePath('/\\evil.example')).toBe('/dashboard')
    expect(safeRelativePath('/\\/evil.example')).toBe('/dashboard')
  })

  it('rejects a scheme smuggled after the leading slash', () => {
    expect(safeRelativePath('/javascript:alert(1)')).toBe('/dashboard')
  })

  it('rejects anything that is not a string or is empty', () => {
    expect(safeRelativePath(null)).toBe('/dashboard')
    expect(safeRelativePath(undefined)).toBe('/dashboard')
    expect(safeRelativePath('')).toBe('/dashboard')
    expect(safeRelativePath(42)).toBe('/dashboard')
  })

  it('honours a caller-supplied fallback', () => {
    expect(safeRelativePath('https://evil.example', '/login')).toBe('/login')
  })
})
