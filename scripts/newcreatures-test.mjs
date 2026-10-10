// Plays a short practice match with the batch-A creatures (picked from the team screen) and checks that moves work.
// Usage: node scripts/newcreatures-test.mjs [species...]  -> screenshots/newcreatures
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('screenshots/newcreatures', { recursive: true });
const server = await createServer({ server: { port: 5195 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${url}?seed=7&botTeam=gravelo,wispurr&bot=passive&loadout=0`);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Practice/ }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/newcreatures/team.png' });
  const n = await page.locator('.creature-card').count();
  console.log('cards', n);
  await page.locator('.creature-card').nth(4).click(); // gravelo
  await page.locator('.creature-card').nth(5).click(); // pipwing
  await page.getByRole('button', { name: /Ready/ }).click();
  await page.waitForTimeout(2500);
  for (const [m, at] of [['pebble bump', 400], ['gravel shot', 700], ['stone skin', 500], ['fault quake', 1900]]) {
    await page.evaluate((x) => window.__yappemon.say(x), m);
    await page.waitForTimeout(at);
    await page.screenshot({ path: `screenshots/newcreatures/gravelo-${m.replace(' ', '_')}.png` });
    await page.waitForTimeout(2600 - at);
  }
  const s = await page.evaluate(() => { const st = window.__yappemon.state(); return { hp: st.trainers.map((t) => t.team[t.active].hp), used: st.trainers[0].team[0].used }; });
  console.log(JSON.stringify(s));
  await page.close();
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'new creatures OK');
