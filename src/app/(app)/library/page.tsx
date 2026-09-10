import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, Dumbbell, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page'

export const metadata: Metadata = { title: 'Library' }

/**
 * The mobile "Library" tab: one hop to whichever library is needed.
 * Desktop navigates to tricks/exercises/templates directly from the sidebar.
 */
export default async function LibraryPage() {
  const supabase = await createClient()
  const [tricks, exercises, templates] = await Promise.all([
    supabase.from('tricks').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('exercises').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('lesson_templates').select('id', { count: 'exact', head: true }).eq('active', true),
  ])

  const sections = [
    {
      href: '/tricks',
      label: 'Tricks',
      icon: Sparkles,
      count: tricks.count ?? 0,
      description: 'Skills, prerequisites and progressions.',
    },
    {
      href: '/exercises',
      label: 'Exercises',
      icon: Dumbbell,
      count: exercises.count ?? 0,
      description: 'Conditioning and preparation drills.',
    },
    {
      href: '/templates',
      label: 'Lesson templates',
      icon: BookOpen,
      count: templates.count ?? 0,
      description: 'Reusable plans you can drop into a class.',
    },
  ]

  return (
    <>
      <PageHeader title="Library" description="Your teaching material in one place." />
      <ul className="space-y-2">
        {sections.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] transition-colors hover:border-[var(--border-strong)]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
                <section.icon className="size-5 text-[var(--accent)]" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{section.label}</span>
                <span className="block text-xs text-muted">{section.description}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-muted">{section.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
