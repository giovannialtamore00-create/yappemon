// Voice "how it was said" analysis (pure, no DOM): splits a raw mic sample stream into utterances
// and scores each one against the speaker's own normal voice. Detects the three verbal boosts:
//   snap  — sharp attack: the word hits loud and suddenly
//   hype  — pitch rise: voice clearly higher than the speaker's usual pitch
//   full  — stretching: a long held vowel ("fiiiire")
// The baseline (normal voice) is learned from the speaker's recent non-boosted utterances.

/** Detection thresholds. All PLACEHOLDER values, to be tuned with real voices. */
export const PROSODY = {
  hopMs: 10,
  /** Speech starts this many dB above the noise floor (and above `minSpeechDb`). */
  onDb: 12,
  /** Speech ends after `hangMs` below floor + `offDb`. */
  offDb: 6,
  hangMs: 250,
  minSpeechDb: -55,
  /** The noise floor never goes below this (digital silence would make every hiss count as speech). */
  minFloorDb: -75,
  minUtteranceMs: 100,
  maxUtteranceMs: 4000,
  /** Non-boosted utterances needed before boosts can trigger. */
  calibrationUtterances: 3,
  baselineWindow: 10,
  /** snap: reaches within 3 dB of its early peak this fast, and that peak is this much louder than usual. */
  snapAttackMs: 30, // PLACEHOLDER
  snapLoudDb: 6, // PLACEHOLDER
  /** hype: high pitch (90th percentile) this many semitones above the usual median pitch. */
  hypeSemitones: 4, // PLACEHOLDER
  /** full: longest unbroken voiced run at least this long, and at least `fullVsUsual` × the usual one. */
  fullMinS: 0.5, // PLACEHOLDER
  fullVsUsual: 2, // PLACEHOLDER
  minVoicedFrames: 5,
  pitchMinHz: 70,
  pitchMaxHz: 600,
  clarity: 0.7,
};

export interface Boosts { snap: boolean; hype: boolean; full: boolean }

export interface UtteranceScores {
  /** ms from onset to near-peak loudness. */
  attackMs: number;
  /** Early peak loudness relative to the usual peak (dB). */
  loudDb: number;
  /** High pitch vs usual median pitch (semitones); NaN when unvoiced or uncalibrated. */
  pitchSemis: number;
  /** Longest unbroken voiced run (seconds). */
  longestVoicedS: number;
}

export interface Utterance {
  startS: number;
  endS: number;
  scores: UtteranceScores;
  boosts: Boosts;
  /** False while the baseline is still being learned (no boosts yet). */
  calibrated: boolean;
  /** Raw stats used for the baseline. */
  peakDb: number;
  medianHz: number;
}

const NO_BOOSTS: Boosts = { snap: false, hype: false, full: false };

export const toDb = (rms: number) => 20 * Math.log10(rms + 1e-9);
export const semitones = (hz: number, refHz: number) => 12 * Math.log2(hz / refHz);

export function rmsOf(x: Float32Array, from = 0, to = x.length): number {
  let s = 0;
  for (let i = from; i < to; i++) s += x[i]! * x[i]!;
  return Math.sqrt(s / Math.max(1, to - from));
}

/** Fundamental frequency by normalized autocorrelation (McLeod-style). Null when unvoiced. */
export function detectPitch(x: Float32Array, sampleRate: number, minHz = PROSODY.pitchMinHz, maxHz = PROSODY.pitchMaxHz): number | null {
  const n = x.length;
  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  const maxLag = Math.min(n >> 1, Math.ceil(sampleRate / minHz));
  if (maxLag <= minLag + 2) return null;
  const sq = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) sq[i + 1] = sq[i]! + x[i]! * x[i]!;
  if (sq[n]! / n < 1e-7) return null;
  const nsdf = new Float64Array(maxLag + 2);
  let globalMax = 0;
  for (let lag = minLag - 1; lag <= maxLag + 1 && lag < n; lag++) {
    let acf = 0;
    for (let i = 0; i < n - lag; i++) acf += x[i]! * x[i + lag]!;
    const m = sq[n - lag]! + (sq[n]! - sq[lag]!);
    const v = m > 0 ? (2 * acf) / m : 0;
    nsdf[lag] = v;
    if (lag >= minLag && lag <= maxLag && v > globalMax) globalMax = v;
  }
  if (globalMax < PROSODY.clarity) return null;
  // Smallest-lag local peak close to the best one avoids octave-down errors.
  for (let lag = minLag; lag <= maxLag; lag++) {
    const v = nsdf[lag]!;
    if (v >= 0.9 * globalMax && v >= nsdf[lag - 1]! && v >= nsdf[lag + 1]!) {
      const a = nsdf[lag - 1]!, b = v, c = nsdf[lag + 1]!;
      const den = a - 2 * b + c;
      const shift = den !== 0 ? (0.5 * (a - c)) / den : 0;
      return sampleRate / (lag + shift);
    }
  }
  return null;
}

const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const percentile = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
};

interface Hop { db: number; hz: number | null }

/** Streaming analyzer: push contiguous mono samples, get `onUtterance` callbacks. */
export class ProsodyAnalyzer {
  onUtterance: (u: Utterance) => void = () => {};
  /** Latest hop, for live meters. */
  live = { db: -100, hz: null as number | null, speaking: false };

  private readonly hop: number;
  private readonly win: number;
  private readonly down: number;
  private ring: Float32Array;
  private ringFill = 0;
  private pending: Float32Array;
  private pendingFill = 0;
  private hopIndex = 0;
  private floorDb = NaN;
  private lastHz: number | null = null;
  private utt: Hop[] | null = null;
  private uttStart = 0;
  private quietHops = 0;
  private history: { peakDb: number; medianHz: number; longestS: number }[] = [];

