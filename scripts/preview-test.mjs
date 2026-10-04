// Serves the production build under /yappemon/ (like GitHub Pages) and checks a battle starts.
import { chromium } from 'playwright';
import { preview } from 'vite';
const server = await preview({ base: '/yappemon/', preview: { port: 5195 }, logLevel: 'error' });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('requestfailed', (r) => errors.push('request failed: ' + r.url()));
try {
  await page.goto(url);
  await page.getByRole('button', { name: /Practice|Allenamento/ }).click();
  await page.locator('.creature-card').nth(1).click();
  await page.locator('.creature-card').nth(2).click();
  await page.getByRole('button', { name: /Ready|Pronto/ }).click();
  await page.waitForFunction(() => window.__yappemon.state()?.tick > 30, null, { timeout: 10000 });
} catch (e) { errors.push(e.message); }
await browser.close();
await new Promise((r) => server.httpServer.close(r));
console.log(url, errors.length ? 'FAIL\n' + errors.join('\n') : 'preview OK');
process.exit(errors.length ? 1 : 0);
