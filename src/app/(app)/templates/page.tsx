import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { TemplateList, type TemplateRow } from '@/components/library/template-list'
import { PageHeader } from '@/components/ui/page'
import type { LessonSection } from '@/types/database'

export const metadata: Metadata = { title: 'Lesson templates' }

export default async function TemplatesPage() {
  const supabase = await createClient()

  const [{ data: rows }, { data: levels }] = await Promise.all([
    supabase
      .from('lesson_templates')
      .select('id, name, description, is_favorite, levels ( name ), lesson_template_items ( section )')
      .eq('active', true)
      .order('name'),
    supabase.from('levels').select('id, name').eq('active', true).order('sort_order'),
  ])

  const templates: TemplateRow[] = (
    (rows ?? []) as unknown as {
      id: string
      name: string
      description: string | null
      is_favorite: boolean
      levels: { name: string } | null
      lesson_template_items: { section: LessonSection }[]
    }[]
  ).map((row) => {
    const itemCounts: Partial<Record<LessonSection, number>> = {}
    for (const item of row.lesson_template_items) {
      itemCounts[item.section] = (itemCounts[item.section] ?? 0) + 1
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      is_favorite: row.is_favorite,
      levels: row.levels,
      itemCounts,
    }
  })

  return (
    <>
      <PageHeader
        title="Lesson templates"
        description="Reusable plans. Apply one to a class, then edit it for that week."
      />
      <TemplateList templates={templates} levels={levels ?? []} />
    </>
  )
}
