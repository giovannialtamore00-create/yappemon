// Per-move procedural body motion. Given the move and how far through its windup / active / recovery
// phase the creature is, returns offsets the view applies to the creature's body.
// Distances are in world metres along the creature's facing (+ = toward the opponent).

import type { MoveId } from '../sim/types';

export interface Pose {
  /** Forward offset (m). */
  fwd: number;
  /** Vertical offset (m). */
  up: number;
  /** Pitch (rad): + = nose down / lunge, − = rear up / lean back. */
  lean: number;
  /** Side roll (rad). */
  roll: number;
  /** Extra yaw spin (rad). */
  spin: number;
  /** Vertical squash/stretch (1 = none). */
  squash: number;
  /** Leg/wing cycling 0..1 (running). */
  run: number;
  /** 0..1 charge glow. */
  energy: number;
  /** Emit a footstep/landing dust puff this frame. */
  dust?: boolean;
  /** Small random shake amplitude. */
  jitter?: number;
}

const rest = (): Pose => ({ fwd: 0, up: 0, lean: 0, roll: 0, spin: 0, squash: 1, run: 0, energy: 0 });

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeIn = (x: number) => x * x;
const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
const smooth = (x: number) => x * x * (3 - 2 * x);
/** Remap k from [a, b] to 0..1. */
const seg = (k: number, a: number, b: number) => clamp01((k - a) / (b - a));

type Phase = 'windup' | 'active' | 'recovery';
/** `reach`: how far (m) a melee move travels to touch the opponent (current distance minus body sizes). */
type MotionFn = (phase: Phase, k: number, t: number, reach: number) => Pose;

// ---------------------------------------------------------------- melee

/** Shell Ram: tuck into the shell and roll at the target, then roll back. */
const roll: MotionFn = (phase, k, _t, reach) => {
  const p = rest();
  if (phase === 'windup') {
    p.squash = 1 - 0.25 * seg(k, 0, 0.4);
    p.fwd = reach * easeIn(seg(k, 0.45, 1));
    p.energy = k;
  } else if (phase === 'active') {
    p.squash = 0.75;
    p.fwd = reach;
    p.energy = 1;
  } else {
    p.squash = 0.75 + 0.25 * seg(k, 0.7, 1);
    p.fwd = reach * (1 - smooth(k));
  }
  p.lean = p.fwd / 0.35; // rolling: rotation follows distance travelled
  p.dust = p.fwd > 0.2 && Math.random() < 0.4;
  return p;
};

/** Bubble Bump: squash down, then bounce over in hops and bump. */
const bounce: MotionFn = (phase, k, _t, reach) => {
  const p = rest();
  if (phase === 'windup') {
    const crouch = seg(k, 0, 0.35);
    const go = seg(k, 0.35, 1);
    p.squash = 1 - 0.3 * crouch * (1 - go);
    p.fwd = reach * go;
    const hop = Math.abs(Math.sin(go * Math.PI * 2));
    p.up = hop * 0.7;
    p.squash *= go > 0 ? 0.85 + hop * 0.35 : 1;
    p.energy = k;
  } else if (phase === 'active') {
    p.fwd = reach + Math.sin(k * Math.PI) * 0.3;
    p.squash = 1.25 - Math.sin(k * Math.PI) * 0.5;
    p.energy = 1;
  } else {
    p.fwd = reach * (1 - k);
    p.up = Math.abs(Math.sin(k * Math.PI * 2)) * 0.5;
    p.squash = 0.9 + p.up * 0.3;
  }
  p.dust = p.up < 0.05 && p.fwd > 0.3 && Math.random() < 0.5;
  return p;
};

