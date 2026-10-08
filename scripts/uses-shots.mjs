// Visual check for move uses: the move bar shows uses left ("x/5"), and a move with no uses left is refused.
// Screenshots go to screenshots/uses. Usage: node scripts/uses-shots.mjs
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('screenshots/uses', { recursive: true });
const server = await createServer({ server: { port: 5199 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
let ok = true;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${url}?seed=5&botTeam=vinram,brinkle&bot=passive&loadout=0`);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Practice/ }).click();
  await page.locator('.creature-card').nth(0).click();
  await page.locator('.creature-card').nth(3).click();
  await page.getByRole('button', { name: /Ready/ }).click();
  await page.waitForTimeout(2500);
  const shot = (name) => page.screenshot({ path: `screenshots/uses/${name}.png` });
  const uses = () => page.locator('.mc-uses').allTextContents();
  console.log('start', JSON.stringify(await uses()));
  await page.evaluate(() => window.__yappemon.say('magma burst'));
  await page.waitForTimeout(3500);
  const after = await uses();
  console.log('after one magma burst', JSON.stringify(after));
  if (!after.includes('4/5')) ok = false;
  await shot('after-one');
  // Use up the rest, then try again.
  await page.evaluate(() => {
    const c = window.__yappemon.app.battle.session.runner.state.trainers[0].team[0];
    c.used.magma_burst = 5;
    c.stamina = 100;
  });
  await page.evaluate(() => window.__yappemon.say('magma burst'));
  await page.waitForTimeout(400);
  const toast = await page.locator('.toast').allTextContents();
  console.log('toasts', JSON.stringify(toast));
  if (!toast.some((x) => x.includes('no uses left'))) ok = false;
  await shot('no-uses');
  await page.close();
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : ok ? 'uses shots OK' : 'uses shots FAILED');
