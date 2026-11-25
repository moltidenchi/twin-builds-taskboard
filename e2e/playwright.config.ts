import { defineConfig, devices } from '@playwright/test';

/**
 * One suite, two targets. Every spec in tests/ (except parity) runs once per
 * build, so a passing run proves both builds satisfy the same user flows.
 * The `parity` project loads both builds side by side and diffs their DOM.
 */
export const REACT_URL = 'http://localhost:4173/';
export const VUE_URL = 'http://localhost:4174/';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
  projects: [
    { name: 'react', testIgnore: /parity\.spec\.ts/, use: { baseURL: REACT_URL } },
    { name: 'vue', testIgnore: /parity\.spec\.ts/, use: { baseURL: VUE_URL } },
    { name: 'parity', testMatch: /parity\.spec\.ts/ },
  ],
  webServer: [
    {
      command: 'npm --prefix ../react run build && npm --prefix ../react run preview',
      url: REACT_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm --prefix ../vue run build && npm --prefix ../vue run preview',
      url: VUE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
