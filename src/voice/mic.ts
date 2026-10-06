// Raw microphone tap for prosody analysis, running alongside Web Speech recognition.
// An AudioWorklet forwards contiguous sample blocks to a ProsodyAnalyzer on the main thread.

import type { Boost } from '../sim/types';
import { PROSODY, ProsodyAnalyzer, type Utterance } from './prosody';

const WORKLET = `class YpTap extends AudioWorkletProcessor {
  constructor() { super(); this.b = new Float32Array(1024); this.n = 0; }
  process(inputs) {
    const c = inputs[0] && inputs[0][0];
    if (c) for (let k = 0; k < c.length; k++) {
      this.b[this.n++] = c[k];
      if (this.n === 1024) { this.port.postMessage(this.b.slice()); this.n = 0; }
    }
    return true;
  }
}
registerProcessor('yp-tap', YpTap);`;

export class MicProsody {
  analyzer: ProsodyAnalyzer | null = null;
  onUtterance: (u: Utterance) => void = () => {};
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private recent: { u: Utterance; at: number }[] = [];
  /** Bumped by stop(): a start() still awaiting permission gives up. */
  private gen = 0;

  /** `autoLearn` false: the baseline learns only from utterances claimed by `take()`. */
  constructor(private autoLearn = true) {}

  get running() { return this.ctx !== null; }

  async start() {
    if (this.ctx) return;
    const gen = ++this.gen;
    // Auto gain would flatten the loudness we want to measure; noise suppression smooths word onsets.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
    const ctx = new AudioContext();
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const src = ctx.createMediaStreamSource(this.stream);
    const tap = new AudioWorkletNode(ctx, 'yp-tap');
    const mute = ctx.createGain();
    mute.gain.value = 0;
    src.connect(tap).connect(mute).connect(ctx.destination); // must reach the destination to be pulled
    const a = new ProsodyAnalyzer(ctx.sampleRate, this.autoLearn);
    a.onUtterance = (u) => {
      this.recent.push({ u, at: performance.now() });
      if (this.recent.length > 8) this.recent.shift();
      this.onUtterance(u);
    };
    tap.port.onmessage = (e: MessageEvent<Float32Array>) => a.push(e.data);
    if (ctx.state === 'suspended') await ctx.resume();
    if (gen !== this.gen) {
      this.stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      return;
    }
    this.analyzer = a;
    this.ctx = ctx;
  }

  /**
   * A command was recognized: claim the utterances heard in the last `windowMs`, learn the normal voice from
   * them, and return the strongest boost among them (at most one per command).
   */
  take(windowMs = 3000): Boost | undefined {
    const now = performance.now();
    const mine = this.recent.filter((r) => now - r.at <= windowMs).map((r) => r.u);
    this.recent = [];
    const a = this.analyzer;
    if (!a) return undefined;
    let best: Boost | undefined, bestS = 0;
    for (const u of mine) {
      if (!this.autoLearn) a.learn(u);
      for (const k of ['snap', 'hype', 'full'] as const) if (u.boosts[k] && u.strength[k] > bestS) { best = k; bestS = u.strength[k]; }
    }
    return best;
  }

  /** Calibration progress, or null when the mic isn't running. */
  calibration(): { count: number; total: number } | null {
    return this.analyzer ? { count: this.analyzer.calibrationCount, total: PROSODY.calibrationUtterances } : null;
  }

  resetBaseline() {
    this.analyzer?.resetBaseline();
    this.recent = [];
  }

  stop() {
    this.gen++;
    this.recent = [];
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.ctx = null;
    this.stream = null;
    this.analyzer = null;
  }
}
