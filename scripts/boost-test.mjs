// Verbal boosts in a real match (M3): calibration prompt, a boost on a spoken command reaches the sim,
// the flash word shows over the creature (screenshots), and the FULL POWER chip sleeps for 60 s.
// The mic is Chrome's fake device; the voice measurement is replaced by `say(text, boost)` and a
// pre-filled baseline (the measurement itself is covered by tests/prosody.test.ts and prosody-test.mjs).
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const OUT = 'screenshots/boosts';
mkdirSync(OUT, { recursive: true });
const server = await createServer({ server: { port: 5192 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => {
  class FakeRec { constructor() { window.__rec = this; } start() { setTimeout(() => this.onstart && this.onstart(), 10); } stop() {} abort() {} }
  window.SpeechRecognition = FakeRec;
  window.webkitSpeechRecognition = FakeRec;
  // Commands typed by the test: drop the fake mic's beep utterances so they don't count as the player's voice.
  window.__say = (t, b) => { window.__yappemon.app.mic.recent = []; return window.__yappemon.say(t, b); };
  window.__final = (t) => window.__rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: t, confidence: 0.9 }], { isFinal: true })] });
});
const errors = [];
const results = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const check = (ok, label) => { results.push(`${ok ? 'OK  ' : 'FAIL'} ${label}`); if (!ok) errors.push(label); };
const me = () => page.evaluate(() => { const t = window.__yappemon.state().trainers[0]; return { action: t.action && t.action.action, total: t.action && t.action.total, stamina: t.team[t.active].stamina, cd: window.__yappemon.state().fullPowerCd[0] }; });
const calText = () => page.locator('.voice-cal').evaluate((e) => (e.classList.contains('hidden') ? '' : e.textContent));
/** Clears the creature so the next command starts at once, with full stamina. */
const reset = () => page.evaluate(() => { const t = window.__yappemon.app.battle.session.runner.state.trainers[0]; t.action = null; t.queue = []; t.team[t.active].stamina = 100; });

