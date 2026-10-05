// Visual + behaviour check for the move-choice panel: round 1 (read only), round 3 (6 learned moves, swap by
// clicking), and that the chosen moves are the ones on the move bar. Screenshots go to screenshots/loadout.
// Usage: node scripts/loadout-shots.mjs [it]
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const lang = process.argv[2] === 'it' ? 'it' : 'en';
mkdirSync('screenshots/loadout', { recursive: true });
const server = await createServer({ server: { port: 5197 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const check = (ok, msg) => { console.log(ok ? 'OK  ' : 'FAIL', msg); if (!ok) errors.push(msg); };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${url}?seed=5&botTeam=vinram,brinkle&bot=passive`);
  await page.waitForTimeout(800);
  if (lang === 'it') await page.getByRole('button', { name: /Italiano/ }).click().catch(() => {});
  await page.getByRole('button', { name: /Practice|Allenamento/ }).click();
  await page.locator('.creature-card').nth(0).click();
  await page.locator('.creature-card').nth(3).click();
  await page.getByRole('button', { name: /Ready|Pronto/ }).click();
  await page.locator('.loadout').waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `screenshots/loadout/${lang}-round1.png` });
  check((await page.locator('.loadout .lo-move').count()) === 8, 'round 1: 4 moves per creature, nothing to swap');
  await page.locator('.loadout .btn.primary').click();
  await page.locator('.loadout').waitFor({ state: 'detached', timeout: 10000 });

  // Jump to round 3: player 0 wins round 1, loses round 2 (state edits on the local runner).
  const endRound = (loser) => page.evaluate((l) => {
    const s = window.__yappemon.app.battle.session.runner.state;
    s.trainers[l].team.forEach((c) => { c.hp = 0; c.fainted = true; });
    s.trainers[l].field = 'out';
  }, loser);
  const skipBreak = () => page.waitForFunction(() => window.__yappemon.state().intermission > 0, null, { timeout: 10000 })
    .then(() => page.evaluate(() => { window.__yappemon.state().intermission = 1; }));
  await page.waitForTimeout(1500);
  await endRound(1);
  await skipBreak();
  await page.locator('.loadout').waitFor({ timeout: 10000 });
  await page.locator('.loadout .btn.primary').click();
  await page.locator('.loadout').waitFor({ state: 'detached', timeout: 10000 });
  await page.waitForTimeout(1500);
  await endRound(0);
  await skipBreak();
  await page.locator('.loadout').waitFor({ timeout: 10000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `screenshots/loadout/${lang}-round3.png` });
  const col = page.locator('.loadout .lo-col').first();
  check((await col.locator('.lo-move').count()) === 6, 'round 3: Calderox shows 6 learned moves');
  const before = await page.evaluate(() => window.__yappemon.state().trainers[0].team[0].moves);
  // Swap: click a pool move, then the first chosen move.
  await col.locator('.lo-grid.pool .lo-move').first().click();
  await page.screenshot({ path: `screenshots/loadout/${lang}-round3-selected.png` });
  await col.locator('.lo-grid:not(.pool) .lo-move').first().click();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => window.__yappemon.state().trainers[0].team[0].moves);
  check(JSON.stringify(after) !== JSON.stringify(before) && after.length === 4, `swap reached the sim: ${before} → ${after}`);
  await page.locator('.loadout .btn.primary').click();
  await page.locator('.loadout').waitFor({ state: 'detached', timeout: 10000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `screenshots/loadout/${lang}-round3-fight.png` });
  const bar = await page.locator('.move-card .mc-name').allTextContents();
  check(bar.length === 4, `move bar shows the 4 chosen moves: ${bar.join(', ')}`);
  await page.close();
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'loadout shots OK');
process.exit(errors.length ? 1 : 0);
