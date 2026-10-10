// Visual check of the evolution stages: each line's three forms side by side (front 3/4 view and side view).
// Screenshots go to screenshots/creatures.  Usage: node scripts/creature-sheet.mjs
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const LINES = [['cindrix', 'pyroxen', 'calderox'], ['brinkle', 'tsunafin', 'abyssmaw'], ['vinram', 'thornhorn', 'elderoot'], ['joltmoth', 'stormoth', 'tempestra'],
  ['gravelo', 'boulderax', 'tectonyx'], ['pipwing', 'galehawk', 'zephyrion'], ['wispurr', 'mystiline', 'astralynx']];
mkdirSync('screenshots/creatures', { recursive: true });
const server = await createServer({ server: { port: 5196 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForTimeout(1500);
  for (const line of LINES) {
    for (const [view, yaw] of [['front', 0.55], ['side', 1.45]]) {
      await page.evaluate(async ({ line, yaw }) => {
        const { buildCreature } = await import('/src/render/creatures.ts');
        const app = window.__yappemon.app;
        app.showcase.hide();
        document.querySelector('#screens')?.replaceChildren();
        const ctx = app.ctx;
        for (const o of window.__lineup ?? []) ctx.scene.remove(o);
        window.__lineup = [];
        ctx.cameraMode = 'battle';
        ctx.setFocus(null);
        line.forEach((sp, i) => {
          const m = buildCreature(sp);
          m.root.position.set((i - 1) * 3.0, 0, 2.2);
          m.root.rotation.y = yaw;
          m.root.scale.setScalar(m.size * 1.0);
          m.animate(1.3, 0.016, 0, 0);
          ctx.scene.add(m.root);
          window.__lineup.push(m.root);
        });
      }, { line, yaw });
      await page.waitForTimeout(700);
      await page.screenshot({ path: `screenshots/creatures/${line[0]}-${view}.png` });
    }
  }
  await page.close();
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'creature sheet OK');
