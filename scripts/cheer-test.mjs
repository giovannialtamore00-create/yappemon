// Encouragements (encouragements M3) in a real match: a spoken word reaches the sim, lights green in the
// Words box, bursts over the creature; the 5 s gap blocks a second word; Italian labels. Sim maths: tests/sim.test.ts.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const OUT = 'screenshots/cheer';
mkdirSync(OUT, { recursive: true });
const server = await createServer({ server: { port: 5194 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
const results = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const check = (ok, label) => { results.push(`${ok ? 'OK  ' : 'FAIL'} ${label}`); if (!ok) errors.push(label); };
const stamina = () => page.evaluate(() => { const t = window.__yappemon.app.battle.session.runner.state.trainers[0]; return t.team[t.active].stamina; });
const setStamina = (v) => page.evaluate((v) => { const t = window.__yappemon.app.battle.session.runner.state.trainers[0]; t.team[t.active].stamina = v; t.team[t.active].regenPause = 99999; }, v);
const green = () => page.locator('.words-box .word.said').allTextContents();
/** Waits until a word is lit (true) or 1.5 s pass (false). */
const lit = (text) => page.waitForFunction((t) => [...document.querySelectorAll('.words-box .word.said')].some((e) => e.textContent === t), text, { timeout: 1500 }).then(() => true, () => false);
/** Waits until the 5 s gap since the last accepted word has passed in sim time. */
const gapOver = () => page.waitForFunction(() => { const s = window.__yappemon.state(); return s.tick - s.trainers[0].cheerTick > 155; }, null, { timeout: 20000 });

try {
  await page.goto(`${url}?seed=3&botTeam=vinram,brinkle&bot=passive&loadout=0`);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /Practice/ }).click();
  await page.locator('.creature-card').nth(0).click();
  await page.locator('.creature-card').nth(1).click();
  await page.getByRole('button', { name: /Ready/ }).click();
  await page.waitForFunction(() => window.__yappemon.state()?.trainers[0].field === 'active', null, { timeout: 10000 });

  const words = await page.locator('.words-box .word').allTextContents();
  check(words.join('|') === "Come on|Stay strong|Courage|Perfect|Don't give up|Cindrix", `Words box lists the encouragements, then the name (${words.join('|')})`);
  await setStamina(40);
  await page.evaluate(() => window.__yappemon.say('come on'));
  check(await lit('Come on'), '"come on" lights green');
  check(await page.locator('.bf-cheer .bf-word').count() === 1, 'flash word over the creature');
  await page.screenshot({ path: `${OUT}/come-on.png` });
  const st = await stamina();
  check(st >= 44 && st < 47, `stamina 40 → ~45 (${st.toFixed(1)})`);
  await page.waitForTimeout(1600);
  await page.evaluate(() => window.__yappemon.say('perfect'));
  await page.waitForTimeout(300);
  check(!(await green()).includes('Perfect'), '"perfect" 1.7 s later is blocked by the 5 s gap');

  await page.evaluate(async () => { const m = await import('/src/i18n.ts'); m.setLang('it'); });
  await gapOver();
  await page.evaluate(() => { const t = window.__yappemon.state().trainers[0]; t.team[t.active].hp = 50; });
  await page.evaluate(() => window.__yappemon.say('non arrenderti'));
  check(await lit('Non arrenderti'), 'Italian "non arrenderti" lights green (Italian labels)');
  check((await page.locator('.bf-cheer .bf-word').allTextContents()).includes('Non arrenderti!'), 'Italian flash word');
  await page.screenshot({ path: `${OUT}/non-arrenderti.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await gapOver();
  await page.evaluate(() => window.__yappemon.say('forza'));
  check(await lit('Forza'), 'phone: "forza" lights green');
  await page.screenshot({ path: `${OUT}/phone.png` });
} finally {
  await browser.close();
  await server.close();
}
console.log(results.join('\n'));
console.log(errors.length ? `FAIL\n${errors.join('\n')}` : 'cheer test OK');
process.exit(errors.length ? 1 : 0);
