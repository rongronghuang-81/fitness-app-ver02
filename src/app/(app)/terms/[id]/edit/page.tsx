import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient, requireUser } from '@/lib/supabase/server'
import { getProfile } from '@/lib/queries/profile'
import { TermForm } from '@/components/terms/term-form'
import { PageHeader } from '@/components/ui/page'
import type { Term } from '@/types/database'

export const metadata: Metadata = { title: 'Edit term' }

export default async function EditTermPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireUser()
  const supabase = await createClient()

  const [{ data: term }, { data: levels }, profile] = await Promise.all([
    supabase.from('terms').select('*').eq('id', id).maybeSingle(),
    supabase.from('levels').select('id, name').eq('active', true).order('sort_order'),
    getProfile(),
  ])

  if (!term) notFound()

  return (
    <>
      <PageHeader
        title={`Edit ${term.name}`}
        description="Moving the day or time moves the classes still sitting on that slot. Anything you rescheduled by hand, cancelled or already taught keeps its own date."
      />
      <TermForm
        term={term as Term}
        levels={levels ?? []}
        defaults={{
          duration: profile?.default_class_duration_minutes ?? 60,
          weeks: profile?.default_term_weeks ?? 6,
          startTime: profile?.default_start_time ?? '19:00',
        }}
      />
    </>
  )
}
