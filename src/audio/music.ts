// Original 8-bit battle theme, synthesized live like an old sound chip:
// two pulse channels (lead + arpeggio), a triangle bass and a noise drum channel.
// A small look-ahead scheduler queues notes on the Web Audio clock.

type Token = string; // 'A4', 'G#5', '-' (hold), '.' (rest)

const NOTE: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const midi = (tok: string): number => {
  const m = /^([A-G]#?)(\d)$/.exec(tok);
  if (!m) throw new Error(`bad note ${tok}`);
  return NOTE[m[1]!]! + (Number(m[2]) + 1) * 12;
};
const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const bar = (s: string): Token[] => {
  const t = s.trim().split(/\s+/);
  if (t.length !== 16) throw new Error(`bar needs 16 steps: ${s}`);
  return t;
};

// ---------------------------------------------------------------- the song (original composition)

/** Chords per bar: root note name + quality. */
type Chord = [string, 'min' | 'maj'];
const A_CHORDS: Chord[] = [['A', 'min'], ['F', 'maj'], ['G', 'maj'], ['A', 'min']];
const B_CHORDS: Chord[] = [['D', 'min'], ['E', 'maj'], ['F', 'maj'], ['E', 'maj']];

const LEAD_A: Token[][] = [
  bar('A4 . A4 C5 . E5 . A5 - - G5 - E5 - D5 -'),
  bar('C5 - - - A4 - C5 - F5 - - E5 - C5 - A4'),
  bar('B4 - D5 - G5 - - F5 - D5 - B4 - D5 - F5'),
  bar('E5 - - - - - . E5 D5 C5 B4 C5 - - . .'),
];
const LEAD_B: Token[][] = [
  bar('D5 - F5 - A5 - - G5 F5 - E5 - D5 - - .'),
  bar('E5 - G#5 - B5 - - A5 G#5 - E5 - B4 - - .'),
  bar('F5 - - A5 - - C6 - B5 - A5 - G5 - F5 -'),
  bar('G#5 - - - E5 - - - G#5 - - - B5 - - -'),
];
const REST_BAR = bar('. . . . . . . . . . . . . . . .');

interface Section { chords: Chord[]; lead: Token[][]; drumsOnly?: boolean }
const INTRO: Section = { chords: [['A', 'min'], ['A', 'min']], lead: [REST_BAR, REST_BAR], drumsOnly: true };
const A: Section = { chords: A_CHORDS, lead: LEAD_A };
const B: Section = { chords: B_CHORDS, lead: LEAD_B };
/** Intro once, then A A B B forever. */
const LOOP: Section[] = [A, A, B, B];

const BASE_BPM = 165;

function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  const n = 48;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let i = 1; i < n; i++) real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
  return ctx.createPeriodicWave(real, imag);
}

export class ChipMusic {
  private out: GainNode;
  private wave50: PeriodicWave;
  private wave25: PeriodicWave;
  private timer = 0;
  private nextTime = 0;
  private step = 0; // global 16th-note counter
  private playing = false;
  /** 0 = calm, 1 = danger (low HP): faster and busier. */
  private danger = 0;
  private transpose = 0;

  constructor(private ctx: AudioContext, dest: AudioNode, private noise: AudioBuffer) {
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);
    this.wave50 = pulseWave(ctx, 0.5);
    this.wave25 = pulseWave(ctx, 0.25);
  }

  start() {
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.out.gain.setTargetAtTime(1, this.ctx.currentTime, 0.05);
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop(fade = 0.4) {
    if (!this.playing) return;
    this.playing = false;
    window.clearInterval(this.timer);
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.out.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3);
  }

  /** Quieter during breaks (e.g. the evolution sequence). */
  duck(on: boolean) {
    if (!this.playing) return;
    this.out.gain.setTargetAtTime(on ? 0.35 : 1, this.ctx.currentTime, 0.3);
  }

  /** Round 1/2/3 → higher key each round; danger 0..1 from the player's HP. */
  set(round: number, danger: number) {
    this.transpose = [0, 2, 5][Math.min(3, Math.max(1, round)) - 1]!;
    this.danger = Math.min(1, Math.max(0, danger));
  }

  private get stepDur() {
    return 60 / (BASE_BPM * (1 + this.danger * 0.12)) / 4;
  }

  /** Which section/bar/step a global step falls on. */
  private locate(step: number): { sec: Section; bar: number; s: number } {
    const introSteps = INTRO.lead.length * 16;
    if (step < introSteps) return { sec: INTRO, bar: Math.floor(step / 16), s: step % 16 };
    const loopSteps = LOOP.reduce((a, sec) => a + sec.lead.length * 16, 0);
    let k = (step - introSteps) % loopSteps;
    for (const sec of LOOP) {
      const len = sec.lead.length * 16;
      if (k < len) return { sec, bar: Math.floor(k / 16), s: k % 16 };
      k -= len;
    }
    return { sec: A, bar: 0, s: 0 };
  }

  private schedule() {
    const ahead = this.ctx.currentTime + 0.12;
    while (this.nextTime < ahead) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += this.stepDur;
      this.step++;
    }
  }

  private playStep(step: number, t: number) {
    const { sec, bar: b, s } = this.locate(step);
    const d = this.stepDur;
    const [rootName, quality] = sec.chords[b]!;
    const root = NOTE[rootName]! + this.transpose;
    const third = quality === 'min' ? 3 : 4;

    // Drums (noise channel + chip kick).
    if (s % 8 === 0 || s === 6 || (this.danger > 0.5 && s === 14)) this.kick(t);
    if (s === 4 || s === 12) this.snare(t);
    if (s % 2 === 0 || this.danger > 0.5) this.hat(t, s % 4 === 2 ? 0.05 : 0.03);

    // Triangle bass: pumping eighth-note octaves on the chord root.
    if (s % 2 === 0) {
      const n = 36 + root + (s % 4 === 2 ? 12 : 0);
      this.note('triangle', n, t, d * 1.8, 0.32);
    }
    if (sec.drumsOnly) return;

    // Pulse 25%: fast arpeggio of the chord (classic chip "chord" trick).
    const arp = [0, third, 7, 12][s % 4]!;
    this.note(this.wave25, 60 + root + arp, t, d * 0.9, 0.05);

    // Pulse 50%: the lead melody (held notes extend over '-' steps).
    const tok = sec.lead[b]![s]!;
    if (tok !== '-' && tok !== '.') {
      let len = 1;
      while (s + len < 16 && sec.lead[b]![s + len] === '-') len++;
      this.note(this.wave50, midi(tok) + this.transpose, t, d * len * 0.95, 0.11, true);
    }
  }

  private note(type: OscillatorType | PeriodicWave, n: number, t: number, dur: number, vol: number, vibrato = false) {
    const o = this.ctx.createOscillator();
    if (type instanceof PeriodicWave) o.setPeriodicWave(type);
    else o.type = type;
    o.frequency.setValueAtTime(hz(n), t);
    if (vibrato && dur > 0.25) {
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      lfo.frequency.value = 6;
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(hz(n) * 0.012, t + dur);
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.setValueAtTime(vol * 0.85, t + Math.max(0.01, dur - 0.03));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private kick(t: number) {
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.15);
  }

  private noiseHit(t: number, dur: number, vol: number, filterHz: number, type: BiquadFilterType) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterHz;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random());
    src.stop(t + dur + 0.01);
  }

  private snare(t: number) {
    this.noiseHit(t, 0.12, 0.22, 1800, 'bandpass');
  }

  private hat(t: number, vol: number) {
    this.noiseHit(t, 0.03, vol, 7000, 'highpass');
  }
}
