// Personal encouragement words (M21): type, "mic test" (fake heard words), play, see the effect. Screenshots in screenshots/cheer-custom.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const OUT = 'screenshots/cheer-custom';
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
const slot = (i) => page.locator('.cheer-slot').nth(i);
const msg = (i) => slot(i).locator('.cheer-msg').textContent();
const verified = (i) => slot(i).locator('.name-input.verified').count();
const stamina = () => page.evaluate(() => { const t = window.__yappemon.app.battle.session.runner.state.trainers[0]; return t.team[t.active].stamina; });
try {
  await page.goto(`${url}?seed=3&rename=1&botTeam=vinram,brinkle&bot=passive&loadout=0`);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /Practice/ }).click();
  await page.locator('.creature-card').nth(0).click();
  await page.locator('.creature-card').nth(1).click();
  await page.getByRole('button', { name: /Ready/ }).click();
  await page.waitForSelector('.cheer-slot');
  await page.locator('.rename-card').evaluate((e) => e.scrollTo(0, e.scrollHeight));

  await slot(0).locator('input').fill('Forza'); // existing command word
  await slot(0).getByRole('button').click();
  check((await msg(0)).length > 0 && (await verified(0)) === 0, 'a word that is already a command is refused');

  await slot(0).locator('input').fill('Bravissimo');
  await slot(0).getByRole('button').click();
  await page.evaluate(() => window.__yappemon.hear(['pizza']));
  check((await verified(0)) === 0 && /pizza/.test(await msg(0)), 'wrong word heard: stays not green, shows what was heard');
  await page.evaluate(() => window.__yappemon.hear(['bravissimo']));
  check((await verified(0)) === 1, 'right word heard: slot turns green');
  await page.screenshot({ path: `${OUT}/1-slot-green.png` });

  await slot(1).locator('input').fill('Gogo'); // typed but never tested
  await page.getByRole('button', { name: 'Done' }).click();
  await page.waitForFunction(() => window.__yappemon.state()?.trainers[0].field === 'active', null, { timeout: 10000 });
  const words = (await page.locator('.words-box .word').allTextContents()).filter(Boolean);
  check(words.includes('Bravissimo') && !words.includes('Gogo'), `Words box shows only the tested word (${words.join('|')})`);

  await page.evaluate(() => { const t = window.__yappemon.app.battle.session.runner.state.trainers[0]; t.team[t.active].stamina = 40; t.team[t.active].regenPause = 99999; });
  await page.evaluate(() => window.__yappemon.say('bravissimo'));
  await page.waitForFunction(() => [...document.querySelectorAll('.words-box .word.said')].some((e) => e.textContent === 'Bravissimo'), null, { timeout: 1500 }).then(() => check(true, 'word lights green in battle'), () => check(false, 'word lights green in battle'));
  const st = await stamina();
  check(st >= 44 && st < 47, `stamina 40 → ~45 (${st.toFixed(1)})`);
  check((await page.locator('.bf-cheer .bf-word').allTextContents()).includes('Bravissimo!'), 'flash word over the creature');
  await page.screenshot({ path: `${OUT}/2-battle.png` });
} catch (e) { errors.push(String(e)); }
console.log(results.join('\n'));
if (errors.length) console.log('ERRORS:', errors.join('; '));
await browser.close();
await server.close();
process.exit(errors.length ? 1 : 0);
