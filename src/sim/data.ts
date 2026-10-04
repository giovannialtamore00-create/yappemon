import type { BaseSpeciesId, Element, MoveDef, MoveId, SpeciesDef, SpeciesId, SpeedClass } from './types';

export const TICK_HZ = 30;
export const DT = 1 / TICK_HZ;

export const STAMINA_MAX = 100;
export const STAMINA_REGEN_PER_S = 10;
export const STAMINA_PAUSE_S = 0.8;
export const QUEUE_MAX = 4;
export const INTERRUPT_THRESHOLD = 25;
export const STAB = 1.25;

export const DODGE_COST = 15;
export const DODGE_INVULN_S = 0.4;
export const DODGE_COOLDOWN_S = 1.0;
export const DODGE_STEP_M = 1.3;

export const RECALL_S = 1.5;
export const SENDOUT_S = 1.0;
export const FORCED_SWITCH_S = 10;

/** Distance between the two creatures along z (m). Used for strike travel time. */
export const CREATURE_GAP_M = 6;
export const DRIFT_LIMIT_M = 2.2;

export const SPEED_MULT: Record<SpeedClass, number> = { slow: 1.15, medium: 1, fast: 0.85 };
export const DRIFT_SPEED: Record<SpeedClass, number> = { slow: 0.25, medium: 0.35, fast: 0.5 };

/** Rounds needed to win the match (best of 3). Set to 3 to always play all three rounds. */
export const ROUNDS_TO_WIN = 2;
export const MAX_ROUNDS = 3;
/** Break between rounds: result banner, then the evolution animation. */
export const INTERMISSION_S = 7;

const CINDRIX_MOVES: MoveId[] = ['shell_ram', 'cinder_spit', 'heat_shell', 'magma_burst'];
const BRINKLE_MOVES: MoveId[] = ['bubble_bump', 'water_jet', 'healing_rain', 'tidal_crash'];
const VINRAM_MOVES: MoveId[] = ['horn_charge', 'leaf_volley', 'vine_snare', 'thorn_quake'];
const JOLTMOTH_MOVES: MoveId[] = ['wing_flick', 'spark_dart', 'static_field', 'thunder_lance'];

// Stage 2: HP ×1.25, damage ×1.15, +1 move. Stage 3: HP ×1.5, damage ×1.3, +1 more move.
export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  cindrix: { id: 'cindrix', name: 'Cindrix', element: 'fire', maxHp: 110, speed: 'medium', moves: CINDRIX_MOVES, stage: 1, family: 'cindrix', next: 'pyroxen', dmgMult: 1 },
  brinkle: { id: 'brinkle', name: 'Brinkle', element: 'water', maxHp: 120, speed: 'medium', moves: BRINKLE_MOVES, stage: 1, family: 'brinkle', next: 'tsunafin', dmgMult: 1 },
  vinram: { id: 'vinram', name: 'Vinram', element: 'grass', maxHp: 125, speed: 'slow', moves: VINRAM_MOVES, stage: 1, family: 'vinram', next: 'thornhorn', dmgMult: 1 },
  joltmoth: { id: 'joltmoth', name: 'Joltmoth', element: 'electric', maxHp: 95, speed: 'fast', moves: JOLTMOTH_MOVES, stage: 1, family: 'joltmoth', next: 'stormoth', dmgMult: 1 },

  pyroxen: { id: 'pyroxen', name: 'Pyroxen', element: 'fire', maxHp: 138, speed: 'medium', moves: [...CINDRIX_MOVES, 'molten_leap'], stage: 2, family: 'cindrix', next: 'calderox', dmgMult: 1.15 },
  tsunafin: { id: 'tsunafin', name: 'Tsunafin', element: 'water', maxHp: 150, speed: 'medium', moves: [...BRINKLE_MOVES, 'tide_mirror'], stage: 2, family: 'brinkle', next: 'abyssmaw', dmgMult: 1.15 },
  thornhorn: { id: 'thornhorn', name: 'Thornhorn', element: 'grass', maxHp: 156, speed: 'slow', moves: [...VINRAM_MOVES, 'bramble_stampede'], stage: 2, family: 'vinram', next: 'elderoot', dmgMult: 1.15 },
  stormoth: { id: 'stormoth', name: 'Stormoth', element: 'electric', maxHp: 119, speed: 'fast', moves: [...JOLTMOTH_MOVES, 'chain_storm'], stage: 2, family: 'joltmoth', next: 'tempestra', dmgMult: 1.15 },

  calderox: { id: 'calderox', name: 'Calderox', element: 'fire', maxHp: 165, speed: 'medium', moves: [...CINDRIX_MOVES, 'molten_leap', 'volcanic_ruin'], stage: 3, family: 'cindrix', dmgMult: 1.3 },
  abyssmaw: { id: 'abyssmaw', name: 'Abyssmaw', element: 'water', maxHp: 180, speed: 'medium', moves: [...BRINKLE_MOVES, 'tide_mirror', 'maelstrom'], stage: 3, family: 'brinkle', dmgMult: 1.3 },
  elderoot: { id: 'elderoot', name: 'Elderoot', element: 'grass', maxHp: 188, speed: 'slow', moves: [...VINRAM_MOVES, 'bramble_stampede', 'ancient_bloom'], stage: 3, family: 'vinram', dmgMult: 1.3 },
  tempestra: { id: 'tempestra', name: 'Tempestra', element: 'electric', maxHp: 143, speed: 'fast', moves: [...JOLTMOTH_MOVES, 'chain_storm', 'sky_judgement'], stage: 3, family: 'joltmoth', dmgMult: 1.3 },
};

