import { expect, type Page } from '@playwright/test';

export const SEED_TITLES = [
  'Draft the release notes',
  'Renew the domain name',
  'Water the office plants',
  'Book the team retrospective',
];

/** Opens the app with empty storage so every test starts from the demo data. */
export async function openFresh(page: Page, url = './') {
  await page.goto(url);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Twin Taskboard');
}

export const taskTitles = (page: Page) => page.locator('[data-testid="task-item"] .task-title');
export const count = (page: Page, key: 'total' | 'active' | 'done' | 'overdue') =>
  page.getByTestId(`count-${key}`);
export const status = (page: Page) => page.getByRole('status');
