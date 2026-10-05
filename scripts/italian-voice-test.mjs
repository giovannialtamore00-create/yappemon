// Italian voice check: picks "Italiano" in the lobby, verifies the recognizer is set to it-IT, then
// "speaks" every Italian move name (all 12 forms, all 24 moves) plus the universal commands through
// the same recognizer callback a real microphone uses, and checks each one reaches the creature.
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 5190 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
await page.addInitScript(() => {
  class FakeRec { constructor() { window.__rec = this; } start() { setTimeout(() => this.onstart && this.onstart(), 10); } stop() {} abort() {} }
  window.SpeechRecognition = FakeRec;
  window.webkitSpeechRecognition = FakeRec;
  window.__speak = (t) => window.__rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: t, confidence: 0.9 }], { isFinal: true })] });
});
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const results = [];
const check = (ok, label) => { results.push(`${ok ? 'OK  ' : 'FAIL'} ${label}`); if (!ok) errors.push(label); };

// Italian names per stage-1 family, in the order the creature learns them.
const IT = {
  cindrix: ['Carica Corazzata', 'Sputo di Brace', 'Guscio Rovente', 'Esplosione di Magma', 'Balzo Fuso', 'Rovina Vulcanica'],
  brinkle: ['Spinta di Bolla', "Getto d'Acqua", 'Pioggia Curativa', 'Schianto di Marea', 'Specchio di Marea', 'Gorgo Abissale'],
  vinram: ['Carica di Corna', 'Raffica di Foglie', 'Laccio di Liane', 'Terremoto di Spine', 'Carica di Rovi', 'Fioritura Antica'],
  joltmoth: ['Colpo d\'Ala', 'Dardo Scintilla', 'Campo Statico', 'Lancia di Tuono', 'Tempesta a Catena', 'Giudizio Celeste'],
};
const ORDER = ['cindrix', 'brinkle', 'vinram', 'joltmoth'];

const state = () => page.evaluate(() => {
  const s = window.__yappemon.state(); const t = s.trainers[0];
  return { sp: t.team[t.active].species, active: t.active, field: t.field, run: t.action && t.action.action, queue: t.queue, dodgeReady: t.dodgeReady, dodgeDir: t.dodgeDir, alert: t.alertTicks };
});
/** Speak, then return the moves the creature accepted (current action + queue). */
async function speak(text) {
  // Every learned move is tested, so give each creature its whole pool (normally only the 4 chosen moves are understood).
  await page.evaluate(async () => { const { SPECIES } = await import('/src/sim/data.ts'); const r = window.__yappemon.app.battle.session.runner; const t = r.state.trainers[0]; t.action = null; t.queue = []; t.dodgeReady = 0; t.dodgeDir = 0; for (const c of t.team) { c.stamina = 100; c.moves = [...SPECIES[c.species].moves]; } });
  await page.evaluate((t) => window.__speak(t), text);
  // Wait for the sim to pick the command up (the first frames of a new match can be slow).
  await page.waitForFunction(() => { const t = window.__yappemon.state().trainers[0]; return !!t.action || t.queue.length > 0; }, null, { timeout: 1000 }).catch(() => {});
  await page.waitForTimeout(80);
  const s = await state();
  const transcript = await page.locator('.transcript').textContent();
  return { acts: [s.run, ...s.queue].filter(Boolean), transcript, s };
}

