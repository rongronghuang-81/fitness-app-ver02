/**
 * Environment access. Public values are read through `process.env.NEXT_PUBLIC_*`
 * literals so Next.js can inline them at build time; server-only secrets are
 * read lazily and never referenced from a client component.
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
  supabaseUrl: required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: required(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
} as const

/** Server-only. Throws if reached from the browser bundle. */
export function serviceRoleKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error('The service-role key must never be read in the browser.')
  }
  return required(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY')
}