/** Horn Charge / Bramble Stampede: paw the ground, head down, gallop in, headbutt, trot back. */
const gallop = (pawUntil: number): MotionFn => (phase, k, t, reach) => {
  const p = rest();
  if (phase === 'windup') {
    p.lean = 0.3 * seg(k, 0, pawUntil);
    p.fwd = -0.15 * seg(k, 0, pawUntil) + (reach + 0.15) * easeIn(seg(k, pawUntil, 1));
    p.run = k < pawUntil ? 0.35 : 1;
    p.up = Math.abs(Math.sin(t * 18)) * (k < pawUntil ? 0.02 : 0.1);
    p.dust = Math.random() < (k < pawUntil ? 0.25 : 0.6);
    p.energy = k;
  } else if (phase === 'active') {
    p.fwd = reach + Math.sin(k * Math.PI) * 0.25;
    p.lean = 0.45;
    p.energy = 1;
  } else {
    p.fwd = reach * (1 - smooth(k));
    p.lean = 0.3 * (1 - k);
    p.run = 0.6 * (1 - k);
    p.up = Math.abs(Math.sin(t * 14)) * 0.06 * (1 - k);
  }
  return p;
};

/** Wing Flick: lift off, fly in, pirouette with the wings, fly back. */
const pirouette: MotionFn = (phase, k, _t, reach) => {
  const p = rest();
  if (phase === 'windup') {
    p.up = 0.35 * seg(k, 0, 0.5);
    p.fwd = reach * easeIn(seg(k, 0.4, 1));
    p.run = 1;
    p.energy = k;
  } else if (phase === 'active') {
    p.up = 0.35;
    p.fwd = reach;
    p.spin = k * Math.PI * 2;
    p.run = 1;
    p.energy = 1;
  } else {
    p.up = 0.35 * (1 - k);
    p.fwd = reach * (1 - smooth(k));
    p.run = 0.5;
  }
  return p;
};

/** Molten Leap: deep crouch, a big arcing jump onto the target, slam, hop back. */
const leap: MotionFn = (phase, k, _t, reach) => {
  const p = rest();
  if (phase === 'windup') {
    const crouch = seg(k, 0, 0.4);
    const air = seg(k, 0.4, 1);
    p.squash = air > 0 ? 1.15 : 1 - 0.35 * crouch;
    p.lean = air > 0 ? -0.3 + 0.6 * air : -0.2 * crouch;
    p.fwd = reach * air;
    p.up = Math.sin(air * Math.PI) * 2.4;
    p.energy = k;
  } else if (phase === 'active') {
    p.fwd = reach;
    p.squash = 0.6 + 0.4 * k;
    p.lean = 0.3 * (1 - k);
    p.dust = k < 0.2;
    p.energy = 1;
  } else {
    p.fwd = reach * (1 - k);
    p.up = Math.sin(k * Math.PI) * 0.9;
  }
  return p;
};

// ---------------------------------------------------------------- ranged / self

/** Inhale (head back, swell), then thrust forward as the attack leaves. */
const spit: MotionFn = (phase, k) => {
  const p = rest();
  if (phase === 'windup') { p.lean = -0.3 * k; p.squash = 1 + 0.12 * k; p.energy = k; }
  else if (phase === 'active') { p.lean = 0.3; p.fwd = 0.25; p.squash = 0.95; p.energy = 1; }
  else { p.lean = 0.3 * (1 - k); p.fwd = 0.25 * (1 - k); }
  return p;
};

/** Puff up, then vibrate with recoil while spraying. */
const jet: MotionFn = (phase, k, t) => {
  const p = rest();
  if (phase === 'windup') { p.squash = 1 + 0.18 * k; p.energy = k; }
  else if (phase === 'active') { p.fwd = -0.2; p.squash = 1.05; p.jitter = 0.04; p.energy = 1; p.roll = Math.sin(t * 60) * 0.04; }
  else { p.fwd = -0.2 * (1 - k); }
  return p;
};

/** Tuck under the shell (Heat Shell) / brace (Tide Mirror). */
const tuck: MotionFn = (phase, k, t) => {
  const p = rest();
  if (phase === 'windup') { p.squash = 1 - 0.3 * k; p.energy = k; p.spin = k * Math.PI; }
  else if (phase === 'active') { p.squash = 0.7; p.energy = 1; p.spin = Math.PI + k * Math.PI; p.jitter = 0.01 * Math.sin(t); }
  else { p.squash = 0.7 + 0.3 * k; }
  return p;
};

