// Flow test: Italian UI, forced switch chosen by voice, leave button back to lobby, phone layout.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('screenshots/flow', { recursive: true });
const server = await createServer({ server: { port: 5196 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const check = (cond, msg) => { if (!cond) errors.push(msg); };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => {
    class FakeRec { constructor() { window.__rec = this; } start() { setTimeout(() => this.onstart && this.onstart(), 10); } stop() {} abort() {} }
    window.SpeechRecognition = FakeRec;
    window.webkitSpeechRecognition = FakeRec;
    window.__speak = (t) => window.__rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: t, confidence: 0.9 }], { isFinal: true })] });
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(`${url}?seed=11&botTeam=brinkle,vinram`);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Italiano' }).click();
  await page.waitForTimeout(300);
  await page.locator('.howto summary').click();
  await page.screenshot({ path: 'screenshots/flow/01-lobby-it.png' });
  check(await page.getByRole('button', { name: /Allenamento/ }).isVisible(), 'Italian lobby not shown');
  await page.getByRole('button', { name: /Allenamento/ }).click();
  await page.locator('.creature-card').nth(0).click(); // cindrix (weak vs brinkle)
  await page.locator('.creature-card').nth(2).click(); // vinram
  await page.screenshot({ path: 'screenshots/flow/02-team-it.png' });
  await page.getByRole('button', { name: /Pronto/ }).click();
  // Move-choice panel before every round: keep the default moves and press Ready.
  await page.evaluate(() => { window.setInterval(() => { const b = document.querySelector('.loadout .btn.primary'); if (b && !b.disabled) b.click(); }, 300); });
  await page.waitForTimeout(1500);
  // Make the lead creature fragile so the bot knocks it out quickly.
  await page.evaluate(() => { window.__yappemon.state().trainers[0].team[0].hp = 3; });
  await page.locator('.switch').waitFor({ timeout: 20000 });
  await page.screenshot({ path: 'screenshots/flow/03-switch-prompt.png' });
  await page.evaluate(() => window.__speak('vai con il secondo'));
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => { const t = window.__yappemon.state().trainers[0]; return { field: t.field, active: t.active }; });
  check(after.active === 1 && after.field !== 'choosing', 'voice forced switch failed: ' + JSON.stringify(after));
  check(!(await page.locator('.switch').isVisible().catch(() => false)), 'switch prompt still open');
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__speak('laccio di liane poi terremoto di spine'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/flow/04-battle-it.png' });
  const q = await page.evaluate(() => { const t = window.__yappemon.state().trainers[0]; return [t.action?.action, ...t.queue].map((a) => a && a.move); });
  check(q.includes('vine_snare') || q.includes('thorn_quake'), 'Italian chain not queued: ' + JSON.stringify(q));
  await page.getByRole('button', { name: /Esci/ }).click();
  await page.waitForTimeout(500);
  check(await page.locator('.lobby-card').isVisible(), 'leave did not return to lobby');
  // Phone-sized layout sanity check.
  await page.setViewportSize({ width: 390, height: 780 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'screenshots/flow/05-phone-lobby.png' });
  await page.getByRole('button', { name: /Allenamento/ }).click();
  await page.locator('.creature-card').nth(1).click();
  await page.locator('.creature-card').nth(3).click();
  await page.getByRole('button', { name: /Pronto/ }).click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/flow/06-phone-battle.png' });
} catch (e) {
  errors.push('script: ' + e.message);
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) { console.error('FAIL\n' + errors.join('\n')); process.exit(1); }
console.log('flow test OK');
