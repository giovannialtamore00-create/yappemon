// Rename over the network (M6): host and client rename, each sees the other's names, and the new
// names work by voice. Needs internet (public PeerJS broker). Screenshots in screenshots/net-rename.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('screenshots/net-rename', { recursive: true });
const server = await createServer({ server: { port: 5198 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const errors = [];
const results = [];
const check = (ok, label) => { results.push(`${ok ? 'OK  ' : 'FAIL'} ${label}`); if (!ok) errors.push(label); };
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
  return page;
}
const say = (p, t) => p.evaluate((x) => window.__yappemon.say(x), t);
// Ready, then on the rename screen set the first creature's name and one move's first word.
async function pickAndRename(p, a, b, creature, moveHint, moveWord) {
  await p.locator('.creature-card').nth(a).click();
  await p.locator('.creature-card').nth(b).click();
  await p.getByRole('button', { name: /Ready/ }).click();
  await p.waitForSelector('.rename-card');
  await p.locator('.name-input').nth(0).fill(creature);
  const idx = await p.evaluate((h) => [...document.querySelectorAll('.rename-move input')].findIndex((i) => i.placeholder === h), moveHint);
  await p.locator('.rename-move input').nth(idx).fill(moveWord);
  await p.getByRole('button', { name: 'Done' }).click();
  await p.evaluate(() => { window.setInterval(() => { const b = document.querySelector('.loadout .btn.primary'); if (b && !b.disabled) b.click(); }, 300); });
}
try {
  const A = await open('host');
  const B = await open('client');
  await A.getByRole('button', { name: /Host game/ }).click();
  await A.locator('.room-code').waitFor({ timeout: 20000 });
  const code = (await A.locator('.room-code').textContent()).trim();
  await B.locator('.code-input').fill(code);
  await B.getByRole('button', { name: /^Join$/ }).click();
  await A.locator('.creature-card').first().waitFor({ timeout: 25000 });
  await B.locator('.creature-card').first().waitFor({ timeout: 25000 });
  await pickAndRename(B, 2, 1, 'Leafy', 'Leaf', 'Petal'); // client: vinram first
  await B.waitForTimeout(300);
  await pickAndRename(A, 0, 3, 'Blazey', 'Cinder', 'Ember'); // host: cindrix first
  for (const P of [A, B]) await P.waitForFunction(() => window.__yappemon.state()?.trainers[0].field === 'active', null, { timeout: 15000 });
  await A.waitForTimeout(800);
  for (const [n, P] of [['host', A], ['client', B]]) {
    const text = await P.evaluate(() => document.body.innerText);
    check(/Blazey/i.test(text) && /Leafy/i.test(text), `${n} sees both creature names`);
    await P.screenshot({ path: `screenshots/net-rename/${n}.png` });
  }
  const hpBefore = await B.evaluate(() => window.__yappemon.state().trainers[0].team[0].hp);
  await A.waitForTimeout(1500);
  await say(A, 'Blazey, Ember Spit'); // host: new creature name + new move word
  await A.waitForTimeout(500);
  const queued = await A.evaluate(() => { const t = window.__yappemon.state().trainers[0]; return !!t.action || t.queue.length > 0; });
  check(queued, 'host: "Blazey, Ember Spit" starts a move');
  await say(B, 'Petal Volley'); // client
  await B.waitForTimeout(500);
  const queuedB = await B.evaluate(() => { const t = window.__yappemon.state().trainers[1]; return !!t.action || t.queue.length > 0; });
  check(queuedB, 'client: "Petal Volley" starts a move');
  void hpBefore;
} catch (e) { errors.push(String(e)); }
console.log(results.join('\n'));
if (errors.length) console.log('ERRORS:', errors.join('; '));
await browser.close();
await server.close();
process.exit(errors.length ? 1 : 0);
