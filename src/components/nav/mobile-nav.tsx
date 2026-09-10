'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, MoreHorizontal } from 'lucide-react'
import { MOBILE_NAV, MORE_NAV } from './nav-config'
import { Sheet } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/** Bottom tab bar. Big targets, no hover dependence (§37). */
export function MobileNav({ instructorName }: { instructorName: string }) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = React.useState(false)

  const moreActive = MORE_NAV.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {MOBILE_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium',
                    active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
                  )}
                >
                  <item.icon className="size-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              className={cn(
                'flex min-h-[3.5rem] w-full flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium',
                moreActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
              )}
            >
              <MoreHorizontal className="size-5" />
              More
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} title="More" description={instructorName}>
        <ul className="space-y-1">
          {MORE_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="tap flex items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-[var(--surface-muted)]"
              >
                <item.icon className="size-4 text-[var(--text-muted)]" />
                {item.label}
              </Link>
            </li>
          ))}
          <li className="pt-2">
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="tap flex w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-[var(--negative)]"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </form>
          </li>
        </ul>
      </Sheet>
    </>
  )
}
