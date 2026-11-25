/**
 * Regenerates the README screenshots in ../docs/screenshots.
 * Usage (from e2e/): npm run screenshots   (builds are previewed automatically)
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '..', 'docs', 'screenshots');
const BUILDS = [
  { name: 'React', dir: '../react', url: 'http://localhost:4173/' },
  { name: 'Vue', dir: '../vue', url: 'http://localhost:4174/' },
];

/** Starts `vite preview` for a build and resolves once it answers HTTP. */
async function preview({ dir, url }) {
  const child = spawn('npm', ['--prefix', dir, 'run', 'preview'], { stdio: 'ignore', detached: true });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return child;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Preview for ${dir} did not start`);
}

/** A page with both builds in labelled iframes, so one image shows them side by side. */
function sideBySide(width, height) {
  const frame = (b) => `
    <figure><figcaption>${b.name} build</figcaption>
    <iframe name="${b.name.toLowerCase()}" src="${b.url}" width="${width}" height="${height}"></iframe></figure>`;
  return `<!doctype html><style>
    body{margin:0;padding:16px;display:flex;gap:16px;background:#1c2333;font-family:system-ui,sans-serif}
    figure{margin:0} figcaption{color:#fff;font-weight:700;margin:0 0 8px}
    iframe{border:0;border-radius:8px;background:#fff}</style>${BUILDS.map(frame).join('')}`;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const servers = await Promise.all(BUILDS.map(preview));
  const browser = await chromium.launch();
  try {
    // Fixed clock keeps the relative demo dates stable between regenerations.
    const context = await browser.newContext({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 1 });
    await context.clock.setFixedTime(new Date('2026-11-25T10:00:00'));
    const page = await context.newPage();

    for (const b of BUILDS) {
      await page.goto(b.url);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.screenshot({ path: path.join(OUT, `${b.name.toLowerCase()}-overview.png`), fullPage: true });
    }

    await page.setViewportSize({ width: 1500, height: 1000 });
    await page.setContent(sideBySide(720, 930));
    const frames = BUILDS.map((b) => page.frameLocator(`iframe[name="${b.name.toLowerCase()}"]`));
    for (const f of frames) await f.getByRole('heading', { level: 1 }).waitFor();
    await page.screenshot({ path: path.join(OUT, 'side-by-side-overview.png') });

    for (const f of frames) {
      await f.getByRole('button', { name: 'Edit: Renew the domain name' }).click();
      await f.getByLabel('Title', { exact: true }).fill('');
      await f.getByRole('button', { name: 'Save changes' }).click();
    }
    await page.mouse.move(0, 0);
    await page.screenshot({ path: path.join(OUT, 'side-by-side-edit-validation.png') });

    for (const f of frames) {
      await f.getByRole('button', { name: 'Cancel' }).click();
      await f.getByRole('checkbox', { name: 'Mark as done: Draft the release notes' }).check();
      await f.getByRole('button', { name: 'Done', exact: true }).click();
      await f.getByLabel('Sort by').selectOption('title');
      await f.getByRole('button', { name: 'Delete: Water the office plants' }).click();
    }
    await page.mouse.move(0, 0); // drop hover styling from the last click
    await page.screenshot({ path: path.join(OUT, 'side-by-side-filter-delete.png') });

    await page.setViewportSize({ width: 860, height: 900 });
    await page.setContent(sideBySide(390, 820));
    for (const f of frames) await f.getByRole('heading', { level: 1 }).waitFor();
    await page.screenshot({ path: path.join(OUT, 'side-by-side-mobile.png') });
    await context.close();
  } finally {
    await browser.close();
    // Kill the whole process group so vite preview does not linger.
    for (const s of servers) process.kill(-s.pid);
  }
  console.log(`Screenshots written to ${path.relative(process.cwd(), OUT)}`);
}

await main();
