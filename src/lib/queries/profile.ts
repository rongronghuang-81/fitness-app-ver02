import 'server-only'

import { cache } from 'react'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { todayISO } from '@/lib/domain/format'

/**
 * The signed-in instructor's profile, memoised per request.
 *
 * `cache()` means several server components can each ask for it without
 * issuing several queries.
 */
export const getProfile = cache(async () => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return data
})

/**
 * Today's date in the instructor's own timezone.
 *
 * The timezone is a setting, so "today's classes" has to respect it — a server
 * running in UTC must not tell a Singapore instructor at 7am that yesterday's
 * class is today's.
 */
export async function getToday(): Promise<string> {
  const profile = await getProfile()
  return todayISO(profile?.timezone ?? 'Asia/Singapore')
}
