import { expect, test } from '@playwright/test'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DEMO = pathToFileURL(path.join(__dirname, '..', 'demo', 'index.html')).href

// Fonts and antialiasing differ between systems, so the stored screenshots are made on Linux,
// in CI's Playwright container, and only compared there.
test.describe('demo screenshots', () => {
  test.skip(process.platform !== 'linux', 'screenshots are compared only on Linux, in CI')

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`skeleton in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      await page.goto(DEMO)
      // The default threshold (0.2) passes a bar that is a 13% tint of the background, such as
      // a squared avatar corner. 0.05 doesn't.
      await expect(page).toHaveScreenshot(`skeleton-${colorScheme}.png`, { fullPage: true, threshold: 0.05 })
    })
  }
})
