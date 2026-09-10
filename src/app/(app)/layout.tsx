import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { getProfile } from '@/lib/queries/profile'
import { Sidebar } from '@/components/nav/sidebar'
import { MobileNav } from '@/components/nav/mobile-nav'
import { GlobalSearch } from '@/components/search/global-search'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const profile = await getProfile()
  const instructorName = profile?.full_name || profile?.email || user.email || 'Instructor'

  return (
    <div className="flex min-h-dvh" data-theme={profile?.theme === 'system' ? undefined : profile?.theme}>
      <Sidebar instructorName={instructorName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)]/85 px-4 py-2.5 backdrop-blur-md lg:justify-end lg:px-6">
          <span className="flex items-center gap-2 font-semibold tracking-tight lg:hidden">
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent)] text-xs font-bold text-[var(--accent-text)]"
            >
              P
            </span>
            Pole Studio
          </span>
          <div className="ml-auto lg:ml-0">
            <GlobalSearch />
          </div>
        </header>

        {/* pb-24 keeps content clear of the mobile tab bar. */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>

      <MobileNav instructorName={instructorName} />
    </div>
  )
}
