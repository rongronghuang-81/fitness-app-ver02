import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient, requireUser } from '@/lib/supabase/server'
import { getProfile } from '@/lib/queries/profile'
import { PageHeader } from '@/components/ui/page'
import { ProfileForm } from '@/components/settings/profile-form'
import { TaxonomyEditor } from '@/components/settings/taxonomy-editor'
import { ExportPanel } from '@/components/settings/export-panel'
import type { Profile } from '@/types/database'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  await requireUser()
  const supabase = await createClient()

  const [profile, { data: levels }, { data: categories }] = await Promise.all([
    getProfile(),
    supabase.from('levels').select('id, name, sort_order').eq('active', true).order('sort_order'),
    supabase
      .from('categories')
      .select('id, name, sort_order, kind')
      .eq('active', true)
      .order('sort_order'),
  ])

  if (!profile) notFound()

  const trickCategories = (categories ?? []).filter((c) => c.kind === 'trick')
  const exerciseCategories = (categories ?? []).filter((c) => c.kind === 'exercise')

  return (
    <>
      <PageHeader title="Settings" description="Your defaults, taxonomy and data." />

      <div className="space-y-4">
        <ProfileForm profile={profile as Profile} />

        <TaxonomyEditor
          title="Levels"
          description="Used for students, terms, tricks and exercises."
          items={levels ?? []}
          table="levels"
        />

        <TaxonomyEditor
          title="Trick categories"
          description="Spins, climbs, inverts — whatever suits how you teach."
          items={trickCategories}
          table="categories"
          kind="trick"
        />

        <TaxonomyEditor
          title="Exercise categories"
          description="Shoulder, pull, core, mobility, and so on."
          items={exerciseCategories}
          table="categories"
          kind="exercise"
        />

        <ExportPanel />
      </div>
    </>
  )
}
