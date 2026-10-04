// Pure data types for the combat simulation. No DOM / Three.js imports allowed in src/sim.

export type Element = 'normal' | 'fire' | 'water' | 'grass' | 'electric';
export type SpeciesId = 'cindrix' | 'brinkle' | 'vinram' | 'joltmoth';
export type PlayerIdx = 0 | 1;
export type Lang = 'en' | 'it';

export type MoveId =
  | 'shell_ram' | 'cinder_spit' | 'heat_shell' | 'magma_burst'
  | 'bubble_bump' | 'water_jet' | 'healing_rain' | 'tidal_crash'
  | 'horn_charge' | 'leaf_volley' | 'vine_snare' | 'thorn_quake'
  | 'wing_flick' | 'spark_dart' | 'static_field' | 'thunder_lance';

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
  | { kind: 'static'; seconds: number };

export interface MoveDef {
  id: MoveId;
  species: SpeciesId;
  element: Element;
  cost: number;
  power: number; // 0 for non-damaging moves
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
  name: Record<Lang, string>;
}

export type SpeedClass = 'slow' | 'medium' | 'fast';

export interface SpeciesDef {
  id: SpeciesId;
  element: Element;
  maxHp: number;
  speed: SpeedClass;
  moves: [MoveId, MoveId, MoveId, MoveId];
  name: string; // invented names are the same in both languages
}

/** A queued action. */
export type QAction =
  | { kind: 'move'; move: MoveId }
  | { kind: 'dodge' }
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
  /** Lateral offset (m) of the active creature and its drift direction. */
  x: number;
  driftDir: 1 | -1;
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
  /** Lateral positions at launch, for rendering trajectories. */
  fromX: number;
  toX: number;
}

export interface SimState {
  tick: number;
  rng: number;
  nextId: number;
  trainers: [TrainerState, TrainerState];
  strikes: Strike[];
  /** null while running. */
  result: null | { winner: PlayerIdx | 'draw' };
}

export type Effectiveness = 'super' | 'weak' | 'neutral';

export type FailReason = 'dodged' | 'interrupted' | 'stamina' | 'target_recalled' | 'rooted' | 'no_bench';

export type SimEvent =
  | { t: 'action_start'; p: PlayerIdx; action: QAction }
  | { t: 'launch'; p: PlayerIdx; move: MoveId; strike?: number }
  | { t: 'hit'; p: PlayerIdx; target: PlayerIdx; move: MoveId; damage: number; eff: Effectiveness; interrupted: boolean; heavy: boolean; strike: number }
  | { t: 'dodged'; p: PlayerIdx; target: PlayerIdx; move: MoveId; strike: number }
  | { t: 'fizzle'; p: PlayerIdx; move: MoveId; strike: number }
  | { t: 'fail'; p: PlayerIdx; reason: FailReason }
  | { t: 'status'; p: PlayerIdx; status: 'shield' | 'static' | 'root' | 'heal'; on: boolean }
  | { t: 'heal'; p: PlayerIdx; amount: number }
  | { t: 'dodge'; p: PlayerIdx; dir: 1 | -1 }
  | { t: 'recall'; p: PlayerIdx; slot: number }
  | { t: 'sendout'; p: PlayerIdx; slot: number }
  | { t: 'faint'; p: PlayerIdx; slot: number }
  | { t: 'switch_prompt'; p: PlayerIdx; seconds: number }
  | { t: 'queue_full'; p: PlayerIdx }
  | { t: 'invalid'; p: PlayerIdx; reason: 'unknown_move' | 'cannot_recall' | 'not_now' }
  | { t: 'stopped'; p: PlayerIdx }
  | { t: 'match_end'; winner: PlayerIdx | 'draw' };
