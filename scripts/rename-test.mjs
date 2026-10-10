// Rename (M4): in Practice, rename a creature and a move's first word; check the HUD shows them. Screenshots in screenshots/rename.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const OUT = 'screenshots/rename';
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
try {
  await page.goto(`${url}?seed=3&rename=1&botTeam=vinram,brinkle&bot=passive&loadout=0`);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /Practice/ }).click();
  await page.locator('.creature-card').nth(3).click(); // joltmoth
  await page.locator('.creature-card').nth(0).click(); // cindrix
  await page.getByRole('button', { name: /Ready/ }).click();
  await page.waitForSelector('.rename-card');
  await page.screenshot({ path: `${OUT}/1-rename.png` });
  const inputs = page.locator('.name-input');
  await inputs.nth(0).fill('Zappy');
  await inputs.nth(1).fill('Vinram'); // clashes with another creature
  await page.getByRole('button', { name: 'Done' }).click();
  check((await page.locator('.rename-err').textContent()).length > 0, 'clash with another creature is refused');
  await inputs.nth(1).fill('Blaze');
  const sparkIdx = await page.evaluate(() => [...document.querySelectorAll('.rename-move input')].findIndex((i) => i.placeholder === 'Spark'));
  await page.locator('.rename-move input').nth(sparkIdx).fill('Arrow');
  await page.getByRole('button', { name: 'Done' }).click();
  await page.waitForFunction(() => window.__yappemon.state()?.trainers[0].field === 'active', null, { timeout: 10000 });
  await page.waitForTimeout(500);
  const text = await page.evaluate(() => document.body.innerText);
  check(/Zappy/i.test(text), 'creature panel shows Zappy');
  check(/Arrow Dart/i.test(text), 'move card shows "Arrow Dart"');
  check(!/Spark Dart/i.test(text), 'old move name gone from cards');
  await page.screenshot({ path: `${OUT}/2-battle.png` });
} catch (e) { errors.push(String(e)); }
console.log(results.join('\n'));
if (errors.length) console.log('ERRORS:', errors.join('; '));
await browser.close();
await server.close();
process.exit(errors.length ? 1 : 0);
