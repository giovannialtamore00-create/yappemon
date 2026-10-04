// Pure data types for the combat simulation. No DOM / Three.js imports allowed in src/sim.

export type Element = 'normal' | 'fire' | 'water' | 'grass' | 'electric';
/** Base forms (stage 1), then stage 2 and stage 3 evolutions. */
export type BaseSpeciesId = 'cindrix' | 'brinkle' | 'vinram' | 'joltmoth';
export type SpeciesId =
  | BaseSpeciesId
  | 'pyroxen' | 'tsunafin' | 'thornhorn' | 'stormoth'
  | 'calderox' | 'abyssmaw' | 'elderoot' | 'tempestra';
export type Stage = 1 | 2 | 3;
export type PlayerIdx = 0 | 1;
export type Lang = 'en' | 'it';

export type MoveId =
  | 'shell_ram' | 'cinder_spit' | 'heat_shell' | 'magma_burst'
  | 'bubble_bump' | 'water_jet' | 'healing_rain' | 'tidal_crash'
  | 'horn_charge' | 'leaf_volley' | 'vine_snare' | 'thorn_quake'
  | 'wing_flick' | 'spark_dart' | 'static_field' | 'thunder_lance'
  // stage 2
  | 'molten_leap' | 'tide_mirror' | 'bramble_stampede' | 'chain_storm'
  // stage 3
  | 'volcanic_ruin' | 'maelstrom' | 'ancient_bloom' | 'sky_judgement';

/**
 * How a move reaches its target.
 * - melee: hits at the start of the active phase (dash/lunge)
 * - projectile/wave/ground: spawns a strike that travels/erupts and resolves later
 * - beam: near-instant strike
 * - self: buff/heal on the user, never misses
 */
export type Delivery = 'melee' | 'projectile' | 'beam' | 'wave' | 'ground' | 'self';

export type MoveEffect =
  | { kind: 'damage' }
  | { kind: 'shield'; factor: number; seconds: number }
  | { kind: 'heal'; amount: number; seconds: number }
  | { kind: 'root'; seconds: number }
  | { kind: 'static'; seconds: number }
  | { kind: 'mirror'; seconds: number };

export interface MoveDef {
  id: MoveId;
  /** The species that first learns it (evolutions keep earlier moves). */
  species: SpeciesId;
  element: Element;
  cost: number;
  power: number; // 0 for non-damaging moves; per hit for multi-hit moves
  delivery: Delivery;
  effect: MoveEffect;
  /** Phase durations in seconds at medium speed. */
  windup: number;
  active: number;
  recovery: number;
  /** Travel speed in m/s for travelling strikes; undefined = uses `hitDelay`. */
  speed?: number;
  /** Delay in seconds after active start before an untravelled strike resolves. */
  hitDelay?: number;
  heavy: boolean;
  /** The windup cannot be interrupted by big hits. */
  armored?: boolean;
  /** Number of separate strikes (each dodgeable), `hitGap` seconds apart. */
  hits?: number;
  hitGap?: number;
  /** Damaging move that also roots the target for this many seconds. */
  alsoRoot?: number;
  /** Base chance to hit, 0–100 (self moves ignore it). */
  accuracy: number;
  /** Near-instant attack: tiny windup, can't be caught by the dodge window. */
  quick?: boolean;
  name: Record<Lang, string>;
}

export type SpeedClass = 'slow' | 'medium' | 'fast';

export interface SpeciesDef {
  id: SpeciesId;
  element: Element;
  maxHp: number;
  speed: SpeedClass;
  moves: MoveId[];
  name: string; // invented names are the same in both languages
  stage: Stage;
  /** The stage-1 form of this evolution line. */
  family: BaseSpeciesId;
  /** Next evolution stage, if any. */
  next?: SpeciesId;
  /** Damage multiplier for this stage. */
  dmgMult: number;
}

/** A queued action. */
export type QAction =
  | { kind: 'move'; move: MoveId }
  /** Arms a 2 s dodge window; `dir` = −1 left / +1 right (from the creature's point of view), absent = auto. */
  | { kind: 'dodge'; dir?: 1 | -1 }
  /** 3 s defensive stance: harder to hit, no attacking. */
  | { kind: 'alert' }
  | { kind: 'recall' };

/** What a player can send to the simulation. */
export type Intent =
  | { type: 'queue'; actions: QAction[] }
  | { type: 'stop' }
  | { type: 'choose'; slot: 0 | 1 }
  | { type: 'go'; species: SpeciesId };

export type ActionPhase = 'windup' | 'active' | 'recovery';

export interface ActionRun {
  action: QAction;
  phase: ActionPhase;
  /** Ticks remaining in current phase. */
  left: number;
  /** Total ticks of the current phase (for render interpolation). */
  total: number;
  /** Unique id so strikes can tell whether their source action is still running. */
  uid: number;
}

export interface CreatureState {
  species: SpeciesId;
  hp: number; // float internally; render ceil()
  maxHp: number;
  stamina: number;
  /** Ticks until stamina regen resumes. */
  regenPause: number;
  fainted: boolean;
  shieldTicks: number;
  staticTicks: number;
  rootTicks: number;
  healTicks: number;
  healPerTick: number;
  /** Tide Mirror: the next damaging hit is reflected while > 0. */
  mirrorTicks: number;
}

