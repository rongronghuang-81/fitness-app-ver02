import type { Metadata } from 'next'
import { createClient, requireUser } from '@/lib/supabase/server'
import { TermForm } from '@/components/terms/term-form'
import { PageHeader } from '@/components/ui/page'

export const metadata: Metadata = { title: 'New term' }

export default async function NewTermPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const [{ data: levels }, { data: profile }] = await Promise.all([
    supabase.from('levels').select('id, name').eq('active', true).order('sort_order'),
    supabase
      .from('profiles')
      .select('default_class_duration_minutes, default_term_weeks, default_start_time')
      .eq('id', user.id)
      .maybeSingle(),
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