/** Stomp the ground repeatedly, then one big slam (Magma Burst / Volcanic Ruin). */
const stomp: MotionFn = (phase, k) => {
  const p = rest();
  if (phase === 'windup') {
    const stomps = 4;
    const s = (k * stomps) % 1;
    const last = k > 0.8;
    p.up = last ? Math.sin(seg(k, 0.8, 1) * Math.PI) * 0.7 : Math.sin(s * Math.PI) * 0.18;
    p.squash = p.up < 0.03 ? 0.85 : 1.05;
    p.dust = p.up < 0.02 && Math.random() < 0.5;
    p.lean = -0.15 * k;
    p.energy = k;
  } else if (phase === 'active') {
    p.squash = 0.65 + 0.35 * k;
    p.lean = 0.25 * (1 - k);
    p.dust = k < 0.3;
    p.energy = 1;
  } else { p.squash = 1; }
  return p;
};

/** Rise up spinning gently (Healing Rain / Ancient Bloom). */
const levitate: MotionFn = (phase, k) => {
  const p = rest();
  if (phase === 'windup') { p.up = 0.45 * smooth(k); p.spin = k * Math.PI; p.energy = k; }
  else if (phase === 'active') { p.up = 0.45; p.spin = Math.PI + k * Math.PI; p.squash = 1.08; p.energy = 1; }
  else { p.up = 0.45 * (1 - smooth(k)); }
  return p;
};

/** Swell and rise, then crash down sending the wave (Tidal Crash / Maelstrom). */
const crash: MotionFn = (phase, k) => {
  const p = rest();
  if (phase === 'windup') { p.up = 0.6 * smooth(k); p.squash = 1 + 0.3 * k; p.lean = -0.25 * k; p.energy = k; }
  else if (phase === 'active') { p.up = 0.6 * (1 - easeOut(k)); p.fwd = 0.35 * k; p.squash = 1.3 - 0.6 * k; p.lean = 0.35; p.dust = k > 0.8; p.energy = 1; }
  else { p.fwd = 0.35 * (1 - k); p.squash = 0.7 + 0.3 * k; p.lean = 0.35 * (1 - k); }
  return p;
};

/** Shake the back (leaves fly off), then a forward flick. */
const shake: MotionFn = (phase, k, t) => {
  const p = rest();
  if (phase === 'windup') { p.roll = Math.sin(t * 45) * 0.18 * k; p.energy = k; }
  else if (phase === 'active') { p.lean = 0.25; p.fwd = 0.2; p.energy = 1; }
  else { p.lean = 0.25 * (1 - k); p.fwd = 0.2 * (1 - k); }
  return p;
};

/** Rear up, then whip the head forward (Vine Snare). */
const whip: MotionFn = (phase, k) => {
  const p = rest();
  if (phase === 'windup') { p.lean = -0.45 * smooth(k); p.up = 0.12 * k; p.energy = k; }
  else if (phase === 'active') { p.lean = -0.45 + 0.95 * easeOut(k); p.energy = 1; }
  else { p.lean = 0.5 * (1 - k); }
  return p;
};

/** Rear up high on the hind legs and slam down (Thorn Quake). */
const rear: MotionFn = (phase, k) => {
  const p = rest();
  if (phase === 'windup') {
    const upK = seg(k, 0, 0.85);
    const down = seg(k, 0.85, 1);
    p.lean = -0.75 * smooth(upK) * (1 - down) + 0.3 * down;
    p.up = 0.3 * smooth(upK) * (1 - down);
    p.energy = k;
  } else if (phase === 'active') { p.lean = 0.3 * (1 - k); p.squash = 0.75 + 0.25 * k; p.dust = k < 0.4; p.energy = 1; }
  else { p.squash = 1; }
  return p;
};

/** Quick jab forward with the head (Spark Dart). */
const jab: MotionFn = (phase, k) => {
  const p = rest();
  if (phase === 'windup') { p.lean = -0.25 * k; p.fwd = -0.1 * k; p.energy = k; }
  else if (phase === 'active') { p.lean = 0.35; p.fwd = 0.35; p.energy = 1; }
  else { p.lean = 0.35 * (1 - k); p.fwd = 0.35 * (1 - k); }
  return p;
};

