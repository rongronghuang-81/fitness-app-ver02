/**
 * CSV generation for the export feature (§46).
 *
 * Written by hand rather than pulled from a library so exports never depend on
 * third-party software, and so the escaping rules are visible and testable.
 */

/** RFC 4180 escaping: quote when the value contains a comma, quote, or newline. */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCsvValue).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsvValue).join(','))
  }
  // CRLF line endings and a UTF-8 BOM keep Excel happy with names and accents.
  return `﻿${lines.join('\r\n')}\r\n`
}

export function csvFilename(prefix: string, today = new Date()): string {
  return `${prefix}-${today.toISOString().slice(0, 10)}.csv`
}
