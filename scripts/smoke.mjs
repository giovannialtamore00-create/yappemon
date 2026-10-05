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

// Fake speech recognizer so the real voice wiring can be exercised without a microphone.
await page.addInitScript(() => {
  class FakeRec {
    constructor() { window.__rec = this; window.__recCount = (window.__recCount || 0) + 1; }
    start() { setTimeout(() => this.onstart && this.onstart(), 10); }
    stop() { this.onend && this.onend(); }
    abort() { this.onend && this.onend(); }
  }
  window.SpeechRecognition = FakeRec;
  window.webkitSpeechRecognition = FakeRec;
  window.__speak = (alts, final = true) => {
    const list = Array.isArray(alts) ? alts : [alts];
    const res = Object.assign(list.map((t) => ({ transcript: t, confidence: 0.9 })), { isFinal: final });
    window.__rec.onresult && window.__rec.onresult({ resultIndex: 0, results: [res] });
  };
  window.__endRec = () => window.__rec.onend && window.__rec.onend();
});

const shot = (name) => page.screenshot({ path: `screenshots/${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);

try {
  await page.goto(full ? url : url + '?seed=7&botTeam=vinram,brinkle&bot=passive');
  await wait(1500);
  await shot('01-lobby');
  await page.getByRole('button', { name: /Practice|Allenamento/ }).click();
  await wait(500);
  await page.locator('.creature-card').nth(0).click();
  await page.locator('.creature-card').nth(3).click();
  await wait(600);
  await shot('02-team');
  await page.getByRole('button', { name: /Ready|Pronto/ }).click();
  // Move-choice panel before round 1: read it, then start with the voice command 'ready'.
  await page.locator('.loadout').waitFor({ timeout: 10000 });
  await wait(400);
  await shot('02b-loadout');
  await page.evaluate(() => window.__yappemon.say('ready'));
  await page.locator('.loadout').waitFor({ state: 'detached', timeout: 10000 });
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
  // Voice path: interim shows in HUD, final (with alternatives) drives the queue, recognizer restarts.
  await page.evaluate(() => window.__speak('heat sh', false));
  await wait(100);
  const interim = await page.locator('.transcript').textContent();
  if (!interim.includes('heat sh')) throw new Error('interim transcript not shown: ' + interim);
  await page.evaluate(() => window.__endRec());
  await wait(600);
  if ((await page.evaluate(() => window.__recCount)) < 2) throw new Error('recognizer did not auto-restart');
  await page.evaluate(() => window.__speak(['what the shell', 'heat shell']));
  await wait(150);
  const q = await page.evaluate(() => { const t = window.__yappemon.state().trainers[0]; return [t.action && t.action.action, ...t.queue]; });
  if (!JSON.stringify(q).includes('heat_shell')) throw new Error('voice command not queued: ' + JSON.stringify(q) + ' toasts=' + (await page.locator('#toasts').innerText()) + ' transcript=' + (await page.locator('.transcript').innerText()) + ' st=' + JSON.stringify(await page.evaluate(() => { const t = window.__yappemon.state().trainers[0]; return { f: t.field, c: t.team[t.active] }; })));
  const mic = await page.locator('.mic').getAttribute('class');
  if (!mic.includes('mic-on')) throw new Error('mic indicator not on: ' + mic);
  await shot('06b-voice');
  await wait(1200);
  await page.keyboard.press('`');
  await wait(200);
  await page.keyboard.type('shell ram');
  await page.keyboard.press('Enter');
  await wait(800);
  await shot('07-debug-ram');
  const st = await page.evaluate(() => {
    const s = window.__yappemon.state();
    return s && { tick: s.tick, hp: s.trainers.map((t) => t.team.map((c) => Math.ceil(c.hp))), fields: s.trainers.map((t) => t.field) };
  });
  console.log('state:', JSON.stringify(st));
  if (full) {
    for (let i = 0; i < 400; i++) {
      const res = await page.evaluate(() => window.__yappemon.state()?.result ?? null);
      if (res) break;
      const s = await page.evaluate(() => {
        const s = window.__yappemon.state();
        const t = s.trainers[0];
        return { field: t.field, species: t.team[t.active].species, q: t.queue.length + (t.action ? 1 : 0) };
      });
      if (s.field === 'choosing') await say('second');
      else if (s.q < 2) {
        const fam = { cindrix: 'cinder spit then shell ram', brinkle: 'water jet then bubble bump', vinram: 'leaf volley then horn charge', joltmoth: 'spark dart then wing flick' };
        const moves = { ...fam, pyroxen: fam.cindrix, calderox: fam.cindrix, tsunafin: fam.brinkle, abyssmaw: fam.brinkle, thornhorn: fam.vinram, elderoot: fam.vinram, stormoth: fam.joltmoth, tempestra: fam.joltmoth };
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