/** Selectable (stage-1) species. */
export const SPECIES_IDS: BaseSpeciesId[] = ['cindrix', 'brinkle', 'vinram', 'joltmoth'];
export const ALL_SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];

/** The form of a base species at a given stage (1–3). */
export function speciesAtStage(base: BaseSpeciesId, stage: number): SpeciesId {
  let id: SpeciesId = base;
  for (let i = 1; i < stage && SPECIES[id].next; i++) id = SPECIES[id].next!;
  return id;
}

/** All forms of an evolution line, stage 1 first. */
export function evolutionLine(base: BaseSpeciesId): SpeciesId[] {
  return [1, 2, 3].map((st) => speciesAtStage(base, st));
}

export const knowsMove = (species: SpeciesId, move: MoveId) => SPECIES[species].moves.includes(move);
export const sameFamily = (a: SpeciesId, b: SpeciesId) => SPECIES[a].family === SPECIES[b].family;

const dmg = { kind: 'damage' } as const;

// Timings: light melee ≈ 0.9 s total, projectiles ≈ 1 s, heavies ≈ 2.4–2.9 s with long (1.4–1.7 s) windups
// so a voice "dodge" (recognizer latency ≈ 0.6–1.2 s) can land in time.
export const MOVES: Record<MoveId, MoveDef> = {
  // Cindrix
  shell_ram: { id: 'shell_ram', species: 'cindrix', element: 'normal', cost: 10, power: 12, delivery: 'melee', effect: dmg, windup: 0.35, active: 0.25, recovery: 0.35, heavy: false, name: { en: 'Shell Ram', it: 'Carica Corazzata' } },
  cinder_spit: { id: 'cinder_spit', species: 'cindrix', element: 'fire', cost: 15, power: 16, delivery: 'projectile', effect: dmg, windup: 0.45, active: 0.15, recovery: 0.45, speed: 14, heavy: false, name: { en: 'Cinder Spit', it: 'Sputo di Brace' } },
  heat_shell: { id: 'heat_shell', species: 'cindrix', element: 'fire', cost: 20, power: 0, delivery: 'self', effect: { kind: 'shield', factor: 0.5, seconds: 4 }, windup: 0.3, active: 0.2, recovery: 0.3, heavy: false, name: { en: 'Heat Shell', it: 'Guscio Rovente' } },
  magma_burst: { id: 'magma_burst', species: 'cindrix', element: 'fire', cost: 35, power: 30, delivery: 'ground', effect: dmg, windup: 1.7, active: 0.5, recovery: 0.7, hitDelay: 0.15, heavy: true, name: { en: 'Magma Burst', it: 'Esplosione di Magma' } },
  // Brinkle
  bubble_bump: { id: 'bubble_bump', species: 'brinkle', element: 'normal', cost: 10, power: 12, delivery: 'melee', effect: dmg, windup: 0.35, active: 0.25, recovery: 0.35, heavy: false, name: { en: 'Bubble Bump', it: 'Spinta di Bolla' } },
  water_jet: { id: 'water_jet', species: 'brinkle', element: 'water', cost: 15, power: 16, delivery: 'beam', effect: dmg, windup: 0.5, active: 0.4, recovery: 0.35, hitDelay: 0.15, heavy: false, name: { en: 'Water Jet', it: "Getto d'Acqua" } },
  healing_rain: { id: 'healing_rain', species: 'brinkle', element: 'water', cost: 25, power: 0, delivery: 'self', effect: { kind: 'heal', amount: 18, seconds: 3 }, windup: 0.6, active: 0.3, recovery: 0.4, heavy: false, name: { en: 'Healing Rain', it: 'Pioggia Curativa' } },
  tidal_crash: { id: 'tidal_crash', species: 'brinkle', element: 'water', cost: 35, power: 30, delivery: 'wave', effect: dmg, windup: 1.5, active: 0.4, recovery: 0.7, speed: 9, heavy: true, name: { en: 'Tidal Crash', it: 'Schianto di Marea' } },
  // Vinram
  horn_charge: { id: 'horn_charge', species: 'vinram', element: 'normal', cost: 10, power: 13, delivery: 'melee', effect: dmg, windup: 0.4, active: 0.25, recovery: 0.4, heavy: false, name: { en: 'Horn Charge', it: 'Carica di Corna' } },
  leaf_volley: { id: 'leaf_volley', species: 'vinram', element: 'grass', cost: 15, power: 15, delivery: 'projectile', effect: dmg, windup: 0.45, active: 0.2, recovery: 0.45, speed: 12, heavy: false, name: { en: 'Leaf Volley', it: 'Raffica di Foglie' } },
  vine_snare: { id: 'vine_snare', species: 'vinram', element: 'grass', cost: 20, power: 0, delivery: 'projectile', effect: { kind: 'root', seconds: 2 }, windup: 0.5, active: 0.2, recovery: 0.4, speed: 11, heavy: false, name: { en: 'Vine Snare', it: 'Laccio di Liane' } },
  thorn_quake: { id: 'thorn_quake', species: 'vinram', element: 'grass', cost: 35, power: 30, delivery: 'ground', effect: dmg, windup: 1.5, active: 0.5, recovery: 0.7, speed: 10, heavy: true, name: { en: 'Thorn Quake', it: 'Terremoto di Spine' } },
  // Joltmoth
  wing_flick: { id: 'wing_flick', species: 'joltmoth', element: 'normal', cost: 10, power: 11, delivery: 'melee', effect: dmg, windup: 0.3, active: 0.2, recovery: 0.3, heavy: false, name: { en: 'Wing Flick', it: "Colpo d'Ala" } },
  spark_dart: { id: 'spark_dart', species: 'joltmoth', element: 'electric', cost: 15, power: 15, delivery: 'projectile', effect: dmg, windup: 0.4, active: 0.15, recovery: 0.4, speed: 22, heavy: false, name: { en: 'Spark Dart', it: 'Dardo Scintilla' } },
  static_field: { id: 'static_field', species: 'joltmoth', element: 'electric', cost: 20, power: 0, delivery: 'beam', effect: { kind: 'static', seconds: 5 }, windup: 0.5, active: 0.3, recovery: 0.4, hitDelay: 0.2, heavy: false, name: { en: 'Static Field', it: 'Campo Statico' } },
  thunder_lance: { id: 'thunder_lance', species: 'joltmoth', element: 'electric', cost: 35, power: 29, delivery: 'projectile', effect: dmg, windup: 1.4, active: 0.3, recovery: 0.7, speed: 45, heavy: true, name: { en: 'Thunder Lance', it: 'Lancia di Tuono' } },

  // Stage 2 moves
  molten_leap: { id: 'molten_leap', species: 'pyroxen', element: 'fire', cost: 30, power: 24, delivery: 'melee', effect: dmg, windup: 0.9, active: 0.3, recovery: 0.6, heavy: false, name: { en: 'Molten Leap', it: 'Balzo Fuso' } },
  tide_mirror: { id: 'tide_mirror', species: 'tsunafin', element: 'water', cost: 25, power: 0, delivery: 'self', effect: { kind: 'mirror', seconds: 1.5 }, windup: 0.25, active: 0.2, recovery: 0.3, heavy: false, name: { en: 'Tide Mirror', it: 'Specchio di Marea' } },
  bramble_stampede: { id: 'bramble_stampede', species: 'thornhorn', element: 'grass', cost: 30, power: 24, delivery: 'melee', effect: dmg, windup: 0.9, active: 0.3, recovery: 0.6, heavy: false, armored: true, name: { en: 'Bramble Stampede', it: 'Carica di Rovi' } },
  chain_storm: { id: 'chain_storm', species: 'stormoth', element: 'electric', cost: 30, power: 10, delivery: 'projectile', effect: dmg, windup: 0.7, active: 0.6, recovery: 0.5, speed: 26, hits: 3, hitGap: 0.25, heavy: false, name: { en: 'Chain Storm', it: 'Tempesta a Catena' } },
  // Stage 3 moves
  volcanic_ruin: { id: 'volcanic_ruin', species: 'calderox', element: 'fire', cost: 45, power: 40, delivery: 'ground', effect: dmg, windup: 1.9, active: 0.6, recovery: 0.9, hitDelay: 0.2, heavy: true, name: { en: 'Volcanic Ruin', it: 'Rovina Vulcanica' } },
  maelstrom: { id: 'maelstrom', species: 'abyssmaw', element: 'water', cost: 40, power: 26, delivery: 'wave', effect: dmg, windup: 1.6, active: 0.5, recovery: 0.8, speed: 8, alsoRoot: 1.5, heavy: true, name: { en: 'Maelstrom', it: 'Gorgo Abissale' } },
  ancient_bloom: { id: 'ancient_bloom', species: 'elderoot', element: 'grass', cost: 35, power: 0, delivery: 'self', effect: { kind: 'heal', amount: 35, seconds: 3 }, windup: 0.8, active: 0.4, recovery: 0.5, heavy: false, name: { en: 'Ancient Bloom', it: 'Fioritura Antica' } },
  sky_judgement: { id: 'sky_judgement', species: 'tempestra', element: 'electric', cost: 45, power: 38, delivery: 'beam', effect: dmg, windup: 1.8, active: 0.4, recovery: 0.9, hitDelay: 0.1, heavy: true, name: { en: 'Sky Judgement', it: 'Giudizio Celeste' } },
};

export const MOVE_IDS = Object.keys(MOVES) as MoveId[];

/** Attack element → defender element → multiplier (absent = 1). */
const CHART: Partial<Record<Element, Partial<Record<Element, number>>>> = {
  fire: { grass: 2, fire: 0.5, water: 0.5 },
  water: { fire: 2, water: 0.5, grass: 0.5 },
  grass: { water: 2, grass: 0.5, fire: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5 },
};

export function typeMultiplier(attack: Element, defend: Element): number {
  return CHART[attack]?.[defend] ?? 1;
}

export const secToTicks = (s: number) => Math.max(1, Math.round(s * TICK_HZ));