try {
  await page.goto(`${url}?seed=9&botTeam=vinram,brinkle&bot=passive&loadout=0`);
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Italiano' }).click();
  await page.waitForTimeout(200);
  for (const [fi, fam] of ORDER.entries()) {
    // New practice match with this family as the lead creature.
    await page.getByRole('button', { name: /Allenamento/ }).click();
    await page.locator('.creature-card').nth(fi).click();
    await page.locator('.creature-card').nth((fi + 1) % 4).click();
    await page.getByRole('button', { name: /Pronto/ }).click();
    await page.waitForFunction(() => window.__yappemon.state()?.trainers[0].field === 'active', null, { timeout: 8000 });
    if (fi === 0) {
      const lang = await page.evaluate(() => window.__rec.lang);
      check(lang === 'it-IT', `recognizer language = ${lang}`);
    }
    for (let stage = 1; stage <= 3; stage++) {
      if (stage > 1) {
        // Jump the authoritative sim to the next round (both trainers evolve). Alternate the loser so
        // it's 1–1 after round 2 and round 3 is played.
        const loser = stage === 2 ? 1 : 0;
        const next = await page.evaluate((l) => { const s = window.__yappemon.state(); for (const c of s.trainers[l].team) c.hp = 0; s.trainers[l].field = 'out'; return s.round + 1; }, loser);
        await page.waitForFunction(() => window.__yappemon.state().intermission > 0, null, { timeout: 5000 });
        await page.evaluate(() => { window.__yappemon.state().intermission = 1; });
        await page.waitForFunction((r) => { const s = window.__yappemon.state(); return s.round === r && s.intermission === 0 && s.trainers[0].field === 'active'; }, next, { timeout: 8000 });
      }
      const sp = (await state()).sp;
      for (const name of IT[fam].slice(0, 3 + stage)) {
        const r = await speak(name);
        const ok = r.acts.length === 1 && r.acts[0].kind === 'move';
        check(ok, `[${sp}] "${name}" → ${ok ? r.acts[0].move : JSON.stringify(r.acts)}`);
      }
      if (stage === 1) {
        const [m1, m2] = IT[fam];
        const chain = await speak(`${m2} poi ${m1} e poi schiva`);
        check(chain.acts.length === 3 && chain.acts[2].kind === 'dodge', `[${sp}] chain "${m2} poi ${m1} e poi schiva" → ${chain.acts.map((a) => a.move ?? a.kind).join(', ')}`);
        const usa = await speak(`usa ${m2} quindi ${m1}`);
        check(usa.acts.length === 2, `[${sp}] "usa ${m2} quindi ${m1}" → ${usa.acts.map((a) => a.move ?? a.kind).join(', ')}`);
      }
    }
    if (fi === 0) {
      // Universal commands, said in Italian.
      // A lone dodge doesn't queue: it arms the 2 s dodge window right away.
      const d = await speak('schiva');
      check(d.s.dodgeReady > 0 && d.s.dodgeDir === 0, `"schiva" arms the dodge window (${d.s.dodgeReady} ticks)`);
      const dr = await speak('schiva a destra');
      check(dr.s.dodgeReady > 0 && dr.s.dodgeDir === 1, `"schiva a destra" → side ${dr.s.dodgeDir}`);
      const al = await speak('attento');
      check(al.acts[0]?.kind === 'alert' && al.s.alert > 0, `"attento" → ${al.acts[0]?.kind}`);
      await page.evaluate(() => window.__speak('esplosione di magma poi sputo di brace'));
      await page.evaluate(() => window.__speak('fermati'));
      await page.waitForTimeout(120);
      check((await state()).queue.length === 0, '"fermati" clears the queue');
      const back = await speak('rientra');
      check(back.acts[0]?.kind === 'recall', `"rientra" → ${back.acts[0]?.kind}`);
      await page.waitForTimeout(2800);
      check((await state()).active === 1, '"rientra" swapped to the second creature');
      const vai = await speak('vai ' + 'Calderox');
      await page.waitForTimeout(2800);
      check((await state()).active === 0, '"vai Calderox" (name of the evolved lead) swapped back');
      // Forced switch: "secondo".
      await page.evaluate(() => { const t = window.__yappemon.state().trainers[0]; t.team[t.active].hp = 0.3; });
      await page.evaluate(() => { const r = window.__yappemon.app.battle.session.runner; r.queue(1, [{ type: 'queue', actions: [{ kind: 'move', move: 'horn_charge' }] }]); });
      await page.waitForFunction(() => window.__yappemon.state().trainers[0].field === 'choosing', null, { timeout: 8000 }).catch(() => {});
      if ((await state()).field === 'choosing') {
        await page.evaluate(() => window.__speak('il secondo'));
        await page.waitForTimeout(300);
        check((await state()).active === 1, '"il secondo" picks the second creature at a forced switch');
      } else check(false, 'forced switch did not happen (test setup)');
      void vai;
    }
    const ui = await page.locator('.cmds').textContent();
    check(/schiva/.test(ui) && /attento/.test(ui), `HUD in Italian ("${ui.trim()}")`);
    await page.getByRole('button', { name: /Esci/ }).click();
    await page.waitForTimeout(400);
  }
} catch (e) {
  errors.push('script: ' + e.message);
} finally {
  await browser.close();
  await server.close();
}
console.log(results.join('\n'));
console.log(errors.length ? `\nFAIL (${errors.length})\n` + errors.join('\n') : `\nitalian voice test OK (${results.length} checks)`);
process.exit(errors.length ? 1 : 0);