/**
 * Trainer field phase:
 * - sending: orb thrown, creature appearing (untargetable)
 * - active: on the field
 * - choosing: forced switch prompt open (active creature fainted)
 * - out: no creatures left
 */
export type FieldPhase = 'sending' | 'active' | 'choosing' | 'out';

export interface TrainerState {
  team: CreatureState[];
  active: number; // index into team
  field: FieldPhase;
  /** Ticks left in `sending`, or ticks until auto-pick when `choosing`. */
  fieldTicks: number;
  action: ActionRun | null;
  queue: QAction[];
  dodgeCooldown: number;
  invulnTicks: number;
  /** Active creature's position in arena (world) coordinates, metres. Player 0's half is z > 0. */
  x: number;
  z: number;
  /** Current strafe direction (world x) and ticks until the creature reconsiders it. */
  driftDir: 1 | -1;
  strafeTicks: number;
  /** Ticks left in the armed dodge window, and the requested side (0 = auto). */
  dodgeReady: number;
  dodgeDir: 0 | 1 | -1;
  /** Ticks left of a dodge dash in progress, and its world-x direction. */
  dashTicks: number;
  dashDir: 1 | -1;
  /** Ticks left of the alert stance. */
  alertTicks: number;
}

export interface Strike {
  id: number;
  owner: PlayerIdx;
  ownerSlot: number;
  ownerActionUid: number;
  target: PlayerIdx;
  targetSlot: number;
  move: MoveId;
  left: number;
  total: number;
  /** Positions at launch, for rendering trajectories. */
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  /** Set when an earlier strike of the same action was dodged (no second failure). */
  quiet?: boolean;
}

export interface SimState {
  tick: number;
  rng: number;
  nextId: number;
  trainers: [TrainerState, TrainerState];
  strikes: Strike[];
  /** Stage-1 teams picked at team select; each round uses the stage matching the round. */
  teams: [BaseSpeciesId[], BaseSpeciesId[]];
  /** 1-based round number (= evolution stage of every creature). */
  round: number;
  /** Rounds won. */
  score: [number, number];
  /** Ticks left in the between-rounds break (result banner + evolution); 0 while fighting. */
  intermission: number;
  /** null while running. */
  result: null | { winner: PlayerIdx | 'draw' };
}

export type Effectiveness = 'super' | 'weak' | 'neutral';

export type FailReason = 'dodged' | 'interrupted' | 'stamina' | 'target_recalled' | 'rooted' | 'no_bench' | 'reflected';

export type SimEvent =
  | { t: 'action_start'; p: PlayerIdx; action: QAction }
  | { t: 'launch'; p: PlayerIdx; move: MoveId; strike?: number }
  | { t: 'hit'; p: PlayerIdx; target: PlayerIdx; move: MoveId; damage: number; eff: Effectiveness; interrupted: boolean; heavy: boolean; strike: number }
  | { t: 'dodged'; p: PlayerIdx; target: PlayerIdx; move: MoveId; strike: number }
  /** Accuracy roll failed (the target sidesteps). The attacker keeps its queue. */
  | { t: 'miss'; p: PlayerIdx; target: PlayerIdx; move: MoveId; strike: number }
  /** `p` was hit while it had commands queued: they are lost. */
  | { t: 'combo_broken'; p: PlayerIdx; lost: number }
  | { t: 'dodge_ready'; p: PlayerIdx; on: boolean }
  | { t: 'alert'; p: PlayerIdx; on: boolean }
  | { t: 'fizzle'; p: PlayerIdx; move: MoveId; strike: number }
  | { t: 'fail'; p: PlayerIdx; reason: FailReason }
  | { t: 'status'; p: PlayerIdx; status: 'shield' | 'static' | 'root' | 'heal' | 'mirror'; on: boolean }
  | { t: 'heal'; p: PlayerIdx; amount: number }
  | { t: 'dodge'; p: PlayerIdx; dir: 1 | -1 }
  | { t: 'recall'; p: PlayerIdx; slot: number }
  | { t: 'sendout'; p: PlayerIdx; slot: number }
  | { t: 'faint'; p: PlayerIdx; slot: number }
  | { t: 'switch_prompt'; p: PlayerIdx; seconds: number }
  | { t: 'queue_full'; p: PlayerIdx }
  | { t: 'invalid'; p: PlayerIdx; reason: 'unknown_move' | 'cannot_recall' | 'not_now' }
  | { t: 'stopped'; p: PlayerIdx }
  | { t: 'reflect'; p: PlayerIdx; target: PlayerIdx; move: MoveId; damage: number }
  /** A round is over; the next round (if any) starts after the intermission with evolved creatures. */
  | { t: 'round_end'; round: number; winner: PlayerIdx | 'draw'; score: [number, number]; next: number | null }
  | { t: 'round_start'; round: number }
  | { t: 'match_end'; winner: PlayerIdx | 'draw' };
