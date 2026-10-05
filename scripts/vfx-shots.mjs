// Visual check: fires every move of every creature against a passive bot and screenshots them.
// Usage: node scripts/vfx-shots.mjs [species...]
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const ORDER = ['cindrix', 'brinkle', 'vinram', 'joltmoth'];
const MOVES = {
  cindrix: [['shell ram', 450], ['cinder spit', 600], ['heat shell', 500], ['magma burst', 1500]],
  brinkle: [['bubble bump', 420], ['water jet', 650], ['healing rain', 900], ['tidal crash', 1550]],
  vinram: [['horn charge', 500], ['leaf volley', 700], ['vine snare', 750], ['thorn quake', 1750]],
  joltmoth: [['wing flick', 330], ['spark dart', 470], ['static field', 650], ['thunder lance', 1050]],
};
const only = process.argv.slice(2).filter((a) => ORDER.includes(a));
mkdirSync('screenshots/vfx', { recursive: true });

const server = await createServer({ server: { port: 5198 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
try {
  for (const sp of only.length ? only : ORDER) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => errors.push(`${sp}: ${e.message}`));
    const foe = sp === 'brinkle' ? 'cindrix,vinram' : 'brinkle,vinram';
    await page.goto(`${url}?seed=3&botTeam=${foe}&bot=passive&loadout=0`);
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /Practice/ }).click();
    await page.locator('.creature-card').nth(ORDER.indexOf(sp)).click();
    await page.locator('.creature-card').nth((ORDER.indexOf(sp) + 1) % 4).click();
    await page.getByRole('button', { name: /Ready/ }).click();
    await page.waitForTimeout(2200);
    for (const [move, at] of MOVES[sp]) {
      await page.evaluate((m) => window.__yappemon.say(m), move);
      await page.waitForTimeout(at);
      await page.screenshot({ path: `screenshots/vfx/${sp}-${move.replace(' ', '_')}.png` });
      await page.waitForTimeout(2600 - at);
    }
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'vfx shots OK');
