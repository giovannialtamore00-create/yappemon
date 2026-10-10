// Visual check: fires the 8 off-type evolution moves (the creature is swapped to its evolved form in the sim state).
// Usage: node scripts/offtype-shots.mjs  -> screenshots/offtype
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const CASES = [
  ['pyroxen', 'rock hurl', 'rock_hurl', 900], ['tsunafin', 'frost fin', 'frost_fin', 900],
  ['thornhorn', 'toxic thorns', 'toxic_thorns', 900], ['stormoth', 'gale slash', 'gale_slash', 800],
  ['calderox', 'tremor crush', 'tremor_crush', 2300], ['abyssmaw', 'void bite', 'void_bite', 1600],
  ['elderoot', 'mind bloom', 'mind_bloom', 2100], ['tempestra', 'razor pinion', 'razor_pinion', 1900],
];
mkdirSync('screenshots/offtype', { recursive: true });
const server = await createServer({ server: { port: 5197 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
try {
  for (const [sp, say, move, at] of CASES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => errors.push(`${sp}: ${e.message}`));
    await page.goto(`${url}?seed=3&botTeam=brinkle,vinram&bot=passive&loadout=0`);
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /Practice/ }).click();
    await page.locator('.creature-card').nth(0).click();
    await page.locator('.creature-card').nth(1).click();
    await page.getByRole('button', { name: /Ready/ }).click();
    await page.waitForTimeout(2200);
    await page.evaluate(([s, m]) => { const c = window.__yappemon.state().trainers[0].team[0]; c.species = s; c.moves = [c.moves[0], c.moves[1], c.moves[2], m]; c.stamina = 100; }, [sp, move]);
    await page.evaluate((m) => window.__yappemon.say(m), say);
    await page.waitForTimeout(at);
    await page.screenshot({ path: `screenshots/offtype/${move}.png` });
    const used = await page.evaluate((m) => window.__yappemon.state().trainers[0].team[0].used?.[m], move);
    console.log(move, 'used', used);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'offtype shots OK');