  constructor(readonly sampleRate: number) {
    this.hop = Math.round((sampleRate * PROSODY.hopMs) / 1000);
    this.down = sampleRate >= 32000 ? 2 : 1;
    this.win = 1024 * this.down;
    this.ring = new Float32Array(this.win);
    this.pending = new Float32Array(this.hop);
  }

  get calibrated() { return this.history.length >= PROSODY.calibrationUtterances; }
  get calibrationCount() { return Math.min(this.history.length, PROSODY.calibrationUtterances); }

  push(samples: Float32Array) {
    for (let i = 0; i < samples.length; i++) {
      this.pending[this.pendingFill++] = samples[i]!;
      if (this.pendingFill === this.hop) {
        this.processHop(this.pending);
        this.pendingFill = 0;
      }
    }
  }

  private processHop(h: Float32Array) {
    // slide the analysis window
    this.ring.copyWithin(0, h.length);
    this.ring.set(h, this.win - h.length);
    this.ringFill = Math.min(this.win, this.ringFill + h.length);
    const db = toDb(rmsOf(h));
    // pitch every other hop (20 ms), on a downsampled window
    if (this.hopIndex % 2 === 0) {
      this.lastHz = null;
      if (this.ringFill === this.win && db > PROSODY.minSpeechDb) {
        const n = this.win / this.down;
        const d = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          let s = 0;
          for (let k = 0; k < this.down; k++) s += this.ring[i * this.down + k]!;
          d[i] = s / this.down;
        }
        this.lastHz = detectPitch(d, this.sampleRate / this.down);
      }
    }
    const hz = this.lastHz;
    const t = this.hopIndex * PROSODY.hopMs / 1000;
    this.hopIndex++;

    if (Number.isNaN(this.floorDb)) this.floorDb = Math.max(PROSODY.minFloorDb, db);
    const on = db > this.floorDb + PROSODY.onDb && db > PROSODY.minSpeechDb;
    if (!this.utt) {
      // noise floor: follows quickly down, slowly up (2 dB/s)
      this.floorDb = Math.max(PROSODY.minFloorDb, db < this.floorDb ? this.floorDb + (db - this.floorDb) * 0.3 : this.floorDb + 0.02);
      if (on) {
        this.utt = [{ db, hz }];
        this.uttStart = t;
        this.quietHops = 0;
      }
    } else {
      this.utt.push({ db, hz });
      this.quietHops = db < this.floorDb + PROSODY.offDb || db < PROSODY.minSpeechDb ? this.quietHops + 1 : 0;
      const hang = PROSODY.hangMs / PROSODY.hopMs;
      if (this.quietHops >= hang || this.utt.length * PROSODY.hopMs >= PROSODY.maxUtteranceMs) {
        const hops = this.quietHops >= hang ? this.utt.slice(0, this.utt.length - this.quietHops) : this.utt;
        this.utt = null;
        if (hops.length * PROSODY.hopMs >= PROSODY.minUtteranceMs) this.finish(hops, this.uttStart);
      }
    }
    this.live = { db, hz, speaking: this.utt !== null };
  }

  private finish(hops: Hop[], startS: number) {
    const hopS = PROSODY.hopMs / 1000;
    // attack: onset → within 3 dB of the peak of the first 200 ms
    const early = hops.slice(0, 200 / PROSODY.hopMs);
    const earlyPeak = Math.max(...early.map((h) => h.db));
    const reach = early.findIndex((h) => h.db >= earlyPeak - 3);
    const attackMs = reach * PROSODY.hopMs;
    const peakDb = Math.max(...hops.map((h) => h.db));
    // pitch is held for two hops; voiced runs tolerate one missing pitch frame (2 hops)
    const voiced = hops.map((h) => h.hz).filter((x): x is number => x !== null);
    let longest = 0, run = 0, gap = 0;
    for (const { hz } of hops) {
      if (hz !== null) { run += 1 + gap; gap = 0; }
      else if (run > 0 && gap < 2) gap++;
      else { run = 0; gap = 0; }
      longest = Math.max(longest, run);
    }
    const longestVoicedS = longest * hopS;
    const medianHz = voiced.length >= PROSODY.minVoicedFrames ? median(voiced) : NaN;

    const calibrated = this.calibrated;
    const base = {
      peakDb: median(this.history.map((h) => h.peakDb)),
      hz: median(this.history.map((h) => h.medianHz).filter((x) => !Number.isNaN(x))),
      longestS: median(this.history.map((h) => h.longestS)),
    };
    const loudDb = calibrated ? earlyPeak - base.peakDb : NaN;
    const pitchSemis = calibrated && voiced.length >= PROSODY.minVoicedFrames && !Number.isNaN(base.hz)
      ? semitones(percentile(voiced, 0.9), base.hz) : NaN;
    const scores: UtteranceScores = { attackMs, loudDb, pitchSemis, longestVoicedS };
    const boosts: Boosts = calibrated ? {
      snap: attackMs <= PROSODY.snapAttackMs && loudDb >= PROSODY.snapLoudDb,
      hype: pitchSemis >= PROSODY.hypeSemitones,
      full: longestVoicedS >= Math.max(PROSODY.fullMinS, PROSODY.fullVsUsual * base.longestS),
    } : { ...NO_BOOSTS };

    // Only normal-sounding utterances teach the baseline.
    if (!boosts.snap && !boosts.hype && !boosts.full) {
      this.history.push({ peakDb, medianHz, longestS: longestVoicedS });
      if (this.history.length > PROSODY.baselineWindow) this.history.shift();
    }
    this.onUtterance({ startS, endS: startS + hops.length * hopS, scores, boosts, calibrated, peakDb, medianHz });
  }
}
