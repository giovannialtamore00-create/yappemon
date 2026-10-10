// Manual movement: pick Manual in the lobby, hold WASD in a practice match and watch the creature move;
// Automatic still drifts by itself. Sim maths: tests/sim.test.ts.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const OUT = 'screenshots/wasd';
mkdirSync(OUT, { recursive: true });
const server = await createServer({ server: { port: 5195 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
const results = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const check = (ok, label) => { results.push(`${ok ? 'OK  ' : 'FAIL'} ${label}`); if (!ok) errors.push(label); };
const pos = () => page.evaluate(() => { const t = window.__yappemon.state().trainers[0]; return { x: t.x, z: t.z, manual: t.manual }; });

async function startMatch(manualLabel) {
  await page.goto(`${url}?seed=3&botTeam=vinram,brinkle&bot=passive&loadout=0`);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: manualLabel }).click();
  await page.getByRole('button', { name: /Practice/ }).click();
  await page.locator('.creature-card').nth(0).click();
  await page.locator('.creature-card').nth(1).click();
  await page.getByRole('button', { name: /Ready/ }).click();
  await page.waitForFunction(() => window.__yappemon.state()?.trainers[0].field === 'active', null, { timeout: 10000 });
}

try {
  await startMatch(/Manual/);
  await page.waitForTimeout(300);
  const a = await pos();
  check(a.manual === true, 'Manual selected → sim trainer is manual');
  await page.waitForTimeout(1000);
  const still = await pos();
  check(still.x === a.x && still.z === a.z, `no keys → stands still (x ${a.x.toFixed(2)})`);
  await page.keyboard.down('d'); await page.waitForTimeout(800); await page.keyboard.up('d');
  const d = await pos();
  check(d.x > still.x + 0.5, `D moves right (x ${still.x.toFixed(2)} → ${d.x.toFixed(2)})`);
  await page.keyboard.down('a'); await page.waitForTimeout(800); await page.keyboard.up('a');
  const aa = await pos();
  check(aa.x < d.x - 0.5, `A moves left (x ${d.x.toFixed(2)} → ${aa.x.toFixed(2)})`);
  await page.keyboard.down('w'); await page.waitForTimeout(1200); await page.keyboard.up('w');
  const w = await pos();
  check(w.z < aa.z - 0.3, `W moves toward the opponent (z ${aa.z.toFixed(2)} → ${w.z.toFixed(2)})`);
  await page.keyboard.down('s'); await page.waitForTimeout(1200); await page.keyboard.up('s');
  const s = await pos();
  check(s.z > w.z + 0.3, `S moves away (z ${w.z.toFixed(2)} → ${s.z.toFixed(2)})`);
  await page.screenshot({ path: `${OUT}/manual.png` });

  await startMatch(/Automatic/);
  const b = await pos();
  await page.waitForTimeout(1500);
  const c = await pos();
  check(c.manual === false && c.x !== b.x, `Automatic still drifts by itself (x ${b.x.toFixed(2)} → ${c.x.toFixed(2)})`);
} catch (e) {
  errors.push('script: ' + e.message);
}
console.log(results.join('\n'));
await browser.close();
await server.close();
if (errors.length) { console.log('FAILED:\n' + errors.join('\n')); process.exit(1); }
console.log('wasd-test OK');
