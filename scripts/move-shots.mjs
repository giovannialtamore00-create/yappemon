// Visual check for the movement update: creatures strafing, the dodge-window ring, the alert stance,
// a quick melee lunge at the current distance and a heavy attack. Screenshots go to screenshots/move.
// Usage: node scripts/move-shots.mjs
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('screenshots/move', { recursive: true });
const server = await createServer({ server: { port: 5199 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${url}?seed=5&botTeam=vinram,brinkle&bot=passive`);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Practice/ }).click();
  await page.locator('.creature-card').nth(0).click();
  await page.locator('.creature-card').nth(3).click();
  await page.getByRole('button', { name: /Ready/ }).click();
  await page.waitForTimeout(2500);
  const shot = (name) => page.screenshot({ path: `screenshots/move/${name}.png` });
  const pos = () => page.evaluate(() => window.__yappemon.app.battle.session.runner.state.trainers.map((t) => [+t.x.toFixed(2), +t.z.toFixed(2)]));
  for (let i = 0; i < 3; i++) {
    console.log('positions', JSON.stringify(await pos()));
    await shot(`strafe-${i}`);
    await page.waitForTimeout(900);
  }
  await page.evaluate(() => window.__yappemon.say('dodge left'));
  await page.waitForTimeout(400);
  await shot('dodge-ring');
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.__yappemon.say('alert'));
  await page.waitForTimeout(600);
  await shot('alert');
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.__yappemon.say('shell ram'));
  await page.waitForTimeout(250);
  await shot('shell-ram');
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.__yappemon.say('magma burst'));
  await page.waitForTimeout(1900);
  await shot('magma-burst');
  await page.close();
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'move shots OK');
