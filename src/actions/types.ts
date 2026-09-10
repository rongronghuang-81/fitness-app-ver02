import type { ZodError } from 'zod'

/**
 * The shape every server action returns, so forms can render loading, success
 * and error states uniformly (§51).
 */
export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; message?: string; id?: string }
  | { status: 'error'; message: string; errors?: Record<string, string> }

export const idle: ActionState = { status: 'idle' }

export function success(message?: string, id?: string): ActionState {
  return { status: 'success', ...(message ? { message } : {}), ...(id ? { id } : {}) }
}

export function failure(message: string, errors?: Record<string, string>): ActionState {
  return { status: 'error', message, ...(errors ? { errors } : {}) }
}

/** Flattens a Zod error into per-field messages the form can display inline. */
export function fieldErrors(error: ZodError): ActionState {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form'
    errors[key] ??= issue.message
  }
  return {
    status: 'error',
    message: 'Please fix the highlighted fields.',
    errors,
  }
}

/** Turns a Postgres error into something the instructor can act on. */
export function describeDbError(error: { code?: string; message: string }): string {
  switch (error.code) {
    case '23505':
      return 'That already exists — try a different name.'
    case '23503':
      return 'That item is still referenced by a class or lesson, so it cannot be removed. Archive it instead.'
    case '23514':
      return 'Some of those values are outside the allowed range.'
    case '42501':
      return 'You do not have access to that record.'
    default:
      return error.message || 'Something went wrong. Please try again.'
  }
}
