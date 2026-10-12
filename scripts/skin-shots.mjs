// Screenshots of the pop-art skin: lobby, team picker, loadout, battle HUD (with a boost flash), end screen, mobile lobby + HUD.
// Usage: node scripts/skin-shots.mjs   (output in screenshots/skin)
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('screenshots/skin', { recursive: true });
const server = await createServer({ server: { port: 5198 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${url}?seed=5&botTeam=vinram,brinkle&bot=passive`);
  await page.waitForTimeout(1200);
  await page.waitForTimeout(2500); await page.screenshot({ path: 'screenshots/skin/1-lobby.png' });
  const fonts = await page.evaluate(() => ['Bangers', 'Lilita One', 'Modak'].map((f) => `${f}:${document.fonts.check(`20px "${f}"`)}`));
  console.log('fonts loaded', fonts.join(' '));
  await page.getByRole('button', { name: /Practice/ }).click();
  await page.locator('.creature-card').nth(0).click();
  await page.locator('.creature-card').nth(3).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'screenshots/skin/2-team.png' });
  await page.getByRole('button', { name: /Ready/ }).click();
  await page.locator('.loadout').waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/skin/3-loadout.png' });
  await page.locator('.loadout .btn.primary').click();
  await page.waitForFunction(() => window.__yappemon.state().phase === 'fight' || window.__yappemon.state().tick > 30, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.__yappemon.say('forza', 'hype'));
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'screenshots/skin/4-battle.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/skin/5-battle-mobile.png' });
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(`${url}?seed=5`);
  await m.waitForTimeout(1200);
  await m.screenshot({ path: 'screenshots/skin/6-lobby-mobile.png' });
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length ? `FAIL ${errors.join(' | ')}` : 'OK no page errors');
process.exit(errors.length ? 1 : 0);
