// Creature name bonus (encouragements M2) in a real match: "Cindrix, cinder spit" reaches the sim as a
// named move (+10 accuracy), a plain "cinder spit" doesn't, and the evolved names count too (sim/parser tests cover the maths).
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const OUT = 'screenshots/name';
mkdirSync(OUT, { recursive: true });

const server = await createServer({ server: { port: 5193 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
const results = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const check = (ok, label) => { results.push(`${ok ? 'OK  ' : 'FAIL'} ${label}`); if (!ok) errors.push(label); };
const reset = () => page.evaluate(() => { const t = window.__yappemon.app.battle.session.runner.state.trainers[0]; t.action = null; t.queue = []; t.team[t.active].stamina = 100; });
/** Says `text`, returns the move actions it put in the sim (running + queued). */
const say = async (text) => {
  await reset();
  await page.evaluate((t) => window.__yappemon.say(t), text);
  await page.waitForTimeout(150);
  return page.evaluate(() => { const t = window.__yappemon.state().trainers[0]; return [t.action?.action, ...t.queue].filter((a) => a && a.kind === 'move'); });
};

try {
  await page.goto(`${url}?seed=3&botTeam=vinram,brinkle&bot=passive&loadout=0`);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /Practice/ }).click();
  await page.locator('.creature-card').nth(0).click();
  await page.locator('.creature-card').nth(1).click();
  await page.getByRole('button', { name: /Ready/ }).click();
  await page.waitForFunction(() => window.__yappemon.state()?.trainers[0].field === 'active', null, { timeout: 10000 });

  let a = await say('Cindrix, cinder spit then shell ram');
  check(a.length === 2 && a.every((x) => x.named === true), `"Cindrix, cinder spit then shell ram" → both named (${JSON.stringify(a)})`);
  const green = () => page.locator('.words-box .word.said').count();
  await page.waitForTimeout(100);
  check(await green() === 1 && await page.locator('.words-box .word').last().textContent() === 'Cindrix', 'side word "Cindrix" lit green after a named move');
  await page.screenshot({ path: `${OUT}/name-green.png` });
  await page.waitForTimeout(1700);
  check(await green() === 0, 'green fades after 1.5 s');
  a = await say('cinder spit');
  await page.waitForTimeout(100);
  check(await green() === 0, 'plain command: side word stays plain');
  await page.screenshot({ path: `${OUT}/name-plain.png` });
  check(a.length === 1 && !a[0].named, `"cinder spit" → not named (${JSON.stringify(a)})`);
  a = await say('Calderox sputo di brace');
  check(a.length === 1 && a[0].named === true, `"Calderox sputo di brace" (stage-3 name) → named (${JSON.stringify(a)})`);
  a = await say('Brinkle cinder spit');
  check(a.length === 1 && !a[0].named, `"Brinkle cinder spit" (other creature) → not named (${JSON.stringify(a)})`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await say('Cindrix cinder spit');
  await page.screenshot({ path: `${OUT}/name-phone.png` });
} finally {
  await browser.close();
  await server.close();
}
console.log(results.join('\n'));
console.log(errors.length ? `FAIL\n${errors.join('\n')}` : 'name test OK');
process.exit(errors.length ? 1 : 0);
