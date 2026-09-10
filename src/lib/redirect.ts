/**
 * Same-origin redirect targets.
 *
 * `?next=` and the auth callback both take a path from the URL, so both need
 * the same guard. A value must be a relative path on this origin: `//evil.com`
 * is protocol-relative, and several browsers treat `/\\evil.com` the same way,
 * so the second character is checked as well as the first.
 */
export function safeRelativePath(value: unknown, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || value.length === 0) return fallback
  if (value[0] !== '/') return fallback
  if (value[1] === '/' || value[1] === '\\') return fallback
  // A backslash anywhere in the authority position, or a scheme, is not a path.
  if (/^\/[^/]*[\\:]/.test(value)) return fallback
  return value
}
