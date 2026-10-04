// Headless smoke test: boots the dev server, plays a short Practice vs Bot match through the
// debug command path, saves screenshots to ./screenshots and fails on any page error.
// Usage: node scripts/smoke.mjs [--full]   (--full plays until the match ends)
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const full = process.argv.includes('--full');
mkdirSync('screenshots', { recursive: true });

const server = await createServer({ server: { port: 5199, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

const shot = (name) => page.screenshot({ path: `screenshots/${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);

try {
  await page.goto(url);
  await wait(1500);
  await shot('01-lobby');
  await page.getByRole('button', { name: /Practice|Allenamento/ }).click();
  await wait(500);
  await page.locator('.creature-card').nth(0).click();
  await page.locator('.creature-card').nth(3).click();
  await wait(600);
  await shot('02-team');
  await page.getByRole('button', { name: /Ready|Pronto/ }).click();
  await wait(2500);
  await shot('03-battle-start');
  const say = (t) => page.evaluate((x) => window.__yappemon.say(x), t);
  await say('cinder spit then shell ram');
  await wait(450);
  await shot('04-spit');
  await wait(1500);
  await say('magma burst');
  await wait(1200);
  await shot('05-magma-windup');
  await wait(700);
  await shot('06-magma-hit');
  await page.keyboard.press('`');
  await wait(200);
  await page.keyboard.type('heat shell');
  await page.keyboard.press('Enter');
  await wait(800);
  await shot('07-debug-shell');
  const st = await page.evaluate(() => {
    const s = window.__yappemon.state();
    return s && { tick: s.tick, hp: s.trainers.map((t) => t.team.map((c) => Math.ceil(c.hp))), fields: s.trainers.map((t) => t.field) };
  });
  console.log('state:', JSON.stringify(st));
  if (full) {
    for (let i = 0; i < 120; i++) {
      const res = await page.evaluate(() => window.__yappemon.state()?.result ?? null);
      if (res) break;
      const s = await page.evaluate(() => {
        const s = window.__yappemon.state();
        const t = s.trainers[0];
        return { field: t.field, species: t.team[t.active].species, q: t.queue.length + (t.action ? 1 : 0) };
      });
      if (s.field === 'choosing') await say('second');
      else if (s.q < 2) {
        const moves = { cindrix: 'cinder spit then shell ram', brinkle: 'water jet then bubble bump', vinram: 'leaf volley then horn charge', joltmoth: 'spark dart then wing flick' };
        await say(moves[s.species]);
      }
      if (i === 30) await shot('08-mid');
      await wait(700);
    }
    await wait(3000);
    await shot('09-end');
    console.log('result:', await page.evaluate(() => JSON.stringify(window.__yappemon.state()?.result ?? 'none')));
  }
} catch (e) {
  errors.push(`script: ${e.message}`);
  await shot('error').catch(() => {});
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) {
  console.error('ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('smoke OK');
