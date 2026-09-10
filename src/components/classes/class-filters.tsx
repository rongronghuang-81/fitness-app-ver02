'use client'

import * as React from 'react'
import { CalendarDays } from 'lucide-react'
import { ClassCard, type ClassCardData } from '@/components/classes/class-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select, Input } from '@/components/ui/field'
import { studentName } from '@/lib/domain/format'

/** Class list with the filters from §32: date, term, status, student. */
export function ClassFilters({
  classes,
  terms,
  students,
}: {
  classes: (ClassCardData & { termId: string; studentIds: string[] })[]
  terms: { id: string; name: string }[]
  students: { id: string; first_name: string; last_name: string | null; preferred_name: string | null }[]
}) {
  const [termId, setTermId] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [studentId, setStudentId] = React.useState('')
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')

  const filtered = React.useMemo(
    () =>
      classes.filter((item) => {
        if (termId && item.termId !== termId) return false
        if (status && item.status !== status) return false
        if (studentId && !item.studentIds.includes(studentId)) return false
        if (from && item.scheduled_date < from) return false
        if (to && item.scheduled_date > to) return false
        return true
      }),
    [classes, termId, status, studentId, from, to],
  )

  return (
    <>
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Select value={termId} onChange={(e) => setTermId(e.target.value)} aria-label="Filter by term">
          <option value="">All terms</option>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          <option value="planned">Planned</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rescheduled">Rescheduled</option>
        </Select>
        <Select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          aria-label="Filter by student"
        >
          <option value="">Any student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {studentName(s)}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="From date"
        />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={classes.length === 0 ? 'No classes yet' : 'No matches'}
          description={
            classes.length === 0
              ? 'Create a term to generate your weekly classes.'
              : 'No classes match those filters.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <li key={item.id}>
              <ClassCard data={item} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
