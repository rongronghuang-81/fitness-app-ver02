import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeRelativePath } from '@/lib/redirect'

/**
 * Exchanges the one-time code from a Supabase email link (password reset,
 * invite, confirmation) for a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  // Relative paths only — never redirect off-origin from a link parameter.
  const next = safeRelativePath(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=expired_link`)
  }
  return NextResponse.redirect(`${origin}${next}`)
}
