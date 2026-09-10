import type { Metadata } from 'next'
import { listClasses } from '@/lib/queries/calendar'
import { CalendarViews } from '@/components/calendar/calendar-views'
import { PageHeader } from '@/components/ui/page'
import { todayISO } from '@/lib/domain/format'

export const metadata: Metadata = { title: 'Calendar' }

export default async function CalendarPage() {
  const today = todayISO()
  // A rolling window rather than the whole history: last year onwards is plenty
  // for a calendar and keeps the query cheap (§49).
  const from = `${Number(today.slice(0, 4)) - 1}-01-01`
  const classes = await listClasses({ from, limit: 400 })

  return (
    <>
      <PageHeader title="Calendar" description="Every class, by day, week or month." />
      <CalendarViews classes={classes} initialMonth={today} />
    </>
  )
}
