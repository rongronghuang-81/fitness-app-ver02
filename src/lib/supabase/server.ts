import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'
import type { Database } from '@/types/database'

/** Request-scoped Supabase client that reads and refreshes the auth cookie. */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // `middleware.ts` performs the refresh instead, so this is safe.
        }
      },
    },
  })
}

/**
 * The signed-in instructor, or null.
 *
 * Uses `getUser()` rather than `getSession()`: getUser revalidates the token
 * with Supabase, so a tampered cookie cannot fake an identity.
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/** Same, but throws — for server actions that must never run anonymously. */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  return user
}
