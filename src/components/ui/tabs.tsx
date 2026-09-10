'use client'

import { Tabs as RadixTabs } from 'radix-ui'
import { cn } from '@/lib/utils'

export const Tabs = RadixTabs.Root

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn(
        // Scrolls horizontally on a phone rather than wrapping or shrinking.
        'no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-[var(--border)] px-4 sm:mx-0 sm:px-0',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        'tap relative shrink-0 border-b-2 border-transparent px-3 pb-2.5 pt-2 text-sm font-medium text-[var(--text-muted)] transition-colors',
        'hover:text-[var(--text)]',
        'data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--text)]',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={cn('pt-4 focus:outline-none', className)} {...props} />
}
