import { describe, expect, it } from 'vitest';
import { ProsodyAnalyzer, detectPitch, type Utterance } from '../src/voice/prosody';

const SR = 48000;

/** Seeded noise so tests are deterministic. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;
}

interface Word { hz?: number; dur?: number; attackS?: number; amp?: number }

/** A synthetic "word": harmonic voiced tone with a linear attack and short release. */
function word({ hz = 140, dur = 0.3, attackS = 0.08, amp = 0.1 }: Word, noise: () => number): Float32Array {
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  const rel = 0.02;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / Math.max(attackS, 1e-4), (dur - t) / rel);
    let s = 0;
    for (let h = 1; h <= 5; h++) s += Math.sin(2 * Math.PI * hz * h * t) / h;
    out[i] = amp * env * s * 0.6 + 0.001 * noise();
  }
  return out;
}

function silence(dur: number, noise: () => number) {
  const out = new Float32Array(Math.round(dur * SR));
  for (let i = 0; i < out.length; i++) out[i] = 0.001 * noise();
  return out;
}

/** Feeds words separated by silence in mic-sized chunks; returns the utterances detected. */
function run(words: Word[], noise = rng(7)): Utterance[] {
  const a = new ProsodyAnalyzer(SR);
  const got: Utterance[] = [];
  a.onUtterance = (u) => got.push(u);
  const feed = (x: Float32Array) => { for (let i = 0; i < x.length; i += 1024) a.push(x.subarray(i, i + 1024)); };
  feed(silence(0.5, noise));
  for (const w of words) { feed(word(w, noise)); feed(silence(0.6, noise)); }
  return got;
}

const NORMAL: Word = {};
const CAL = [NORMAL, NORMAL, NORMAL];
const none = { snap: false, hype: false, full: false };

describe('detectPitch', () => {
  it('finds the fundamental of a harmonic tone', () => {
    for (const hz of [90, 150, 300]) {
      const w = word({ hz, dur: 0.05, attackS: 0.001 }, rng(1)).subarray(0, 2048);
      const d = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) d[i] = (w[2 * i]! + w[2 * i + 1]!) / 2;
      expect(detectPitch(d, SR / 2)!).toBeCloseTo(hz, -1);
      expect(Math.abs(detectPitch(d, SR / 2)! / hz - 1)).toBeLessThan(0.02);
    }
  });
  it('returns null for noise', () => {
    const r = rng(3);
    const x = new Float32Array(1024).map(() => 0.2 * r());
    expect(detectPitch(x, SR / 2)).toBeNull();
  });
});

describe('ProsodyAnalyzer', () => {
  it('splits words into utterances and calibrates on the first three', () => {
    const u = run([...CAL, NORMAL]);
    expect(u).toHaveLength(4);
    expect(u.slice(0, 3).every((x) => !x.calibrated)).toBe(true);
    expect(u[3]!.calibrated).toBe(true);
    expect(u[3]!.boosts).toEqual(none);
    expect(u[3]!.medianHz).toBeCloseTo(140, -1);
    expect(u[3]!.endS - u[3]!.startS).toBeGreaterThan(0.25);
  });

  it('no boosts while calibrating, however it is said', () => {
    const u = run([{ hz: 260, attackS: 0.002, amp: 0.4, dur: 1.2 }]);
    expect(u[0]!.boosts).toEqual(none);
  });

  it('pitch rise → hype', () => {
    const u = run([...CAL, { hz: 220 }]);
    expect(u[3]!.boosts).toEqual({ ...none, hype: true });
    expect(u[3]!.scores.pitchSemis).toBeGreaterThan(6);
  });

  it('small pitch change is not hype', () => {
    const u = run([...CAL, { hz: 155 }]);
    expect(u[3]!.boosts.hype).toBe(false);
  });

  it('sudden loud onset → snap', () => {
    const u = run([...CAL, { attackS: 0.003, amp: 0.3 }]);
    expect(u[3]!.boosts).toEqual({ ...none, snap: true });
  });

  it('loud but slow onset is not snap; sudden but quiet is not snap', () => {
    const u = run([...CAL, { attackS: 0.15, amp: 0.3 }, { attackS: 0.003 }]);
    expect(u[3]!.boosts.snap).toBe(false);
    expect(u[4]!.boosts.snap).toBe(false);
  });

  it('long held vowel → full power', () => {
    const u = run([...CAL, { dur: 1.0 }]);
    expect(u[3]!.boosts).toEqual({ ...none, full: true });
    expect(u[3]!.scores.longestVoicedS).toBeGreaterThan(0.9);
  });

  it('never two boosts: only the strongest relative to its threshold', () => {
    // all three reached; pitch +8.5 st is barely over 7, the 1.2 s hold is far over its threshold
    const u = run([...CAL, { hz: 228, attackS: 0.003, amp: 0.2, dur: 1.2 }]);
    const s = u[3]!.strength;
    expect(s.snap).toBeGreaterThan(1);
    expect(s.hype).toBeGreaterThan(1);
    expect(s.full).toBeGreaterThan(Math.max(s.snap, s.hype));
    expect(u[3]!.boosts).toEqual({ ...none, full: true });
    // a loud bark with a smaller pitch jump → snap only
    const v = run([...CAL, { hz: 230, attackS: 0.003, amp: 0.6 }]);
    expect(v[3]!.strength.hype).toBeGreaterThan(1);
    expect(v[3]!.boosts).toEqual({ ...none, snap: true });
  });

  it('boosted words do not shift the baseline', () => {
    const u = run([...CAL, { hz: 230 }, { hz: 230 }, { hz: 230 }, { hz: 230 }, NORMAL]);
    expect(u.slice(3, 7).every((x) => x.boosts.hype)).toBe(true);
    expect(u[7]!.boosts).toEqual(none);
  });

  it('digital silence between words still separates them', () => {
    const u = run([...CAL, { attackS: 0.003, amp: 0.3 }, { dur: 1.0 }], () => 0);
    expect(u).toHaveLength(5);
    expect(u[3]!.boosts).toEqual({ ...none, snap: true });
    expect(u[4]!.boosts).toEqual({ ...none, full: true });
  });
});
