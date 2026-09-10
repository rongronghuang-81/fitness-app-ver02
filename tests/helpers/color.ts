/**
 * Colour maths for the contrast test.
 *
 * Kept in the test tree because the application never needs it at runtime —
 * the tokens are static, so contrast is a build-time property to assert, not a
 * value to compute in the browser.
 */

export type Rgb = [number, number, number]

/** oklch() -> sRGB, following the CSS Color 4 conversion. */
export function oklchToRgb(L: number, C: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]

  return linear.map((v) => {
    const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055
    return Math.min(255, Math.max(0, Math.round(c * 255)))
  }) as Rgb
}

export function relativeLuminance([r, g, b]: Rgb): number {
  const [rl, gl, bl] = [r, g, b]
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as Rgb
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

/** WCAG 2.1 contrast ratio, 1–21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ]
  return (lighter + 0.05) / (darker + 0.05)
}

/** Parses `oklch(L C H)`, `#rrggbb` or `#fff`. Throws on anything else. */
export function parseColor(value: string): Rgb {
  const trimmed = value.trim()

  const oklch = trimmed.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/)
  if (oklch) {
    return oklchToRgb(Number(oklch[1]), Number(oklch[2]), Number(oklch[3]))
  }

  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const h = hex[1]!
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ]
  }

  throw new Error(`Cannot parse colour: ${value}`)
}

/**
 * Reads the custom properties out of one CSS block, resolving `var(--x)`
 * references against a palette map.
 */
export function resolveTokens(
  block: string,
  palette: Record<string, string>,
): Record<string, string> {
  const tokens: Record<string, string> = {}
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[match[1]!] = match[2]!.trim()
  }

  const resolve = (value: string, depth = 0): string => {
    if (depth > 5) throw new Error(`Cyclic var() chain at: ${value}`)
    const ref = value.match(/^var\((--[\w-]+)\)$/)
    if (!ref) return value
    const target = tokens[ref[1]!] ?? palette[ref[1]!]
    if (!target) throw new Error(`Unresolved ${ref[1]}`)
    return resolve(target, depth + 1)
  }

  return Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, resolve(v)]))
}
