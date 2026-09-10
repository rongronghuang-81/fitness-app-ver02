'use client'

import * as React from 'react'
import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createTerm, updateTerm } from '@/actions/terms'
import { idle } from '@/actions/types'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { useToast } from '@/components/ui/toast'
import { generateClassDates, WEEKDAY_LABELS, type WeekdayIndex } from '@/lib/domain/schedule'
import { formatDate } from '@/lib/domain/format'
import type { Level, Term } from '@/types/database'

const WEEK_PRESETS = [4, 6, 8]

/**
 * Term creation with a live schedule preview (§10).
 *
 * The preview uses the same rule as the `generate_term_classes` database
 * function, so what the instructor sees before saving is exactly what gets
 * created.
 */
export function TermForm({
  term,
  levels,
  defaults,
}: {
  term?: Term | null
  levels: Pick<Level, 'id' | 'name'>[]
  defaults: { duration: number; weeks: number; startTime: string }
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [state, action, pending] = useActionState(
    term ? updateTerm.bind(null, term.id) : createTerm,
    idle,
  )
  const errors = state.status === 'error' ? state.errors : undefined

  const [startDate, setStartDate] = React.useState(
    term?.start_date ?? new Date().toISOString().slice(0, 10),
  )
  const [weekday, setWeekday] = React.useState<number>(
    term?.weekday ?? new Date().getDay(),
  )
  const [weeks, setWeeks] = React.useState<number>(term?.number_of_weeks ?? defaults.weeks)

  useEffect(() => {
    if (state.status === 'success') {
      if (state.message) notify(state.message)
      if (state.id) router.push(`/terms/${state.id}`)
      else router.refresh()
    }
  }, [state, notify, router])

  const preview = React.useMemo(() => {
    try {
      return generateClassDates(startDate, weekday as WeekdayIndex, weeks)
    } catch {
      return []
    }
  }, [startDate, weekday, weeks])

  return (
    <form action={action} className="space-y-5" noValidate>
      <Field label="Term name" htmlFor="name" error={errors?.name} required>
        <Input
          id="name"
          name="name"
          defaultValue={term?.name ?? ''}
          placeholder="Intermediate Pole — September 2026"
          required
          autoFocus={!term}
          aria-invalid={Boolean(errors?.name)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Level" htmlFor="level_id" error={errors?.level_id}>
          <Select id="level_id" name="level_id" defaultValue={term?.level_id ?? ''}>
            <option value="">Not set</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location" htmlFor="location" error={errors?.location}>
          <Input
            id="location"
            name="location"
            defaultValue={term?.location ?? ''}
            placeholder="Studio A"
          />
        </Field>
      </div>

      <fieldset className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4">
        <legend className="px-1 text-sm font-semibold">Schedule</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date" htmlFor="start_date" error={errors?.start_date} required>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </Field>
          <Field
            label="Class day"
            htmlFor="weekday"
            hint="The first class is the first of these on or after the start date."
            error={errors?.weekday}
            required
          >
            <Select
              id="weekday"
              name="weekday"
              value={String(weekday)}
              onChange={(e) => setWeekday(Number(e.target.value))}
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start time" htmlFor="start_time" error={errors?.start_time} required>
            <Input
              id="start_time"
              name="start_time"
              type="time"
              defaultValue={term?.start_time?.slice(0, 5) ?? defaults.startTime.slice(0, 5)}
              required
            />
          </Field>
          <Field
            label="Duration (minutes)"
            htmlFor="duration_minutes"
            error={errors?.duration_minutes}
            required
          >
            <Input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              min={15}
              max={480}
              step={5}
              inputMode="numeric"
              defaultValue={term?.duration_minutes ?? defaults.duration}
              required
            />
          </Field>
        </div>

        <Field label="Number of weeks" htmlFor="number_of_weeks" error={errors?.number_of_weeks} required>
          <div className="flex flex-wrap items-center gap-2">
            {WEEK_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setWeeks(preset)}
                aria-pressed={weeks === preset}
                className={`tap rounded-xl border px-4 text-sm font-medium ${
                  weeks === preset
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-strong)] hover:bg-[var(--surface-muted)]'
                }`}
              >
                {preset} weeks
              </button>
            ))}
            <Input
              id="number_of_weeks"
              name="number_of_weeks"
              type="number"
              min={1}
              max={52}
              inputMode="numeric"
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              aria-label="Custom number of weeks"
              className="w-24"
              required
            />
          </div>
        </Field>
      </fieldset>

      {/* Exactly the dates that will be created. */}
      {preview.length > 0 ? (
        <div className="rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-4">
          <h3 className="text-sm font-semibold">
            {preview.length} {preview.length === 1 ? 'class' : 'classes'} will be created
          </h3>
          <ol className="mt-2 grid gap-x-6 gap-y-1 text-sm text-muted sm:grid-cols-2">
            {preview.map((item) => (
              <li key={item.weekNumber} className="flex justify-between gap-3">
                <span>Week {item.weekNumber}</span>
                <span className="font-medium text-[var(--text)]">{formatDate(item.date)}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <Field label="Status" htmlFor="status" error={errors?.status}>
        <Select id="status" name="status" defaultValue={term?.status ?? 'active'}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </Field>

      <Field label="Description" htmlFor="description" error={errors?.description}>
        <Textarea id="description" name="description" defaultValue={term?.description ?? ''} />
      </Field>

      <Field label="Notes" htmlFor="notes" error={errors?.notes}>
        <Textarea id="notes" name="notes" defaultValue={term?.notes ?? ''} />
      </Field>

      {state.status === 'error' && !errors ? <FormError>{state.message}</FormError> : null}

      <Button type="submit" size="lg" loading={pending}>
        {pending ? 'Saving…' : term ? 'Save term' : 'Create term and generate classes'}
      </Button>
    </form>
  )
}
