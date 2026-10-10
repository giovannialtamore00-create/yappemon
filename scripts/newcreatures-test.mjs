// Plays a short practice match with each newest creature line (picked from the team screen) and fires its 4 base moves.
// Usage: node scripts/newcreatures-test.mjs  -> screenshots/newcreatures
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// [card index, other card index, moves said with the time (ms) to wait before the screenshot]
const LINES = {
  gravelo: [4, 5, [['pebble bump', 400], ['gravel shot', 700], ['stone skin', 500], ['fault quake', 1900]]],
  pipwing: [5, 6, [['beak peck', 400], ['feather dart', 700], ['dizzy gale', 800], ['hurricane', 1700]]],
  wispurr: [6, 4, [['paw tap', 400], ['psy orb', 700], ['calm mind', 700], ['mind crush', 1700]]],
  dusklet: [7, 8, [['shade nip', 400], ['spook bolt', 700], ['dread stare', 800], ['nightmare wave', 1700]]],
  scalet: [8, 9, [['claw swipe', 400], ['wyrm spit', 700], ['scale guard', 500], ['meteor fall', 1900]]],
  gloopit: [9, 7, [['goo slap', 400], ['acid spit', 700], ['sticky goo', 800], ['sludge wave', 1700]]],
};
const only = process.argv.slice(2).filter((a) => a in LINES);
mkdirSync('screenshots/newcreatures', { recursive: true });
const server = await createServer({ server: { port: 5195 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
let failed = 0;
try {
  for (const name of only.length ? only : Object.keys(LINES)) {
    const [a, b, moves] = LINES[name];
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    await page.goto(`${url}?seed=7&botTeam=vinram,brinkle&bot=passive&loadout=0`);
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /Practice/ }).click();
    await page.waitForTimeout(400);
    if (name === 'gravelo') await page.screenshot({ path: 'screenshots/newcreatures/team.png' });
    await page.locator('.creature-card').nth(a).click();
    await page.locator('.creature-card').nth(b).click();
    await page.getByRole('button', { name: /Ready/ }).click();
    await page.waitForTimeout(2500);
    for (const [m, at] of moves) {
      await page.evaluate((x) => window.__yappemon.say(x), m);
      await page.waitForTimeout(at);
      await page.screenshot({ path: `screenshots/newcreatures/${name}-${m.replace(' ', '_')}.png` });
      await page.waitForTimeout(2600 - at);
    }
    const s = await page.evaluate(() => { const st = window.__yappemon.state(); return { foeHp: st.trainers[1].team[0].hp, used: st.trainers[0].team[0].used }; });
    const ok = Object.values(s.used).filter((n) => n > 0).length === 4;
    if (!ok || s.foeHp >= 125) failed++;
    console.log(name, ok ? 'ok' : 'MOVES NOT ALL USED', JSON.stringify(s));
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length || failed ? 'ERRORS: ' + errors.join(' | ') + ' failed=' + failed : 'new creatures OK');
process.exitCode = errors.length || failed ? 1 : 0;
