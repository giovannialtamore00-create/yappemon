// Spectator room test over the real PeerJS broker: one page hosts as spectator, two pages join and play.
// Checks: both players get distinct sides, all three see the same HP, the spectator sees the end screen
// and can start a rematch, and a player leaving is reported.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('screenshots/spectator', { recursive: true });
const server = await createServer({ server: { port: 5193 }, logLevel: 'error' });
await server.listen();
const url = process.argv[2] ?? server.resolvedUrls.local[0];
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
  await page.goto(url);
  await page.waitForTimeout(800);
  return { page, ctx };
}
const say = (p, t) => p.evaluate((x) => window.__yappemon.say(x), t);
const hp = (p) => p.evaluate(() => { const s = window.__yappemon.state(); return s && JSON.stringify(s.trainers.map((t) => t.team.map((c) => Math.ceil(c.hp)))); });
const pick = async (p, a, b) => {
  await p.locator('.creature-card').nth(a).click();
  await p.locator('.creature-card').nth(b).click();
  await p.getByRole('button', { name: /Ready/ }).click();
  // Move-choice panel before every round: keep the default moves and press Ready.
  await p.evaluate(() => { window.setInterval(() => { const b = document.querySelector('.loadout .btn.primary'); if (b && !b.disabled) b.click(); }, 300); });
};
let ok = true;
const fail = (m) => { ok = false; errors.push(m); };
try {
  const S = await open('spectator');
  const A = await open('playerA');
  const B = await open('playerB');
  await S.page.getByRole('button', { name: /Host as spectator/ }).click();
  await S.page.locator('.room-code').waitFor({ timeout: 20000 });
  const code = (await S.page.locator('.room-code').textContent()).trim();
  console.log('room', code);
  for (const P of [A, B]) {
    await P.page.locator('.code-input').fill(code);
    await P.page.getByRole('button', { name: /^Join$/ }).click();
    await P.page.locator('.creature-card').first().waitFor({ timeout: 25000 });
  }
  console.log('spectator status:', (await S.page.locator('.card .muted').first().textContent()).trim());
  await S.page.screenshot({ path: 'screenshots/spectator/01-waiting.png' });
  await pick(A.page, 0, 1);
  await pick(B.page, 2, 3);
  for (const P of [S, A, B]) await P.page.waitForFunction(() => window.__yappemon.state() !== null, null, { timeout: 10000 });
  const meA = await A.page.evaluate(() => window.__yappemon.app.battle.me);
  const meB = await B.page.evaluate(() => window.__yappemon.app.battle.me);
  console.log('player sides:', meA, meB);
  if (meA === meB) fail('both players control the same side');
  if (!(await S.page.evaluate(() => window.__yappemon.app.battle.spectator))) fail('host is not in spectator mode');
  await S.page.waitForTimeout(2000);
  await say(A.page, 'cinder spit');
  await say(B.page, 'leaf volley');
  await S.page.waitForTimeout(800);
  await S.page.screenshot({ path: 'screenshots/spectator/02-spectator-view.png' });
  await A.page.screenshot({ path: 'screenshots/spectator/03-player-a.png' });
  await S.page.waitForTimeout(3000);
  const hs = await hp(S.page); await A.page.waitForTimeout(300); const ha = await hp(A.page); const hb = await hp(B.page);
  console.log('hp spectator/A/B:', hs, ha, hb);
  if (hs !== ha || hs !== hb) fail('HP differs between spectator and players');
  if (hs === '[[110,120],[125,95]]') fail('commands had no effect');
  // Spectator can't command.
  await say(S.page, 'magma burst');
  // Finish the match quickly: knock out player B's side on the authoritative (spectator) sim.
  for (let round = 0; round < 3; round++) {
    const done = await S.page.evaluate(() => !!window.__yappemon.state().result);
    if (done) break;
    if (round > 0) { await S.page.waitForTimeout(2500); await S.page.screenshot({ path: `screenshots/spectator/evo-round${round + 1}.png` }); }
    await S.page.waitForFunction(() => window.__yappemon.state().intermission === 0, null, { timeout: 60000 }).catch(async (e) => { console.log('DIAG', await S.page.evaluate(() => { const s = window.__yappemon.state(); return JSON.stringify({ tick: s.tick, round: s.round, inter: s.intermission, score: s.score, res: s.result, f: s.trainers.map((t) => t.field) }); }), await S.page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const t1 = window.__yappemon.state().tick; const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(JSON.stringify({ fps: n / 2, ticksPerSec: (window.__yappemon.state().tick - t1) / 2, hidden: document.hidden, evo: !!window.__yappemon.app.battle?.view?.evo })); }; requestAnimationFrame(f); }))); throw e; });
    await S.page.evaluate(() => { for (const c of window.__yappemon.state().trainers[1].team) c.hp = 0.5; });
    for (let i = 0; i < 40; i++) {
      const st = await S.page.evaluate(() => { const s = window.__yappemon.state(); return { inter: s.intermission, res: !!s.result }; });
      if (st.inter > 0 || st.res) break;
      for (const [P, me] of [[A, meA], [B, meB]]) {
        const info = await P.page.evaluate((m) => { const t = window.__yappemon.state().trainers[m]; return { f: t.field, busy: !!t.action || t.queue.length > 0 }; }, me);
        if (info.f === 'choosing') await say(P.page, 'second');
        else if (!info.busy && me === 0) await say(P.page, 'shell ram');
      }
      await S.page.waitForTimeout(500);
    }
  }
  await S.page.locator('.end-title').waitFor({ timeout: 15000 });
  const title = await S.page.locator('.end-title').textContent();
  console.log('spectator end screen:', title);
  await S.page.screenshot({ path: 'screenshots/spectator/04-end.png' });
  if (!/Player 1 wins/.test(title)) fail('unexpected end title: ' + title);
  await S.page.getByRole('button', { name: /Rematch/ }).click();
  await A.page.locator('.creature-card').first().waitFor({ timeout: 8000 });
  await B.page.locator('.creature-card').first().waitFor({ timeout: 8000 });
  console.log('rematch → both players at team select');
  await B.ctx.close();
  await S.page.getByText(/Opponent disconnected/).waitFor({ timeout: 12000 });
  await A.page.getByText(/Opponent disconnected/).waitFor({ timeout: 12000 });
  console.log('player leaving reported to spectator and other player');
} catch (e) {
  fail('script: ' + e.message);
} finally {
  await browser.close();
  await server.close();
}
if (!ok) { console.error('FAIL\n' + errors.join('\n')); process.exit(1); }
console.log('spectator test OK');
