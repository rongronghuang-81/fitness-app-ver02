import type { Metadata } from 'next'
import { createClient, requireUser } from '@/lib/supabase/server'
import { getProfile } from '@/lib/queries/profile'
import { TermForm } from '@/components/terms/term-form'
import { PageHeader } from '@/components/ui/page'

export const metadata: Metadata = { title: 'New term' }

export default async function NewTermPage() {
  await requireUser()
  const supabase = await createClient()

  const [{ data: levels }, profile] = await Promise.all([
    supabase.from('levels').select('id, name').eq('active', true).order('sort_order'),
    getProfile(),
  ])

  return (
    <>
      <PageHeader
        title="Create a term"
        description="Set the weekly slot and every class date is generated for you."
      />
      <TermForm
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
