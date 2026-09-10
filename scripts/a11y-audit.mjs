/**
 * Accessibility audit with axe-core against a running build.
 *
 *   npm run build && npm start &
 *   BASE=http://localhost:3000 npm run test:a11y
 *
 * Only covers the routes that render without a backend — the sign-in flow and
 * the offline page. Everything behind authentication needs a live Supabase, so
 * the colour side of those screens is asserted in tests/unit/contrast.test.ts
 * instead, straight from the design tokens.
 */
import { chromium } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'

const BASE = process.env.BASE ?? 'http://localhost:3120'
const PAGES = ['/login', '/forgot-password', '/update-password', '/offline']
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
]

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
let failures = 0

for (const scheme of ['light', 'dark']) {
  for (const viewport of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme })
    const page = await ctx.newPage()

    for (const path of PAGES) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' })
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
        .analyze()

      const label = `${scheme}/${viewport.name}${path}`
      if (violations.length === 0) {
        console.log(`  ok   ${label}`)
      } else {
        failures += violations.length
        console.log(`  FAIL ${label}`)
        for (const v of violations) {
          console.log(`       [${v.impact}] ${v.id}: ${v.help}`)
          for (const node of v.nodes.slice(0, 3)) {
            console.log(`         ${node.target.join(' ')}`)
            if (node.failureSummary) {
              console.log(`         ${node.failureSummary.replace(/\n/g, '\n         ')}`)
            }
          }
        }
      }
    }
    await ctx.close()
  }
}

await browser.close()
console.log(failures === 0 ? '\nNo accessibility violations.' : `\n${failures} violation(s).`)
process.exit(failures === 0 ? 0 : 1)
