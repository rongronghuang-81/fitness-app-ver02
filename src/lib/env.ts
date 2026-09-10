/**
 * Environment access.
 *
 * The `NEXT_PUBLIC_*` references are written as literal property accesses so
 * Next.js can inline them into the browser bundle. They are read through lazy
 * getters rather than at module load, so a missing variable fails where it is
 * actually used — a build must not crash just because an unrelated page
 * imported this file.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    )
  }
  return value
}

export const publicEnv = {
  get supabaseUrl() {
    return required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL')
  },
  get supabaseAnonKey() {
    return required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  },
} as const

/** Server-only. Throws if reached from the browser bundle. */
export function serviceRoleKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error('The service-role key must never be read in the browser.')
  }
  return required(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY')
}
