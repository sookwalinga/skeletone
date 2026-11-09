import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'test',
  globalSetup: './scripts/build.mjs',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
