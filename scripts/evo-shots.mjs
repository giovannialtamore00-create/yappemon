// Visual check of the round/evolution flow and the per-move animations:
// plays round 1 → evolution sequence → round 2 (stage 2) → evolution → round 3 (stage 3),
// screenshotting melee moves mid-motion and the evolution sequence.
// Usage: node scripts/evo-shots.mjs
import { mkdirSync, rmSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

rmSync('screenshots/evo', { recursive: true, force: true });
mkdirSync('screenshots/evo', { recursive: true });
const server = await createServer({ server: { port: 5194 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const shot = (n) => page.screenshot({ path: `screenshots/evo/${n}.png` });
const wait = (ms) => page.waitForTimeout(ms);
const say = (t) => page.evaluate((x) => window.__yappemon.say(x), t);
const st = () => page.evaluate(() => { const s = window.__yappemon.state(); return { round: s.round, score: s.score, inter: s.intermission, sp: s.trainers.map((t) => t.team.map((c) => c.species)), field: s.trainers.map((t) => t.field) }; });
/** Make the opponent (or me) one hit from losing the round. */
const weaken = (p) => page.evaluate((pp) => { for (const c of window.__yappemon.state().trainers[pp].team) c.hp = 1; }, p);

try {
  await page.goto(`${url}?seed=5&botTeam=brinkle,joltmoth&bot=passive`);
  await wait(800);
  await page.getByRole('button', { name: /Practice/ }).click();
  await page.locator('.creature-card').nth(0).click(); // cindrix
  await page.locator('.creature-card').nth(2).click(); // vinram
  await page.getByRole('button', { name: /Ready/ }).click();
  await wait(2200);
  // Round 1 melee motions.
  await say('shell ram'); await wait(330); await shot('r1-shell-ram-rolling');
  await wait(1500);
  await say('magma burst'); await wait(900); await shot('r1-magma-stomp');
  await wait(2500);
  // Win round 1.
  await weaken(1);
  for (let i = 0; i < 12 && (await st()).inter === 0; i++) {
    const s = await st();
    if (s.field[1] === 'choosing') await page.evaluate(() => window.__yappemon.app.battle.session.runner.queue(1, [{ type: 'choose', slot: 1 }]));
    await say('shell ram');
    await wait(900);
  }
  console.log('after round 1:', JSON.stringify(await st()));
  await wait(1000); await shot('evo-1-banner');
  await wait(1500); await shot('evo-2-glow');
  await wait(1400); await shot('evo-3-flicker');
  await wait(700); await shot('evo-4-burst');
  await wait(900); await shot('evo-5-evolved');
  await wait(2600);
  console.log('round 2:', JSON.stringify(await st()));
  await shot('r2-start');
  await wait(1000);
  await say('molten leap'); await wait(830); await shot('r2-molten-leap-air');
  await wait(2500);
  // Lose round 2 → round 3.
  await weaken(0);
  await page.evaluate(() => {
    const r = window.__yappemon.app.battle.session.runner;
    const s = r.state;
    s.trainers[0].team.forEach((c) => { c.hp = 0.5; });
  });
  for (let i = 0; i < 20 && (await st()).inter === 0; i++) {
    await page.evaluate(() => {
      const r = window.__yappemon.app.battle.session.runner;
      const t = r.state.trainers[1];
      if (!t.action && !t.queue.length) r.queue(1, [{ type: 'queue', actions: [{ kind: 'move', move: 'bubble_bump' }] }]);
      if (r.state.trainers[0].field === 'choosing') r.queue(0, [{ type: 'choose', slot: 1 }]);
    });
    await wait(500);
  }
  console.log('after round 2:', JSON.stringify(await st()));
  await wait(4000); await shot('evo-r3-glow');
  await wait(3500);
  console.log('round 3:', JSON.stringify(await st()));
  await wait(800); await shot('r3-start');
  await say('volcanic ruin'); await wait(1900); await shot('r3-volcanic-ruin');
} catch (e) {
  errors.push('script: ' + e.message);
  await shot('error').catch(() => {});
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'evo shots OK');
