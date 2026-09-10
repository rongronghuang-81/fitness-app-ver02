import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClassCard } from '@/components/classes/class-card'
import { PlannedVsActual } from '@/components/classes/planned-vs-actual'
import type { LessonItem } from '@/types/database'

describe('EmptyState', () => {
  it('never renders a blank page — it explains and offers an action (§52)', () => {
    render(
      <EmptyState
        title="No students yet"
        description="Add your first student to start tracking attendance and progress."
        action={<button type="button">Add a student</button>}
      />,
    )
    expect(screen.getByRole('heading', { name: 'No students yet' })).toBeInTheDocument()
    expect(screen.getByText(/Add your first student/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a student' })).toBeInTheDocument()
  })
})

describe('Field', () => {
  it('associates the label with the control', () => {
    render(
      <Field label="First name" htmlFor="first_name" required>
        <Input id="first_name" />
      </Field>,
    )
    expect(screen.getByLabelText(/First name/)).toBeInTheDocument()
  })

  it('announces validation errors to screen readers (§50, §51)', () => {
    render(
      <Field label="Email" htmlFor="email" error="Enter a valid email address">
        <Input id="email" aria-invalid />
      </Field>,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Enter a valid email address')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('hides the hint once there is an error, so the two never conflict', () => {
    render(
      <Field label="Weeks" htmlFor="weeks" hint="4, 6 or 8" error="Too many weeks">
        <Input id="weeks" />
      </Field>,
    )
    expect(screen.queryByText('4, 6 or 8')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Too many weeks')
  })
})

describe('Button', () => {
  it('blocks input and exposes busy state while loading (§51)', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button', { name: /Save/ })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(within(button).getByRole('status')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('renders status text rather than colour alone', () => {
    render(<Badge tone="positive">Completed</Badge>)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })
})

describe('ClassCard', () => {
  const data = {
    id: 'class-1',
    scheduled_date: '2026-09-30',
    start_time: '19:00',
    duration_minutes: 60,
    status: 'planned',
    theme: 'Shoulder mount',
    week_number: 4,
    term: { id: 'term-1', name: 'Intermediate Pole', number_of_weeks: 6 },
    students: [
      { id: 's1', name: 'Sarah Tan' },
      { id: 's2', name: 'Michelle Lim' },
    ],
  }

  it('shows term, week, time and students at a glance (§30)', () => {
    render(<ClassCard data={data} />)
    expect(screen.getByText('Intermediate Pole')).toBeInTheDocument()
    expect(screen.getByText(/Week 4 of 6/)).toBeInTheDocument()
    expect(screen.getByText(/7:00 PM – 8:00 PM/)).toBeInTheDocument()
    expect(screen.getByText('Sarah Tan, Michelle Lim')).toBeInTheDocument()
    expect(screen.getByText('Planned')).toBeInTheDocument()
  })

  it('links to the class page', () => {
    render(<ClassCard data={data} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/classes/class-1')
  })

  it('says so when nobody is enrolled rather than showing an empty gap', () => {
    render(<ClassCard data={{ ...data, students: [] }} />)
    expect(screen.getByText('No students yet')).toBeInTheDocument()
  })
})

describe('PlannedVsActual', () => {
  function item(partial: Partial<LessonItem>): LessonItem {
    return {
      id: crypto.randomUUID(),
      owner_id: 'o',
      lesson_id: 'l',
      section: 'tricks',
      position: 0,
      trick_id: null,
      exercise_id: null,
      free_text: null,
      sets: null,
      reps: null,
      duration_seconds: null,
      tempo: null,
      notes: null,
      outcome: 'planned',
      created_at: '',
      updated_at: '',
      ...partial,
    }
  }

  const trickNames = new Map([
    ['sm', 'Shoulder mount'],
    ['ay', 'Ayesha prep'],
    ['ja', 'Janeiro'],
  ])

  it('shows what was dropped and what was added (§14, §48)', () => {
    render(
      <PlannedVsActual
        plannedItems={[
          item({ trick_id: 'sm' }),
          item({ trick_id: 'ay' }),
          item({ trick_id: 'ja' }),
        ]}
        actualItems={[
          item({ trick_id: 'sm' }),
          item({ trick_id: 'ay' }),
          item({ section: 'conditioning', free_text: 'Extra shoulder conditioning' }),
        ]}
        trickNames={trickNames}
        exerciseNames={new Map()}
      />,
    )

    expect(screen.getByText('Planned but not taught')).toBeInTheDocument()
    expect(screen.getByText(/Janeiro/)).toBeInTheDocument()
    expect(screen.getByText('Added on the day')).toBeInTheDocument()
    expect(screen.getByText(/Extra shoulder conditioning/)).toBeInTheDocument()
  })

  it('prompts rather than showing an empty panel before the class is recorded', () => {
    render(
      <PlannedVsActual
        plannedItems={[item({ trick_id: 'sm' })]}
        actualItems={[]}
        trickNames={trickNames}
        exerciseNames={new Map()}
      />,
    )
    expect(screen.getByText(/the plan above is never overwritten/i)).toBeInTheDocument()
  })

  it('says so plainly when the class ran to plan', () => {
    const same = [item({ trick_id: 'sm' })]
    render(
      <PlannedVsActual
        plannedItems={same}
        actualItems={same}
        trickNames={trickNames}
        exerciseNames={new Map()}
      />,
    )
    expect(screen.getByText('The class ran exactly to plan.')).toBeInTheDocument()
  })
})
