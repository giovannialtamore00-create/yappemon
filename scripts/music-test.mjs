// Checks the battle music actually produces sound during a battle and stops afterwards.
import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ server: { port: 5192 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const rms = () => page.evaluate(() => new Promise((res) => {
  const sfx = window.__yappemon.app.sfx;
  const an = sfx.ctx.createAnalyser();
  an.fftSize = 2048;
  sfx.musicGain.connect(an);
  let sum = 0, n = 0;
  const buf = new Float32Array(an.fftSize);
  const iv = setInterval(() => { an.getFloatTimeDomainData(buf); for (const v of buf) { sum += v * v; n++; } }, 50);
  setTimeout(() => { clearInterval(iv); sfx.musicGain.disconnect(an); res(Math.sqrt(sum / n)); }, 1500);
}));
try {
  await page.goto(`${url}?seed=3&botTeam=vinram,brinkle&bot=passive`);
  await page.getByRole('button', { name: /Practice/ }).click();
  await page.locator('.creature-card').nth(0).click();
  await page.locator('.creature-card').nth(1).click();
  await page.getByRole('button', { name: /Ready/ }).click();
  await page.waitForTimeout(1500);
  console.log('audio context:', await page.evaluate(() => window.__yappemon.app.sfx.ctx.state));
  const during = await rms();
  console.log('music level in battle (RMS):', during.toFixed(4));
  await page.getByRole('button', { name: /Leave/ }).click();
  await page.waitForTimeout(1500);
  const after = await rms();
  console.log('music level in lobby (RMS):', after.toFixed(4));
  if (!(during > 0.01)) errors.push('no music during battle');
  if (!(after < during / 10)) errors.push('music did not stop after leaving');
} catch (e) { errors.push(e.message); }
await browser.close();
await server.close();
console.log(errors.length ? 'FAIL\n' + errors.join('\n') : 'music test OK');
process.exit(errors.length ? 1 : 0);
