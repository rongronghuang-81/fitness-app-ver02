'use client'

import * as React from 'react'
import { CalendarClock } from 'lucide-react'
import { updateClass } from '@/actions/terms'
import { idle, type ActionState } from '@/actions/types'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { useToast } from '@/components/ui/toast'
import { toToast } from '@/lib/action-result'

/**
 * Reschedule, retime or annotate a single class (§10, §12).
 *
 * Editing one class never touches the rest of the term — that is the whole
 * point of generating classes as real rows rather than deriving them.
 */
export function ClassEditSheet({
  classId,
  scheduledDate,
  startTime,
  durationMinutes,
  status,
  theme,
  generalNotes,
}: {
  classId: string
  scheduledDate: string
  startTime: string
  durationMinutes: number
  status: string
  theme: string | null
  generalNotes: string | null
}) {
  const { notify } = useToast()
  const [open, setOpen] = React.useState(false)
  const [state, setState] = React.useState<ActionState>(idle)
  const [pending, startSaving] = React.useTransition()
  const errors = state.status === 'error' ? state.errors : undefined

  function action(formData: FormData) {
    startSaving(async () => {
      const result = await updateClass(classId, idle, formData)
      setState(result)
      const toast = toToast(result, 'Class updated.')
      if (toast) notify(toast.message, toast.tone)
      if (result.status === 'success') setOpen(false)
    })
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <CalendarClock className="size-4" />
        <span className="hidden sm:inline">Reschedule</span>
        <span className="sm:hidden">Edit</span>
      </Button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Edit this class"
        description="Only this class changes — the rest of the term is untouched."
      >
        <form action={action} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="edit-date" error={errors?.scheduled_date} required>
              <Input
                id="edit-date"
                name="scheduled_date"
                type="date"
                defaultValue={scheduledDate}
                required
              />
            </Field>
            <Field label="Start time" htmlFor="edit-time" error={errors?.start_time} required>
              <Input
                id="edit-time"
                name="start_time"
                type="time"
                defaultValue={startTime.slice(0, 5)}
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Duration (minutes)"
              htmlFor="edit-duration"
              error={errors?.duration_minutes}
              required
            >
              <Input
                id="edit-duration"
                name="duration_minutes"
                type="number"
                min={15}
                max={480}
                step={5}
                inputMode="numeric"
                defaultValue={durationMinutes}
                required
              />
            </Field>
            <Field
              label="Status"
              htmlFor="edit-status"
              hint="Use Rescheduled when you have moved the date."
              error={errors?.status}
            >
              <Select id="edit-status" name="status" defaultValue={status}>
                <option value="planned">Planned</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </Field>
          </div>

          <Field label="Theme" htmlFor="edit-theme" error={errors?.theme}>
            <Input
              id="edit-theme"
              name="theme"
              defaultValue={theme ?? ''}
              placeholder="Shoulder mount and Ayesha prep"
            />
          </Field>

          <Field label="Class notes" htmlFor="edit-notes" error={errors?.general_notes}>
            <Textarea id="edit-notes" name="general_notes" defaultValue={generalNotes ?? ''} />
          </Field>

          {state.status === 'error' && !errors ? <FormError>{state.message}</FormError> : null}

          <Button type="submit" loading={pending}>
            {pending ? 'Saving…' : 'Save class'}
          </Button>
        </form>
      </Sheet>
    </>
  )
}
