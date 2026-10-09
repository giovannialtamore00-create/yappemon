// All sound is synthesized with the Web Audio API — no audio files.

import { MOVES } from '../sim/data';
import { ChipMusic } from './music';
import type { Boost, CheerId, MoveId, PlayerIdx, SimEvent, SimState } from '../sim/types';

const VOL_KEY = 'yappemon.volume';
const MUSIC_KEY = 'yappemon.music';

type Wave = OscillatorType;

export class Sfx {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private volume = 0.7;
  private musicVolume = 0.6;
  private musicGain!: GainNode;
  private music: ChipMusic | null = null;
  private wantMusic = false;

  constructor() {
    try {
      const v = Number(localStorage.getItem(VOL_KEY));
      if (localStorage.getItem(VOL_KEY) !== null && Number.isFinite(v)) this.volume = Math.min(1, Math.max(0, v));
      const mv = Number(localStorage.getItem(MUSIC_KEY));
      if (localStorage.getItem(MUSIC_KEY) !== null && Number.isFinite(mv)) this.musicVolume = Math.min(1, Math.max(0, mv));
    } catch { /* ignore */ }
  }

  /** Must be called from a user gesture at least once (browsers block autoplay). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.35;
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume * 0.55;
      this.musicGain.connect(this.master);
      this.music = new ChipMusic(this.ctx, this.musicGain, this.noiseBuf);
      if (this.wantMusic) this.music.start();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  getVolume() { return this.volume; }
  getMusicVolume() { return this.musicVolume; }

  setMusicVolume(v: number) {
    this.musicVolume = v;
    if (this.ctx) this.musicGain.gain.setTargetAtTime(v * 0.55, this.ctx.currentTime, 0.02);
    try { localStorage.setItem(MUSIC_KEY, String(v)); } catch { /* ignore */ }
  }

  // ------------------------------------------------------------ battle music
  musicStart() { this.wantMusic = true; this.music?.start(); }
  musicStop(fade = 0.4) { this.wantMusic = false; this.music?.stop(fade); }
  musicSet(round: number, danger: number) { this.music?.set(round, danger); }
  musicDuck(on: boolean) { this.music?.duck(on); }

  setVolume(v: number) {
    this.volume = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
    try { localStorage.setItem(VOL_KEY, String(v)); } catch { /* ignore */ }
  }

  // ------------------------------------------------------------ primitives

  private get now() { return this.ctx!.currentTime; }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private tone(freq: number, dur: number, o: { type?: Wave; vol?: number; to?: number; delay?: number; attack?: number; pan?: number; bus?: GainNode; detune?: number } = {}) {
    if (!this.ctx) return;
    const t = this.now + (o.delay ?? 0);
    const osc = this.ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.detune) osc.detune.value = o.detune;
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
    const g = this.ctx.createGain();
    this.env(g, t, o.vol ?? 0.3, o.attack ?? 0.005, dur);
    let node: AudioNode = osc.connect(g);
    if (o.pan) { const p = this.ctx.createStereoPanner(); p.pan.value = o.pan; node = node.connect(p); }
    node.connect(o.bus ?? this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + (o.attack ?? 0.005) + 0.05);
  }

  private noise(dur: number, o: { filter?: BiquadFilterType; freq?: number; to?: number; q?: number; vol?: number; delay?: number; attack?: number; bus?: GainNode } = {}) {
    if (!this.ctx) return;
    const t = this.now + (o.delay ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = o.filter ?? 'lowpass';
    f.frequency.setValueAtTime(o.freq ?? 1000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    f.Q.value = o.q ?? 1;
    const g = this.ctx.createGain();
    this.env(g, t, o.vol ?? 0.3, o.attack ?? 0.005, dur);
    src.connect(f).connect(g).connect(o.bus ?? this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.1);
  }

  // ------------------------------------------------------------ sounds

  ui() {
    this.tone(880, 0.06, { type: 'triangle', vol: 0.15 });
    this.tone(1320, 0.05, { type: 'sine', vol: 0.08, delay: 0.03 });
  }

  fail() {
    this.tone(150, 0.16, { type: 'square', vol: 0.12, to: 110 });
    this.tone(150, 0.2, { type: 'square', vol: 0.12, to: 90, delay: 0.18 });
    this.tone(75, 0.35, { type: 'sawtooth', vol: 0.06, delay: 0.05 });
  }

  private whoosh(vol = 0.25, dur = 0.25) {
    this.noise(dur, { filter: 'bandpass', freq: 400, to: 2500, q: 2, vol, attack: 0.04 });
  }

  private charge(element: string) {
    const base = { fire: 120, water: 200, grass: 160, electric: 300, normal: 150 }[element] ?? 150;
    this.tone(base, 1.0, { type: 'sawtooth', vol: 0.06, to: base * 4, attack: 0.3 });
    this.tone(base * 1.5, 1.0, { type: 'sine', vol: 0.08, to: base * 6, attack: 0.3 });
  }

  move(id: MoveId) {
    switch (id) {
      case 'shell_ram': case 'horn_charge': case 'bubble_bump': case 'wing_flick':
        this.whoosh(0.3, 0.2);
        if (id === 'bubble_bump') this.tone(500, 0.12, { to: 900, vol: 0.15 });
        if (id === 'wing_flick') this.noise(0.15, { filter: 'highpass', freq: 3000, vol: 0.12 });
        break;
      case 'cinder_spit':
        this.noise(0.35, { filter: 'lowpass', freq: 3000, to: 400, vol: 0.35 });
        for (let i = 0; i < 5; i++) this.noise(0.02, { filter: 'highpass', freq: 4000, vol: 0.15, delay: 0.05 + Math.random() * 0.3 });
        break;
      case 'heat_shell':
        this.noise(0.6, { filter: 'lowpass', freq: 600, vol: 0.25, attack: 0.1 });
        this.tone(90, 0.6, { type: 'triangle', vol: 0.2, to: 140 });
        break;
      case 'magma_burst':
        this.noise(1.0, { filter: 'lowpass', freq: 1500, to: 120, vol: 0.55 });
        this.tone(60, 0.9, { type: 'sawtooth', vol: 0.25, to: 30 });
        break;
      case 'water_jet':
        this.noise(0.45, { filter: 'bandpass', freq: 1800, to: 900, q: 3, vol: 0.35 });
        for (let i = 0; i < 4; i++) this.tone(400 + Math.random() * 600, 0.06, { to: 1200, vol: 0.08, delay: i * 0.08 });
        break;
      case 'healing_rain':
        [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.5, { type: 'sine', vol: 0.12, delay: i * 0.09 }));
        this.noise(1.2, { filter: 'highpass', freq: 5000, vol: 0.05, attack: 0.3 });
        break;
      case 'tidal_crash':
        this.noise(1.2, { filter: 'lowpass', freq: 300, to: 2500, vol: 0.45, attack: 0.4 });
        this.noise(0.6, { filter: 'lowpass', freq: 2500, to: 200, vol: 0.4, delay: 0.5 });
        break;
      case 'leaf_volley':
        for (let i = 0; i < 6; i++) this.noise(0.08, { filter: 'bandpass', freq: 2500 + Math.random() * 2000, q: 4, vol: 0.18, delay: i * 0.04 });
        break;
      case 'vine_snare':
        this.tone(220, 0.3, { type: 'triangle', to: 110, vol: 0.2 });
        this.noise(0.3, { filter: 'bandpass', freq: 1200, q: 6, vol: 0.12 });
        break;
      case 'thorn_quake':
        this.noise(1.1, { filter: 'lowpass', freq: 180, vol: 0.6 });
        for (let i = 0; i < 6; i++) this.tone(140, 0.12, { type: 'square', to: 60, vol: 0.12, delay: i * 0.1 });
        break;
      case 'spark_dart':
        for (let i = 0; i < 3; i++) this.tone(1200 + Math.random() * 1500, 0.05, { type: 'square', to: 300, vol: 0.12, delay: i * 0.04 });
        break;
      case 'static_field':
        this.noise(0.6, { filter: 'bandpass', freq: 3000, q: 8, vol: 0.18 });
        this.tone(60, 0.6, { type: 'square', vol: 0.06 });
        break;
      case 'thunder_lance':
        this.noise(0.9, { filter: 'lowpass', freq: 5000, to: 80, vol: 0.6 });
        this.tone(2000, 0.15, { type: 'square', to: 100, vol: 0.2 });
        break;
      case 'molten_leap':
        this.whoosh(0.35, 0.3);
        this.noise(0.5, { filter: 'lowpass', freq: 900, to: 100, vol: 0.45, delay: 0.05 });
        this.tone(80, 0.4, { type: 'sawtooth', to: 40, vol: 0.2 });
        break;
      case 'tide_mirror':
        [880, 1320, 1760].forEach((fq, i) => this.tone(fq, 0.4, { type: 'sine', vol: 0.1, delay: i * 0.05 }));
        this.noise(0.4, { filter: 'bandpass', freq: 2500, q: 5, vol: 0.12 });
        break;
      case 'bramble_stampede':
        for (let i = 0; i < 5; i++) this.tone(110, 0.08, { type: 'triangle', to: 60, vol: 0.25, delay: i * 0.06 });
        this.noise(0.3, { filter: 'bandpass', freq: 1800, q: 3, vol: 0.2 });
        break;
      case 'chain_storm':
        for (let i = 0; i < 3; i++) this.tone(1600 + i * 300, 0.07, { type: 'square', to: 250, vol: 0.13, delay: i * 0.25 });
        break;
      case 'volcanic_ruin':
        this.noise(1.6, { filter: 'lowpass', freq: 1200, to: 60, vol: 0.7 });
        this.tone(45, 1.4, { type: 'sawtooth', vol: 0.3, to: 25 });
        this.noise(0.5, { filter: 'highpass', freq: 3000, vol: 0.2, delay: 0.1 });
        break;
      case 'maelstrom':
        this.noise(1.4, { filter: 'bandpass', freq: 300, to: 1500, q: 2, vol: 0.45, attack: 0.3 });
        this.tone(150, 1.2, { type: 'sine', to: 400, vol: 0.12 });
        break;
      case 'ancient_bloom':
        [523, 659, 784, 1046, 1318].forEach((fq, i) => this.tone(fq, 0.6, { type: 'triangle', vol: 0.1, delay: i * 0.08 }));
        this.noise(1, { filter: 'bandpass', freq: 1200, q: 2, vol: 0.06, attack: 0.3 });
        break;
      case 'sky_judgement':
        this.noise(1.3, { filter: 'lowpass', freq: 8000, to: 60, vol: 0.75 });
        this.tone(3000, 0.2, { type: 'square', to: 80, vol: 0.25 });
        this.tone(55, 1.2, { type: 'sawtooth', vol: 0.25, to: 30, delay: 0.05 });
        break;
    }
  }

  /** Verbal boost landed: SNAP crack, HYPE rising sweep, FULL POWER big chord. */
  boost(kind: Boost) {
    if (kind === 'snap') {
      this.noise(0.08, { filter: 'highpass', freq: 3000, vol: 0.35 });
      this.tone(900, 0.07, { type: 'square', to: 1800, vol: 0.12 });
      this.tone(1800, 0.06, { type: 'square', vol: 0.08, delay: 0.07 });
    } else if (kind === 'hype') {
      this.tone(330, 0.35, { type: 'sawtooth', to: 990, vol: 0.12 });
      this.tone(440, 0.35, { type: 'triangle', to: 1320, vol: 0.1, delay: 0.05 });
      this.noise(0.4, { filter: 'bandpass', freq: 800, to: 3000, vol: 0.12 });
    } else {
      for (const [i, f] of [220, 277, 330, 440].entries()) this.tone(f, 0.9, { type: 'triangle', vol: 0.11, delay: i * 0.04 });
      this.tone(880, 0.6, { type: 'sine', to: 1760, vol: 0.06, delay: 0.15 });
      this.noise(0.8, { filter: 'highpass', freq: 5000, vol: 0.08, delay: 0.1 });
    }
  }

  /** Encouragement landed: a short bright arpeggio, its own notes per word. */
  cheer(word: CheerId) {
    const notes: Record<CheerId, number[]> = {
      come_on: [523, 659, 784], stay_strong: [392, 523, 659], courage: [440, 554, 659],
      perfect: [659, 784, 1047], dont_give_up: [349, 440, 523, 698],
    };
    for (const [i, f] of notes[word].entries()) this.tone(f, 0.22, { type: 'triangle', vol: 0.12, delay: i * 0.07 });
  }

  hit(damage: number, mine: boolean, eff: string) {
    const v = Math.min(0.7, 0.25 + damage / 60) * (mine ? 1.1 : 0.85);
    this.tone(150, 0.18, { type: 'sine', to: 45, vol: v });
    this.noise(0.08, { filter: 'lowpass', freq: 3000, vol: v * 0.6 });
    if (eff === 'super') { this.tone(1046, 0.18, { type: 'triangle', vol: 0.15, delay: 0.05 }); this.tone(1568, 0.25, { type: 'triangle', vol: 0.12, delay: 0.12 }); }
    if (eff === 'weak') this.tone(300, 0.15, { type: 'triangle', to: 200, vol: 0.1, delay: 0.05 });
  }

  /** Evolution flash: rising sweep resolving into a bright chord. */
  evolve() {
    if (!this.ctx) return;
    [392, 523, 659, 784, 1046].forEach((fq, i) => this.tone(fq, 0.9, { type: 'triangle', vol: 0.12, delay: i * 0.03, bus: this.musicBus }));
    this.noise(0.8, { filter: 'highpass', freq: 4000, vol: 0.12 });
    this.tone(200, 0.5, { type: 'sine', to: 1200, vol: 0.15 });
  }

  /** Short sting at the end of a round. */
  roundEnd(won: boolean) {
    const seq = won ? [659, 784, 988] : [440, 392, 349];
    seq.forEach((fq, i) => this.tone(fq, 0.25, { type: 'triangle', vol: 0.18, delay: i * 0.12, bus: this.musicBus }));
  }

  /** Rising shimmer while creatures charge up to evolve. */
  evolveCharge() {
    if (!this.ctx) return;
    this.tone(220, 3, { type: 'sine', to: 880, vol: 0.08, attack: 1, bus: this.musicBus });
    this.tone(330, 3, { type: 'triangle', to: 1320, vol: 0.05, attack: 1, bus: this.musicBus });
  }

  faint() {
    this.tone(600, 0.9, { type: 'triangle', to: 80, vol: 0.25 });
    this.tone(400, 0.9, { type: 'sine', to: 60, vol: 0.2, delay: 0.1 });
  }

  recall() {
    this.tone(300, 0.6, { type: 'sine', to: 1600, vol: 0.18 });
    this.noise(0.6, { filter: 'highpass', freq: 3000, vol: 0.06, attack: 0.2 });
  }

  sendout() {
    this.tone(500, 0.05, { type: 'square', vol: 0.12 });
    this.noise(0.15, { filter: 'bandpass', freq: 2000, q: 1, vol: 0.25, delay: 0.5 });
    [784, 988, 1175].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.12, delay: 0.55 + i * 0.06 }));
  }

  jingle(kind: 'victory' | 'defeat' | 'draw') {
    const seqs = {
      victory: [[523, 0], [659, 0.12], [784, 0.24], [1046, 0.36], [784, 0.56], [1046, 0.68]] as const,
      defeat: [[392, 0], [349, 0.25], [311, 0.5], [262, 0.8]] as const,
      draw: [[523, 0], [523, 0.2], [587, 0.4]] as const,
    }[kind];
    for (const [f, d] of seqs) {
      this.tone(f, kind === 'defeat' ? 0.45 : 0.3, { type: 'triangle', vol: 0.22, delay: d, bus: this.musicBus });
      this.tone(f / 2, kind === 'defeat' ? 0.45 : 0.3, { type: 'sine', vol: 0.15, delay: d, bus: this.musicBus });
    }
    if (kind === 'victory') [1046, 1318, 1568].forEach((f) => this.tone(f, 1.2, { type: 'sine', vol: 0.1, delay: 0.9, bus: this.musicBus }));
  }

  // ------------------------------------------------------------ event mapping

  event(e: SimEvent, me: PlayerIdx, _s: SimState) {
    if (!this.ctx) return;
    switch (e.t) {
      case 'action_start':
        if (e.action.kind === 'move' && MOVES[e.action.move].heavy) this.charge(MOVES[e.action.move].element);
        break;
      case 'launch': this.move(e.move); break;
      case 'boost': this.boost(e.boost); break;
      case 'cheer': if (e.p === me) this.cheer(e.word); break;
      case 'hit': if (e.damage > 0) this.hit(e.damage, e.target === me, e.eff); break;
      case 'dodged': this.tone(1500, 0.08, { type: 'sine', to: 2400, vol: 0.1 }); break;
      case 'dodge': this.whoosh(0.3, 0.22); break;
      case 'miss': this.whoosh(0.18, 0.18); break;
      case 'dodge_ready': if (e.on) this.tone(2200, 0.04, { type: 'square', vol: 0.06 }); break;
      case 'alert': if (e.on) this.tone(660, 0.12, { type: 'triangle', to: 990, vol: 0.1 }); break;
      case 'faint': this.faint(); break;
      case 'recall': this.recall(); break;
      case 'sendout': this.sendout(); break;
      case 'status':
        if (e.on && e.status === 'root') this.noise(0.4, { filter: 'bandpass', freq: 800, q: 3, vol: 0.2 });
        if (e.on && e.status === 'static') this.noise(0.3, { filter: 'highpass', freq: 4000, vol: 0.12 });
        break;
      case 'round_end':
        if (!e.next) break; // the match jingle covers the last round
        this.roundEnd(e.winner === me);
        setTimeout(() => this.evolveCharge(), 1800);
        break;
      case 'reflect':
        this.tone(1200, 0.2, { type: 'sine', to: 2400, vol: 0.15 });
        break;
      case 'match_end':
        this.jingle(e.winner === 'draw' ? 'draw' : e.winner === me ? 'victory' : 'defeat');
        break;
      default: break;
    }
  }
}
