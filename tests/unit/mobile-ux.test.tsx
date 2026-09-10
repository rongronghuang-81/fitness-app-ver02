import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// The nav reads the current route; the attendance strip calls server actions.
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const setAttendance = vi.fn(async () => ({ status: 'success' as const }))
const markAllPresent = vi.fn(async () => ({ status: 'success' as const, message: 'Everyone marked present.' }))

vi.mock('@/actions/classes', () => ({
  setAttendance: (...args: unknown[]) => setAttendance(...(args as [])),
  markAllPresent: (...args: unknown[]) => markAllPresent(...(args as [])),
}))

import { MobileNav } from '@/components/nav/mobile-nav'
import { AttendanceStrip } from '@/components/classes/attendance-strip'
import { ToastProvider } from '@/components/ui/toast'
import type { ClassRoster } from '@/lib/queries/classes'

function wrap(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

describe('MobileNav', () => {
  it('gives the phone a five-item bottom bar (§5, §37)', () => {
    wrap(<MobileNav instructorName="Demo Instructor" />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    const items = within(nav).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(within(nav).getByRole('link', { name: /Home/ })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /Calendar/ })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /Students/ })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /Library/ })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: /More/ })).toBeInTheDocument()
  })

  it('marks the current route for assistive tech, not just with colour', () => {
    wrap(<MobileNav instructorName="Demo Instructor" />)
    expect(screen.getByRole('link', { name: /Home/ })).toHaveAttribute('aria-current', 'page')
  })

  it('opens the More sheet with everything else the app can reach', async () => {
    const user = userEvent.setup()
    wrap(<MobileNav instructorName="Demo Instructor" />)

    await user.click(screen.getByRole('button', { name: /More/ }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('link', { name: /Terms/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /Tricks/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /Settings/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Sign out/ })).toBeInTheDocument()
  })
})

describe('AttendanceStrip', () => {
  const roster: ClassRoster[] = [
    {
      id: 'cs-1',
      student_id: 'stu-1',
      attendance_status: 'unmarked',
      performance_notes: null,
      achievements: null,
      difficulties: null,
      homework: null,
      instructor_notes: null,
      students: { id: 'stu-1', first_name: 'Sarah', last_name: 'Tan', preferred_name: null },
    },
    {
      id: 'cs-2',
      student_id: 'stu-2',
      attendance_status: 'unmarked',
      performance_notes: null,
      achievements: null,
      difficulties: null,
      homework: null,
      instructor_notes: null,
      students: { id: 'stu-2', first_name: 'Michelle', last_name: 'Lim', preferred_name: 'Mich' },
    },
  ]

  beforeEach(() => {
    setAttendance.mockClear()
    markAllPresent.mockClear()
  })

  it('offers all four attendance states per student, one tap each (§16)', () => {
    wrap(<AttendanceStrip classId="class-1" roster={roster} />)
    const group = screen.getByRole('radiogroup', { name: /Attendance for Sarah Tan/ })
    const options = within(group).getAllByRole('radio')
    expect(options.map((o) => o.textContent)).toEqual(['Present', 'Late', 'Absent', 'Excused'])
  })

  it('uses the student’s preferred name', () => {
    wrap(<AttendanceStrip classId="class-1" roster={roster} />)
    expect(screen.getByText('Mich Lim')).toBeInTheDocument()
  })

  it('starts unmarked — Present is never assumed (§16)', () => {
    wrap(<AttendanceStrip classId="class-1" roster={roster} />)
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toHaveAttribute('aria-checked', 'false')
    }
  })

  it('reflects the tap immediately, before the server responds', async () => {
    const user = userEvent.setup()
    wrap(<AttendanceStrip classId="class-1" roster={roster} />)

    const group = screen.getByRole('radiogroup', { name: /Attendance for Sarah Tan/ })
    await user.click(within(group).getByRole('radio', { name: 'Present' }))

    expect(within(group).getByRole('radio', { name: 'Present' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(setAttendance).toHaveBeenCalledWith('cs-1', 'present')
  })

  it('toggles a status off when tapped again', async () => {
    const user = userEvent.setup()
    wrap(<AttendanceStrip classId="class-1" roster={roster} />)

    const group = screen.getByRole('radiogroup', { name: /Attendance for Sarah Tan/ })
    const present = within(group).getByRole('radio', { name: 'Present' })
    await user.click(present)
    await user.click(present)

    expect(setAttendance).toHaveBeenLastCalledWith('cs-1', 'unmarked')
  })

  it('offers "mark all present" only while more than one student is unmarked', async () => {
    const user = userEvent.setup()
    wrap(<AttendanceStrip classId="class-1" roster={roster} />)

    const markAll = screen.getByRole('button', { name: /Mark all present/ })
    await user.click(markAll)

    expect(markAllPresent).toHaveBeenCalledWith('class-1')
    expect(screen.queryByRole('button', { name: /Mark all present/ })).not.toBeInTheDocument()
  })

  it('explains an empty roster instead of rendering nothing', () => {
    wrap(<AttendanceStrip classId="class-1" roster={[]} />)
    expect(screen.getByText(/Nobody is on this class yet/)).toBeInTheDocument()
  })
})
