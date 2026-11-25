/**
 * End-to-end user flows. Identical assertions run against the React and the
 * Vue build (see playwright.config.ts projects). Test titles carry the FR ids
 * they cover so REQUIREMENTS.md can trace them.
 */
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { SEED_TITLES, count, openFresh, status, taskTitles } from './helpers';

test.beforeEach(async ({ page }) => {
  await openFresh(page);
});

test('FR-14 FR-9 first visit shows demo data and summary', async ({ page }) => {
  await expect(taskTitles(page)).toHaveText(SEED_TITLES);
  await expect(count(page, 'total')).toHaveText('4');
  await expect(count(page, 'active')).toHaveText('3');
  await expect(count(page, 'done')).toHaveText('1');
  await expect(count(page, 'overdue')).toHaveText('1');
  await expect(page.getByTestId('result-count')).toHaveText('Showing 4 of 4 tasks');
});

test('FR-1 FR-15 add a task with all fields', async ({ page }) => {
  await page.getByLabel('Title').fill('Prepare demo video');
  await page.getByLabel('Description').fill('Two minutes, screen capture only.');
  await page.getByLabel('Priority').selectOption('high');
  await page.getByLabel('Due date').fill('2030-01-15');
  await page.getByRole('button', { name: 'Add task' }).click();

  const first = page.getByTestId('task-item').first();
  await expect(first.locator('.task-title')).toHaveText('Prepare demo video');
  await expect(first.locator('.task-description')).toHaveText('Two minutes, screen capture only.');
  await expect(first.locator('.badge')).toHaveText('High');
  await expect(first.locator('.due')).toHaveText('Due 2030-01-15');
  await expect(count(page, 'total')).toHaveText('5');
  await expect(status(page)).toHaveText('Task added.');
  await expect(page.getByLabel('Title')).toBeFocused();
});

test('FR-3 validation blocks invalid input', async ({ page }) => {
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByRole('alert')).toHaveText('Title is required.');
  await page.getByLabel('Title').fill('x'.repeat(81));
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByRole('alert')).toHaveText('Title must be at most 80 characters.');
  await expect(count(page, 'total')).toHaveText('4');
  await expect(status(page)).toHaveText('Please fix the highlighted fields.');
});

test('FR-2 FR-12 edit a task, then cancel another edit with Escape', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit: Book the team retrospective' }).click();
  await expect(page.getByRole('heading', { name: 'Edit task' })).toBeVisible();
  await expect(page.getByLabel('Title')).toHaveValue('Book the team retrospective');
  await page.getByLabel('Priority').selectOption('low');
  await page.getByLabel('Title').fill('Book the quarterly retrospective');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(status(page)).toHaveText('Task updated.');
  const row = page.getByTestId('task-item').filter({ hasText: 'Book the quarterly retrospective' });
  await expect(row.locator('.badge')).toHaveText('Low');

  await page.getByRole('button', { name: 'Edit: Renew the domain name' }).click();
  await page.getByLabel('Title').fill('Should not be saved');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Add a task' })).toBeVisible();
  await expect(taskTitles(page)).toContainText(['Renew the domain name']);
  await expect(page.getByLabel('Title')).toHaveValue('');
});

test('FR-4 FR-10 toggle done updates styling, overdue and counts', async ({ page }) => {
  const row = page.getByTestId('task-item').filter({ hasText: 'Renew the domain name' });
  await expect(row).toHaveClass(/is-overdue/);
  await expect(row.locator('.overdue-label')).toHaveText('Overdue');
  await row.getByRole('checkbox').check();
  await expect(row).toHaveClass(/is-done/);
  await expect(row).not.toHaveClass(/is-overdue/);
  await expect(count(page, 'overdue')).toHaveText('0');
  await expect(status(page)).toHaveText('Task marked as done.');
  await row.getByRole('checkbox').uncheck();
  await expect(status(page)).toHaveText('Task marked as active.');
});

