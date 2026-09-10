import type { ActionState } from '@/actions/types'

/**
 * Reduces an ActionState to something a toast can show.
 * Keeps every call site from having to narrow the union by hand.
 */
export function toToast(
  state: ActionState,
  fallbackSuccess = 'Saved.',
): { message: string; tone: 'success' | 'error' } | null {
  if (state.status === 'success') {
    return { message: state.message ?? fallbackSuccess, tone: 'success' }
  }
  if (state.status === 'error') {
    return { message: state.message, tone: 'error' }
  }
  return null
}