try {
  await page.goto(`${url}?seed=3&botTeam=vinram,brinkle&bot=passive&loadout=0`);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /Practice/ }).click();
  await page.locator('.creature-card').nth(0).click();
  await page.locator('.creature-card').nth(1).click();
  await page.getByRole('button', { name: /Ready/ }).click();

  // Pre-match voice check. The fake mic only beeps, so the beep is muted and each phrase comes with one
  // prepared normal-voice measurement, claimed through the real path (recognizer final → mic.take()).
  await page.locator('.voice-check').waitFor({ timeout: 3000 });
  check(await page.locator('.vcheck-word').count() === 4, 'voice check lists the move names');
  check(await page.evaluate(() => window.__yappemon.state() === null), 'match not started during the voice check');
  await page.waitForFunction(() => !!window.__yappemon.app.mic.analyzer, null, { timeout: 4000 });
  await page.evaluate(() => { window.__yappemon.app.mic.analyzer.onUtterance = () => {}; window.__yappemon.app.mic.recent = []; });
  for (let i = 0; i < 3; i++) {
    await page.evaluate((w) => {
      const u = { calibrated: false, strength: { snap: 0, hype: 0, full: 0 }, boosts: { snap: false, hype: false, full: false }, peakDb: -20, highHz: 160, longestS: 0.3 };
      window.__yappemon.app.mic.recent = [{ u, at: performance.now() }];
      window.__final(w);
    }, ['shell ram', 'cinder spit', 'heat shell'][i]);
    const lit = await page.waitForFunction((n) => document.querySelectorAll('.vcheck-dots span.on').length === n, i + 1, { timeout: 2000 }).then(() => true, () => false);
    check(lit, `voice check dot ${i + 1}/3 filled`);
    if (i === 0) await page.screenshot({ path: `${OUT}/voice-check.png` });
  }
  check(/Voice ready/.test(await page.locator('.vcheck-status').textContent({ timeout: 1000 }).catch(() => '')), 'voice check done message');
  await page.screenshot({ path: `${OUT}/voice-check-done.png` });
  await page.waitForFunction(() => window.__yappemon.state()?.trainers[0].field === 'active', null, { timeout: 8000 });
  check(await page.evaluate(() => window.__yappemon.app.mic.calibration().count === 3), 'calibrated before the match starts');
  check(await page.locator('.voice-cal').evaluate((e) => e.classList.contains('hidden')), 'no calibration prompt in the match');

  // In-match fallback prompt (e.g. after Skip): 0/3 → learn one normal command → 1/3 → three → "Voice ready", then hidden.
  await page.evaluate(() => window.__yappemon.app.mic.resetBaseline());
  await page.waitForFunction(() => !document.querySelector('.voice-cal').classList.contains('hidden'), null, { timeout: 2000 }).catch(() => {});
  check(/say 3 commands/.test(await calText()), `calibration prompt shown (${await calText()})`);
  const learn = () => page.evaluate(() => window.__yappemon.app.mic.analyzer.learn({ calibrated: false, strength: { snap: 0, hype: 0, full: 0 }, peakDb: -20, highHz: 160, longestS: 0.3 }));
  await learn();
  await page.waitForFunction(() => document.querySelectorAll('.voice-cal .vc-dots span.on').length === 1, null, { timeout: 2000 }).catch(() => {});
  const lit = await page.locator('.voice-cal .vc-dots span.on').count();
  check(lit === 1, `one calibration dot lit (${lit}) ${lit === 1 ? '' : await page.locator('.voice-cal').innerHTML()}`);
  await page.screenshot({ path: `${OUT}/calibrating.png` });
  await learn(); await learn();
  await page.waitForFunction(() => /Voice ready/.test(document.querySelector('.voice-cal').textContent), null, { timeout: 2000 }).catch(() => {});
  check(/Voice ready/.test(await calText()), 'calibration done message');
  await page.screenshot({ path: `${OUT}/calibrated.png` });
  check(await page.locator('.fp-chip').evaluate((e) => !e.classList.contains('hidden') && !e.classList.contains('sleeping')), 'FULL POWER chip ready');

  // No boost: plain command keeps the old behaviour.
  await reset();
  await page.evaluate(() => window.__say('cinder spit'));
  await page.waitForTimeout(80);
  const plain = await me();
  check(plain.action?.move === 'cinder_spit' && !plain.action.boost, `plain command, no boost (${JSON.stringify(plain.action)})`);

  // SNAP: shorter windup + flash.
  await page.waitForTimeout(2000); await reset();
  await page.evaluate(() => window.__say('cinder spit', 'snap'));
  await page.waitForTimeout(120);
  const snap = await me();
  check(snap.action?.boost === 'snap' && snap.total < plain.total, `SNAP windup ${snap.total} < ${plain.total} ticks`);
  check(await page.locator('.boost-flash.bf-snap').count() === 1, 'SNAP! flash shown');
  await page.screenshot({ path: `${OUT}/snap.png` });

  // HYPE: stamina refill + flash (boost goes on the first move of a chained command).
  await page.waitForTimeout(1500); await reset();
  await page.evaluate(() => { window.__yappemon.app.battle.session.runner.state.trainers[0].team[0].stamina = 50; window.__say('cinder spit then shell ram', 'hype'); });
  await page.waitForTimeout(120);
  const hype = await me();
  check(hype.action?.boost === 'hype' && hype.stamina > 50 - 20 + 9, `HYPE stamina ${hype.stamina.toFixed(1)}`);
  check(await page.evaluate(() => window.__yappemon.state().trainers[0].queue.every((a) => !a.boost)), 'boost only on the first move');
  check(await page.locator('.boost-flash.bf-hype').count() === 1, 'HYPE! flash shown');
  await page.screenshot({ path: `${OUT}/hype.png` });

  // FULL POWER: flash, then the chip sleeps with the seconds left; a second one is refused.
  await page.waitForTimeout(1500); await reset();
  await page.evaluate(() => window.__say('cinder spit', 'full'));
  await page.waitForTimeout(150);
  check((await me()).cd > 0, 'FULL POWER cooldown started');
  check(await page.locator('.boost-flash.bf-full').count() === 1, 'FULL POWER! flash shown');
  await page.screenshot({ path: `${OUT}/full.png` });
  await page.waitForTimeout(1300);
  const chip = await page.locator('.fp-chip').textContent();
  check(/ZZZ… (59|58|57)s/.test(chip), `chip sleeping: "${chip}"`);
  await page.screenshot({ path: `${OUT}/cooldown.png` });
  await reset();
  await page.evaluate(() => window.__say('cinder spit', 'full'));
  await page.waitForTimeout(150);
  check(!(await me()).action?.boost && await page.locator('.boost-flash.bf-full').count() === 0, 'second FULL POWER refused during cooldown');

  // Italian labels.
  await page.evaluate(async () => { const m = await import('/src/i18n.ts'); m.setLang('it'); });
  await page.waitForTimeout(1500); await reset();
  await page.evaluate(() => window.__say('sputo di brace', 'snap'));
  await page.waitForTimeout(150);
  check((await page.locator('.boost-flash .bf-word').allTextContents()).includes('SCATTO!'), 'Italian SCATTO! flash');
} finally {
  await browser.close();
  await server.close();
}
console.log(results.join('\n'));
console.log(errors.length ? `FAIL\n${errors.join('\n')}` : 'boost test OK');
process.exit(errors.length ? 1 : 0);
