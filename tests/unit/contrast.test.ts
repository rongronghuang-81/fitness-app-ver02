import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { contrastRatio, parseColor, resolveTokens } from '../helpers/color'

/**
 * WCAG AA contrast, asserted against the actual token values in globals.css.
 *
 * An axe run in a browser only reaches the pages that render without a
 * backend — the sign-in flow and the offline page. Status badges, progress
 * pills and muted metadata all live behind authentication, so their colours
 * are checked here instead. Badge and metadata text is 12px, which is not
 * "large text", so the 4.5:1 threshold applies rather than 3:1.
 */

const AA_NORMAL = 4.5
// Read from the project root: under jsdom, import.meta.url is not a file URL.
const CSS = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

function block(startMarker: string): string {
  const start = CSS.indexOf(startMarker)
  if (start === -1) throw new Error(`Missing CSS block: ${startMarker}`)
  const open = CSS.indexOf('{', start)
  let depth = 0
  for (let i = open; i < CSS.length; i++) {
    if (CSS[i] === '{') depth++
    else if (CSS[i] === '}') {
      depth--
      if (depth === 0) return CSS.slice(open + 1, i)
    }
  }
  throw new Error(`Unterminated CSS block: ${startMarker}`)
}

let light: Record<string, string>
let dark: Record<string, string>

beforeAll(() => {
  const palette = resolveTokens(block('@theme'), {})
  light = resolveTokens(block('\n:root {'), palette)
  dark = { ...light, ...resolveTokens(block(":root[data-theme='dark']"), palette) }
})

/** Every surface a foreground token can land on. */
const SURFACES = ['--bg', '--surface', '--surface-muted'] as const

function check(
  tokens: Record<string, string>,
  foreground: string,
  background: string,
): number {
  const fg = tokens[foreground]
  const bg = tokens[background]
  if (!fg) throw new Error(`Missing token ${foreground}`)
  if (!bg) throw new Error(`Missing token ${background}`)
  return contrastRatio(parseColor(fg), parseColor(bg))
}

describe.each([
  ['light', () => light],
  ['dark', () => dark],
])('%s theme contrast', (_name, get) => {
  it.each(['--text', '--text-muted', '--text-subtle'])(
    '%s is readable on every surface',
    (token) => {
      for (const surface of SURFACES) {
        expect(check(get(), token, surface), `${token} on ${surface}`).toBeGreaterThanOrEqual(
          AA_NORMAL,
        )
      }
    },
  )

  it.each(['positive', 'warning', 'negative', 'info'])(
    '%s status text is readable on its own soft fill',
    (tone) => {
      expect(
        check(get(), `--${tone}`, `--${tone}-soft`),
        `--${tone} on --${tone}-soft`,
      ).toBeGreaterThanOrEqual(AA_NORMAL)
    },
  )

  it.each(['positive', 'warning', 'negative', 'info'])(
    '%s also works as inline text and icons on a plain surface',
    (tone) => {
      for (const surface of SURFACES) {
        expect(
          check(get(), `--${tone}`, surface),
          `--${tone} on ${surface}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL)
      }
    },
  )

  it('the accent reads on its soft fill and on every surface', () => {
    expect(check(get(), '--accent', '--accent-soft')).toBeGreaterThanOrEqual(AA_NORMAL)
    for (const surface of SURFACES) {
      expect(check(get(), '--accent', surface), `--accent on ${surface}`).toBeGreaterThanOrEqual(
        AA_NORMAL,
      )
    }
  })

  it('primary button label reads on the accent fill', () => {
    expect(check(get(), '--accent-text', '--accent')).toBeGreaterThanOrEqual(AA_NORMAL)
  })

  it('keeps a visible emphasis order between text, muted and subtle', () => {
    const tokens = get()
    const onSurface = (t: string) => check(tokens, t, '--surface')
    expect(onSurface('--text')).toBeGreaterThan(onSurface('--text-muted'))
    expect(onSurface('--text-muted')).toBeGreaterThan(onSurface('--text-subtle'))
  })
})

describe('focus ring', () => {
  it('is distinguishable from the surfaces it sits against', () => {
    // A focus indicator is a UI component boundary: WCAG 2.1 asks for 3:1.
    for (const surface of SURFACES) {
      expect(check(light, '--ring', surface), `light ring on ${surface}`).toBeGreaterThanOrEqual(3)
      expect(check(dark, '--ring', surface), `dark ring on ${surface}`).toBeGreaterThanOrEqual(3)
    }
  })
})
