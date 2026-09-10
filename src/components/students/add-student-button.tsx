'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { StudentForm } from './student-form'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { Level } from '@/types/database'

/** Desktop-side add button; the phone gets the floating one in the list. */
export function AddStudentButton({ levels }: { levels: Pick<Level, 'id' | 'name'>[] }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)} className="hidden lg:inline-flex">
        <Plus className="size-4" />
        Add student
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Add student"
        description="A first name is all you need to start."
      >
        <StudentForm levels={levels} onDone={() => setOpen(false)} />
      </Sheet>
    </>
  )
}