test('FR-5 delete requires confirmation', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete: Draft the release notes' }).click();
  await expect(page.getByText('Delete this task?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep: Draft the release notes' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Delete: Draft the release notes' })).toBeFocused();
  await expect(taskTitles(page)).toHaveCount(4);
  await page.getByRole('button', { name: 'Delete: Draft the release notes' }).click();
  await page.getByRole('button', { name: 'Confirm delete: Draft the release notes' }).click();
  await expect(taskTitles(page)).toHaveCount(3);
  await expect(status(page)).toHaveText('Task deleted.');
});

test('FR-6 FR-7 filter and search combine', async ({ page }) => {
  await page.getByRole('button', { name: 'Active', exact: true }).click();
  await expect(taskTitles(page)).toHaveCount(3);
  await page.getByRole('searchbox', { name: 'Search tasks' }).fill('REGISTRAR');
  await expect(taskTitles(page)).toHaveText(['Renew the domain name']);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByText('No tasks match the current filter or search.')).toBeVisible();
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page.getByTestId('result-count')).toHaveText('Showing 1 of 4 tasks');
});

test('FR-8 sort orders', async ({ page }) => {
  const sort = page.getByLabel('Sort by');
  await sort.selectOption('due');
  await expect(taskTitles(page)).toHaveText([
    'Renew the domain name',
    'Draft the release notes',
    'Book the team retrospective',
    'Water the office plants',
  ]);
  await sort.selectOption('priority');
  await expect(taskTitles(page).first()).toHaveText('Draft the release notes');
  await expect(taskTitles(page).last()).toHaveText('Water the office plants');
  await sort.selectOption('title');
  await expect(taskTitles(page)).toHaveText([...SEED_TITLES].sort());
});

test('FR-11 tasks and view preferences survive a reload', async ({ page }) => {
  await page.getByLabel('Title').fill('Survives reload');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Active', exact: true }).click();
  await page.getByLabel('Sort by').selectOption('title');
  await page.reload();
  await expect(taskTitles(page)).toContainText(['Survives reload']);
  await expect(page.getByRole('button', { name: 'Active', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Sort by')).toHaveValue('title');
});

test('FR-13 export downloads JSON that imports back', async ({ page }, testInfo) => {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^twin-taskboard-\d{4}-\d{2}-\d{2}\.json$/);
  const file = testInfo.outputPath('export.json');
  await download.saveAs(file);
  const exported = JSON.parse(await readFile(file, 'utf8'));
  expect(exported).toMatchObject({ app: 'twin-taskboard', version: 1 });
  expect(exported.tasks).toHaveLength(4);
  await expect(status(page)).toHaveText('Exported 4 tasks.');

  // Wipe the list, then restore it from the exported file.
  await page.getByRole('button', { name: 'Clear completed' }).click();
  await expect(count(page, 'total')).toHaveText('3');
  await page.getByLabel('Import JSON').setInputFiles(file);
  await expect(status(page)).toHaveText('Imported 4 tasks.');
  await expect(taskTitles(page)).toHaveText(SEED_TITLES);
});

test('FR-13 invalid import is rejected without data loss', async ({ page }) => {
  await page.getByLabel('Import JSON').setInputFiles(path.join(import.meta.dirname, '..', 'fixtures', 'invalid-tasks.json'));
  await expect(status(page)).toHaveText('Import failed: Task #2 is invalid.');
  await expect(count(page, 'total')).toHaveText('4');
});

test('FR-14 clear completed, empty state and demo reset', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear completed' }).click();
  await expect(status(page)).toHaveText('Cleared 1 completed task.');
  await expect(page.getByRole('button', { name: 'Clear completed' })).toBeDisabled();
  for (const title of ['Draft the release notes', 'Renew the domain name', 'Book the team retrospective']) {
    await page.getByRole('button', { name: `Delete: ${title}` }).click();
    await page.getByRole('button', { name: `Confirm delete: ${title}` }).click();
  }
  await expect(page.getByText('No tasks yet. Add your first task above.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('No tasks yet. Add your first task above.')).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await expect(taskTitles(page)).toHaveText(SEED_TITLES);
  await expect(status(page)).toHaveText('Demo data restored.');
});

test('FR-12 keyboard only: "/" focuses search, Enter submits, Space toggles', async ({ page }) => {
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox', { name: 'Search tasks' })).toBeFocused();
  await page.getByLabel('Title').focus();
  await page.keyboard.type('Keyboard task');
  await page.keyboard.press('Enter');
  await expect(taskTitles(page).first()).toHaveText('Keyboard task');
  const box = page.getByRole('checkbox', { name: 'Mark as done: Keyboard task' });
  await box.focus();
  await page.keyboard.press('Space');
  await expect(box).toBeChecked();
});

test('FR-16 layout adapts to a phone-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Add task' })).toBeVisible();
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
});
