// Raw microphone tap for prosody analysis, running alongside Web Speech recognition.
// An AudioWorklet forwards contiguous sample blocks to a ProsodyAnalyzer on the main thread.

import { ProsodyAnalyzer, type Utterance } from './prosody';

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

  get running() { return this.ctx !== null; }

  async start() {
    if (this.ctx) return;
    // Auto gain would flatten the loudness we want to measure.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1 },
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
    const a = new ProsodyAnalyzer(ctx.sampleRate);
    a.onUtterance = (u) => this.onUtterance(u);
    tap.port.onmessage = (e: MessageEvent<Float32Array>) => a.push(e.data);
    if (ctx.state === 'suspended') await ctx.resume();
    this.analyzer = a;
    this.ctx = ctx;
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.ctx = null;
    this.stream = null;
    this.analyzer = null;
  }
}
