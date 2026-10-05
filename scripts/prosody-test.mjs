// Verbal boosts, real browser path: Chrome's fake microphone plays a synthetic WAV (normal words to
// calibrate, then a high-pitched, a sudden-loud and a long-held word) through getUserMedia → AudioWorklet
// → ProsodyAnalyzer, and the ?prosody=1 debug panel must report HYPE!, SNAP! and FULL POWER!.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SR = 48000;
const parts = [];
const silence = (d) => parts.push(new Float32Array(Math.round(d * SR)));
const word = ({ hz = 140, dur = 0.3, attackS = 0.08, amp = 0.1 }) => {
  const n = Math.round(dur * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, env = Math.min(1, t / attackS, (dur - t) / 0.02);
    let s = 0;
    for (let h = 1; h <= 5; h++) s += Math.sin(2 * Math.PI * hz * h * t) / h;
    out[i] = amp * env * s * 0.6;
  }
  parts.push(out);
};
silence(0.8);
for (const w of [{}, {}, {}, {}, { hz: 230 }, { attackS: 0.003, amp: 0.35 }, { dur: 1.0 }]) { word(w); silence(0.7); }
const total = parts.reduce((n, p) => n + p.length, 0);
const wav = Buffer.alloc(44 + total * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + total * 2, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(total * 2, 40);
let o = 44;
for (const p of parts) for (const v of p) { wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), o); o += 2; }
const file = join(mkdtempSync(join(tmpdir(), 'yp-')), 'voice.wav');
writeFileSync(file, wav);

const server = await createServer({ server: { port: 5191 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${file}`,
    '--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(`${server.resolvedUrls.local[0]}?prosody=1`);
  await page.locator('#prosody-debug button').click();
  // The file loops; one pass is total/SR seconds. Cap the wait at 10 s.
  const until = Date.now() + Math.min(10000, (total / SR) * 1000 + 1500);
  let text = '';
  while (Date.now() < until) {
    await page.waitForTimeout(250);
    text = await page.locator('#prosody-debug').innerText();
    if ((text.match(/held/g) ?? []).length >= 7) break;
  }
  console.log(text.split('\n').slice(0, 10).join('\n'));
  // newest first: each test word must be its own utterance with exactly its own boost
  const rows = text.split('\n').filter((l) => l.startsWith('attack') || l.startsWith('(calibrating)')).slice(0, 4);
  const want = [/held [\d.]+s FULL POWER!$/, /held [\d.]+s SNAP!$/, /held [\d.]+s HYPE!$/, /held [\d.]+s$/];
  want.forEach((re, i) => { if (!re.test(rows[i] ?? '')) errors.push(`row ${i}: expected ${re}, got "${rows[i]}"`); });
  if (!/calibrated/.test(text)) errors.push('never calibrated');
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length ? `FAIL\n${errors.join('\n')}` : 'PASS');
process.exit(errors.length ? 1 : 0);
