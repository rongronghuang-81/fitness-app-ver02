/**
 * Turns a FormData into a plain object the Zod schemas can parse.
 *
 * Keys ending in `[]` collect into an array, which is how multi-select fields
 * (trick levels, categories) arrive from a normal HTML form.
 *
 * Lives outside `src/actions` because a `'use server'` module may only export
 * async functions.
 */
export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (key.endsWith('[]')) {
      const k = key.slice(0, -2)
      const list = (obj[k] as string[] | undefined) ?? []
      list.push(String(value))
      obj[k] = list
    } else {
      obj[key] = value
    }
  }
  return obj
}
