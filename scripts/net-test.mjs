// Two-player test over the real public PeerJS broker: host + join in two headless pages,
// play a few commands from both sides, check states agree, rematch, then test disconnect handling.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('screenshots/net', { recursive: true });
const server = await createServer({ server: { port: 5197 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const fakeSpeech = () => {
  class FakeRec { start() { setTimeout(() => this.onstart && this.onstart(), 10); } stop() {} abort() {} }
  window.SpeechRecognition = FakeRec;
  window.webkitSpeechRecognition = FakeRec;
};
async function open(name) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 640 } });
  const page = await ctx.newPage();
  await page.addInitScript(fakeSpeech);
  page.on('pageerror', (e) => errors.push(`${name} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name} console: ${m.text()}`); });
  await page.goto(url);
  await page.waitForTimeout(800);
  return { page, ctx };
}
const say = (p, t) => p.evaluate((x) => window.__yappemon.say(x), t);
const st = (p) => p.evaluate(() => {
  const s = window.__yappemon.state();
  return s && { tick: s.tick, hp: s.trainers.map((t) => t.team.map((c) => Math.ceil(c.hp))), act: s.trainers.map((t) => !!t.action || t.queue.length > 0), result: s.result };
});
const pick = async (p, a, b) => {
  await p.locator('.creature-card').nth(a).click();
  await p.locator('.creature-card').nth(b).click();
  await p.getByRole('button', { name: /Ready/ }).click();
  await p.waitForSelector('.rename-card'); await p.waitForTimeout(400);
  await p.getByRole('button', { name: 'Done' }).click(); // rename screen: keep the names
  // Move-choice panel before every round: keep the default moves and press Ready.
  await p.evaluate(() => { window.setInterval(() => { const b = document.querySelector('.loadout .btn.primary'); if (b && !b.disabled) b.click(); }, 300); });
};

let ok = true;
try {
  const A = await open('host');
  const B = await open('client');
  await A.page.getByRole('button', { name: /Host game/ }).click();
  await A.page.locator('.room-code').waitFor({ timeout: 20000 });
  const code = (await A.page.locator('.room-code').textContent()).trim();
  console.log('room code', code);
  await A.page.screenshot({ path: 'screenshots/net/01-host-code.png' });
  await B.page.locator('.code-input').fill(code);
  await B.page.getByRole('button', { name: /^Join$/ }).click();
  await A.page.locator('.creature-card').first().waitFor({ timeout: 25000 });
  await B.page.locator('.creature-card').first().waitFor({ timeout: 25000 });
  console.log('connected; team select on both');
  await pick(B.page, 2, 1); // client: vinram, brinkle (ready first → waits)
  await B.page.waitForTimeout(300);
  await pick(A.page, 0, 3); // host: cindrix, joltmoth
  await A.page.waitForFunction(() => window.__yappemon.state() !== null, null, { timeout: 10000 });
  await B.page.waitForFunction(() => window.__yappemon.state() !== null, null, { timeout: 10000 });
  await A.page.waitForTimeout(1800);
  await say(A.page, 'cinder spit then shell ram');
  await say(B.page, 'leaf volley then horn charge');
  await A.page.waitForTimeout(700);
  await A.page.screenshot({ path: 'screenshots/net/02-host-view.png' });
  await B.page.screenshot({ path: 'screenshots/net/03-client-view.png' });
  await A.page.waitForTimeout(3500);
  const sa = await st(A.page);
  await B.page.waitForTimeout(400);
  const sb = await st(B.page);
  console.log('host  ', JSON.stringify(sa));
  console.log('client', JSON.stringify(sb));
  if (JSON.stringify(sa.hp) !== JSON.stringify(sb.hp)) { ok = false; errors.push('HP mismatch between host and client'); }
  if (sa.hp[0][0] === 110 || sa.hp[1][0] === 125) { ok = false; errors.push('commands from one side had no effect'); }

  // Host tab hidden + no animation frames: the worker ticker must keep the match running.
  const t0 = (await st(A.page)).tick;
  await A.page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    window.__raf = window.requestAnimationFrame;
    window.requestAnimationFrame = () => 0;
  });
  await A.page.waitForTimeout(1500);
  const t1 = (await st(A.page)).tick;
  await A.page.evaluate(() => {
    delete document.hidden;
    window.requestAnimationFrame = window.__raf;
    window.__yappemon.app.loop(performance.now());
  });
  console.log(`hidden host advanced ${t1 - t0} ticks in 1.5 s`);
  if (t1 - t0 < 30) { ok = false; errors.push('host sim stalled while hidden'); }

  // Play the match out quickly: host and client spam affordable moves until it ends.
  const fam = { cindrix: 'cinder spit', brinkle: 'water jet', vinram: 'leaf volley', joltmoth: 'spark dart' };
  const moves = { ...fam, pyroxen: fam.cindrix, calderox: fam.cindrix, tsunafin: fam.brinkle, abyssmaw: fam.brinkle, thornhorn: fam.vinram, elderoot: fam.vinram, stormoth: fam.joltmoth, tempestra: fam.joltmoth };
  for (let i = 0; i < 400; i++) {
    const done = await A.page.evaluate(() => !!window.__yappemon.state()?.result);
    if (done) break;
    for (const P of [A.page, B.page]) {
      const info = await P.evaluate(() => {
        const s = window.__yappemon.state(); const me = window.__yappemon.app.battle?.me ?? 0; const t = s.trainers[me];
        return { field: t.field, sp: t.team[t.active].species, busy: !!t.action || t.queue.length > 0 };
      });
      if (info.field === 'choosing') await say(P, 'second');
      else if (!info.busy) await say(P, moves[info.sp]);
    }
    await A.page.waitForTimeout(500);
  }
  await A.page.waitForTimeout(3500);
  await A.page.screenshot({ path: 'screenshots/net/04-host-end.png' });
  await B.page.screenshot({ path: 'screenshots/net/05-client-end.png' });
  const endA = await A.page.locator('.end-title').textContent().catch(() => null);
  const endB = await B.page.locator('.end-title').textContent().catch(() => null);
  console.log('end screens:', endA, '/', endB);
  if (!endA || !endB) { ok = false; errors.push('end screen missing'); }

  // Rematch: both accept → both back at team select.
  await B.page.getByRole('button', { name: /Rematch/ }).click();
  await A.page.waitForTimeout(800);
  const statusA = await A.page.locator('.end .muted').first().textContent();
  console.log('host sees:', statusA);
  await A.page.getByRole('button', { name: /Rematch/ }).click();
  await A.page.locator('.creature-card').first().waitFor({ timeout: 8000 });
  await B.page.locator('.creature-card').first().waitFor({ timeout: 8000 });
  console.log('rematch → both at team select');

  // Disconnect: close the client; the host must notice.
  await B.ctx.close();
  await A.page.getByText(/Opponent disconnected/).waitFor({ timeout: 12000 });
  await A.page.screenshot({ path: 'screenshots/net/06-disconnected.png' });
  console.log('disconnect detected');
} catch (e) {
  ok = false;
  errors.push('script: ' + e.message);
} finally {
  await browser.close();
  await server.close();
}
const real = errors.filter((e) => !/WebSocket|ERR_|net::|Failed to load resource/i.test(e) || e.startsWith('script'));
if (!ok || real.length) { console.error('FAIL\n' + errors.join('\n')); process.exit(1); }
console.log('net test OK');