/** Wings wide and trembling with charge (Static Field). */
const tremble: MotionFn = (phase, k) => {
  const p = rest();
  if (phase === 'windup') { p.jitter = 0.03 * k; p.squash = 1 + 0.1 * k; p.run = k; p.energy = k; }
  else if (phase === 'active') { p.jitter = 0.05; p.squash = 1.1; p.run = 1; p.energy = 1; }
  else { p.squash = 1 + 0.1 * (1 - k); }
  return p;
};

/** Soar up high pointing at the sky, then dive forward as the bolt fires (Thunder Lance / Sky Judgement). */
const dive = (height: number): MotionFn => (phase, k) => {
  const p = rest();
  if (phase === 'windup') { p.up = height * smooth(k); p.lean = -0.5 * smooth(k); p.run = 1; p.energy = k; }
  else if (phase === 'active') { p.up = height * (1 - easeOut(k)) ; p.fwd = 0.9 * easeOut(k); p.lean = 0.6; p.run = 1; p.energy = 1; }
  else { p.fwd = 0.9 * (1 - smooth(k)); p.lean = 0.6 * (1 - k); }
  return p;
};

/** Rise, then three quick jabs (Chain Storm). */
const triple: MotionFn = (phase, k) => {
  const p = rest();
  if (phase === 'windup') { p.up = 0.35 * smooth(k); p.lean = -0.2 * k; p.run = 1; p.energy = k; }
  else if (phase === 'active') { p.up = 0.35; p.lean = 0.35 * Math.abs(Math.sin(k * Math.PI * 3)); p.fwd = 0.25 * Math.abs(Math.sin(k * Math.PI * 3)); p.run = 1; p.energy = 1; }
  else { p.up = 0.35 * (1 - k); }
  return p;
};

const MOTIONS: Record<MoveId, MotionFn> = {
  shell_ram: roll, cinder_spit: spit, heat_shell: tuck, magma_burst: stomp,
  bubble_bump: bounce, water_jet: jet, healing_rain: levitate, tidal_crash: crash,
  horn_charge: gallop(0.55), leaf_volley: shake, vine_snare: whip, thorn_quake: rear,
  wing_flick: pirouette, spark_dart: jab, static_field: tremble, thunder_lance: dive(1.0),
  molten_leap: leap, tide_mirror: tuck, bramble_stampede: gallop(0.6), chain_storm: triple,
  rock_hurl: spit, frost_fin: jet, toxic_thorns: spit, gale_slash: jab,
  tremor_crush: stomp, void_bite: leap, mind_bloom: levitate, razor_pinion: dive(1.0),
  pebble_bump: roll, gravel_shot: shake, stone_skin: tuck, fault_quake: rear, magma_chunk: spit, glacier_drop: stomp,
  beak_peck: pirouette, feather_dart: jab, dizzy_gale: tremble, hurricane: crash, shadow_talon: leap, draco_zephyr: dive(1.2),
  paw_tap: bounce, psy_orb: levitate, calm_mind: levitate, mind_crush: tremble, spirit_hex: whip, astral_blade: dive(1.0),
  volcanic_ruin: stomp, maelstrom: crash, ancient_bloom: levitate, sky_judgement: dive(1.6),
};

export function movePose(move: MoveId, phase: Phase, k: number, time: number, reach: number): Pose {
  return MOTIONS[move](phase, k, time, Math.max(0, reach));
}

/** Quick lateral hop with a roll for the dodge dash (`dir` = roll direction). */
export function dodgePose(k: number, dir: number): Pose {
  const p = rest();
  p.roll = dir * Math.sin(k * Math.PI) * 0.6;
  p.up = Math.sin(k * Math.PI) * 0.3;
  p.squash = 1 + Math.sin(k * Math.PI) * 0.1;
  p.run = 1 - k;
  return p;
}

/** Alert stance: low, coiled, weight shifting from side to side. */
export function alertPose(t: number): Pose {
  const p = rest();
  p.squash = 0.9 + Math.sin(t * 7) * 0.02;
  p.lean = 0.12;
  p.roll = Math.sin(t * 3.5) * 0.08;
  p.run = 0.4;
  p.energy = 0.35;
  return p;
}
