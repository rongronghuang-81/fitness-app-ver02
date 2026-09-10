'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Search, UserPlus } from 'lucide-react'
import { StudentForm } from './student-form'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/field'
import { studentName, initials, formatDateShort } from '@/lib/domain/format'
import type { Level } from '@/types/database'

export interface StudentRow {
  id: string
  first_name: string
  last_name: string | null
  preferred_name: string | null
  active: boolean
  date_joined: string
  levels: { id: string; name: string; color: string } | null
}

/**
 * Student list with search and filters (§32). Filtering is client-side over an
 * already-scoped list, which keeps typing instant for a roster this size.
 */
export function StudentList({
  students,
  levels,
  openNew,
}: {
  students: StudentRow[]
  levels: Pick<Level, 'id' | 'name'>[]
  openNew: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [addOpen, setAddOpen] = React.useState(openNew)
  const [query, setQuery] = React.useState('')
  const [levelFilter, setLevelFilter] = React.useState('')

  const status = searchParams.get('status') ?? 'active'

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter((s) => {
      if (levelFilter && s.levels?.id !== levelFilter) return false
      if (!q) return true
      return studentName(s).toLowerCase().includes(q)
    })
  }, [students, query, levelFilter])

  function setStatus(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'active') params.delete('status')
    else params.set('status', next)
    params.delete('new')
    router.push(`/students?${params.toString()}`)
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students"
            aria-label="Search students"
            className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] py-2.5 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            aria-label="Filter by level"
            className="flex-1 sm:w-40"
          >
            <option value="">All levels</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="flex-1 sm:w-36"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        students.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No students yet"
            description="Add your first student to start tracking attendance and progress."
            action={<Button onClick={() => setAddOpen(true)}>Add a student</Button>}
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No matches"
            description="No students match that search and filter combination."
          />
        )
      ) : (
        <ul className="space-y-2">
          {filtered.map((student) => (
            <li key={student.id}>
              <Link
                href={`/students/${student.id}`}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] transition-colors hover:border-[var(--border-strong)]"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]"
                >
                  {initials(studentName(student))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{studentName(student)}</span>
                  <span className="block text-xs text-muted">
                    Joined {formatDateShort(student.date_joined)}
                  </span>
                </span>
                {student.levels ? <Badge tone="accent">{student.levels.name}</Badge> : null}
                {!student.active ? <Badge>Archived</Badge> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Sticky add button — reachable with a thumb on a phone. */}
      <div className="fixed bottom-20 right-4 z-20 lg:hidden">
        <Button
          size="icon"
          onClick={() => setAddOpen(true)}
          aria-label="Add student"
          className="size-14 rounded-full shadow-[var(--shadow-raised)]"
        >
          <Plus className="size-6" />
        </Button>
      </div>

      <Sheet
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add student"
        description="A first name is all you need to start."
      >
        <StudentForm levels={levels} onDone={() => setAddOpen(false)} />
      </Sheet>
    </>
  )
}
