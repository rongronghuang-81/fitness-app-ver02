import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { publicEnv, serviceRoleKey } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * Used ONLY by the local demo-seed script. It is deliberately not imported by
 * any route, page, or server action — the application always goes through the
 * user's own session so RLS stays the single source of truth for access.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(publicEnv.supabaseUrl, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
