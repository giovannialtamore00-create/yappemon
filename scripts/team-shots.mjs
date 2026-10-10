// Screenshots of the team screen (top and scrolled to the bottom) at 1280x720 and a small 800x600 window.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('screenshots/team', { recursive: true });
const server = await createServer({ server: { port: 5197 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
try {
  for (const [w, h] of [[1280, 720], [800, 600]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${url}?seed=7&bot=passive`);
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /Practice/ }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `screenshots/team/${w}-top.png` });
    await page.locator('.team-grid').evaluate((g) => { g.scrollTop = g.scrollHeight; });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `screenshots/team/${w}-bottom.png` });
    const m = await page.evaluate(() => { const g = document.querySelector('.team-grid'); const r = document.querySelector('.team > .btn.big').getBoundingClientRect(); return { cards: g.children.length, scrolls: g.scrollHeight > g.clientHeight, readyVisible: r.bottom <= innerHeight && r.top >= 0, imgs: [...document.querySelectorAll('.cc-img')].filter((i) => i.src.startsWith('data:image')).length }; });
    console.log(w, JSON.stringify(m));
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
console.log(errors.length ? 'ERRORS ' + errors.join('|') : 'team shots OK');
