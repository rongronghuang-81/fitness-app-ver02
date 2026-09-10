'use client'

import * as React from 'react'
import { Download } from 'lucide-react'
import { exportCsv, type ExportKind } from '@/actions/settings'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { csvFilename } from '@/lib/domain/csv'

const EXPORTS: { kind: ExportKind; label: string; description: string }[] = [
  { kind: 'students', label: 'Students', description: 'Names, contact details, levels and goals.' },
  { kind: 'attendance', label: 'Attendance', description: 'Every attendance record, by class.' },
  { kind: 'classes', label: 'Class history', description: 'All classes with notes and turnout.' },
  { kind: 'progress', label: 'Skill progression', description: 'Every tracked skill and its dates.' },
]

/** CSV export (§46). No third-party service — the file is built server-side. */
export function ExportPanel() {
  const { notify } = useToast()
  const [busy, setBusy] = React.useState<ExportKind | null>(null)

  async function download(kind: ExportKind) {
    setBusy(kind)
    try {
      const { filename, csv } = await exportCsv(kind)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = csvFilename(filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      notify('Export downloaded.')
    } catch {
      notify('That export failed. Please try again.', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-semibold">Export your data</h2>
      <p className="text-xs text-muted">
        CSV files you can open in any spreadsheet. Your data is always yours.
      </p>

      <ul className="mt-3 space-y-2">
        {EXPORTS.map((item) => (
          <li key={item.kind} className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block text-xs text-muted">{item.description}</span>
            </span>
            <Button
              variant="secondary"
              size="sm"
              loading={busy === item.kind}
              onClick={() => download(item.kind)}
            >
              <Download className="size-4" />
              CSV
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
