/**
 * Parity proof: drives the React and Vue builds through the same actions and
 * asserts their rendered DOM is identical after each step (tags, classes,
 * ARIA/role attributes, form values and visible text).
 */
import { expect, test, type Page } from '@playwright/test';
import { REACT_URL, VUE_URL } from '../playwright.config';
import { openFresh } from './helpers';

/** Serialises the app DOM into a framework-neutral tree. */
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const KEEP = /^(class|id|role|type|for|placeholder|rows|accept|disabled|aria-.*|data-testid)$/;
    const walk = (node: Node): unknown => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.replace(/\s+/g, ' ').trim();
        return text ? text : null;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return null; // drops Vue's <!--v-if--> placeholders
      const el = node as HTMLElement;
      const attrs = Object.fromEntries(
        [...el.attributes]
          .filter((a) => KEEP.test(a.name))
          .map((a) => [a.name, a.name === 'class' ? a.value.split(/\s+/).filter(Boolean).sort().join(' ') : a.value])
          .sort(([a], [b]) => a.localeCompare(b)),
      );
      const extra: Record<string, unknown> = {};
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        extra.value = el.value;
      }
      // Live checked state (the checked content attribute is a framework detail, not user-visible).
      if (el instanceof HTMLInputElement && el.type === 'checkbox') extra.checkedProp = el.checked;
      if (el instanceof HTMLButtonElement) extra.disabledProp = el.disabled;
      // A textarea's text child is framework-specific (React mirrors the value into it); its value is compared above.
      const childNodes = el instanceof HTMLTextAreaElement ? [] : [...el.childNodes];
      const children = childNodes.map(walk).filter((c) => c !== null);
      // Adjacent text nodes are split differently by each framework; merge them.
      const merged: unknown[] = [];
      for (const child of children) {
        const last = merged[merged.length - 1];
        if (typeof child === 'string' && typeof last === 'string') merged[merged.length - 1] = `${last} ${child}`;
        else merged.push(child);
      }
      return { tag: el.tagName.toLowerCase(), attrs, ...extra, children: merged };
    };
    return walk(document.getElementById('root')!);
  });
}

type Step = { name: string; run: (page: Page) => Promise<void> };

const steps: Step[] = [
  { name: 'initial', run: async () => {} },
  {
    name: 'validation error',
    run: async (p) => p.getByRole('button', { name: 'Add task' }).click(),
  },
  {
    name: 'task added',
    run: async (p) => {
      await p.getByLabel('Title').fill('Parity task');
      await p.getByLabel('Description').fill('Same in both builds');
      await p.getByLabel('Priority').selectOption('low');
      await p.getByLabel('Due date').fill('2031-05-05');
      await p.getByRole('button', { name: 'Add task' }).click();
    },
  },
  {
    name: 'editing',
    run: async (p) => p.getByRole('button', { name: 'Edit: Renew the domain name' }).click(),
  },
  {
    name: 'confirming delete',
    run: async (p) => {
      await p.keyboard.press('Escape');
      await p.getByRole('button', { name: 'Delete: Water the office plants' }).click();
    },
  },
  {
    name: 'toggled + filtered + sorted',
    run: async (p) => {
      await p.getByRole('checkbox', { name: 'Mark as done: Draft the release notes' }).check();
      await p.getByRole('button', { name: 'Done', exact: true }).click();
      await p.getByLabel('Sort by').selectOption('title');
    },
  },
  {
    name: 'no matches',
    run: async (p) => p.getByRole('searchbox', { name: 'Search tasks' }).fill('nothing-matches'),
  },
  {
    name: 'empty list',
    run: async (p) => {
      await p.getByRole('searchbox', { name: 'Search tasks' }).fill('');
      await p.getByRole('button', { name: 'All', exact: true }).click();
      await p.evaluate(() => {
        localStorage.setItem('twin-taskboard:v1', JSON.stringify({ tasks: [], filter: 'all', sort: 'created' }));
      });
      await p.reload();
    },
  },
];

test('React and Vue builds render identical DOM through a full workflow', async ({ browser }) => {
  // Freeze the clock so "created" timestamps and overdue checks match exactly.
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const [react, vue] = await Promise.all(contexts.map((c) => c.newPage()));
  for (const page of [react, vue]) await page.clock.setFixedTime(new Date('2026-11-25T10:00:00'));
  await openFresh(react, REACT_URL);
  await openFresh(vue, VUE_URL);

  for (const step of steps) {
    await step.run(react);
    await step.run(vue);
    const [a, b] = await Promise.all([snapshot(react), snapshot(vue)]);
    expect(b, `DOM differs after step "${step.name}"`).toEqual(a);
  }
  await Promise.all(contexts.map((c) => c.close()));
});

test('document title, language and stylesheet rules are identical', async ({ browser }) => {
  const page = await browser.newPage();
  const meta = async (url: string) => {
    await page.goto(url);
    return page.evaluate(() => ({
      title: document.title,
      lang: document.documentElement.lang,
      css: [...document.styleSheets].flatMap((s) => [...s.cssRules].map((r) => r.cssText)).join('\n'),
    }));
  };
  expect(await meta(VUE_URL)).toEqual(await meta(REACT_URL));
  await page.close();
});
