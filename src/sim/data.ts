import type { Element, MoveDef, MoveId, SpeciesDef, SpeciesId, SpeedClass } from './types';

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

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  cindrix: { id: 'cindrix', name: 'Cindrix', element: 'fire', maxHp: 110, speed: 'medium', moves: ['shell_ram', 'cinder_spit', 'heat_shell', 'magma_burst'] },
  brinkle: { id: 'brinkle', name: 'Brinkle', element: 'water', maxHp: 120, speed: 'medium', moves: ['bubble_bump', 'water_jet', 'healing_rain', 'tidal_crash'] },
  vinram: { id: 'vinram', name: 'Vinram', element: 'grass', maxHp: 125, speed: 'slow', moves: ['horn_charge', 'leaf_volley', 'vine_snare', 'thorn_quake'] },
  joltmoth: { id: 'joltmoth', name: 'Joltmoth', element: 'electric', maxHp: 95, speed: 'fast', moves: ['wing_flick', 'spark_dart', 'static_field', 'thunder_lance'] },
};

export const SPECIES_IDS: SpeciesId[] = ['cindrix', 'brinkle', 'vinram', 'joltmoth'];

const dmg = { kind: 'damage' } as const;

// Timings: light melee ≈ 0.9 s total, projectiles ≈ 1 s, heavies ≈ 2.3–2.6 s with long windups.
export const MOVES: Record<MoveId, MoveDef> = {
  // Cindrix
  shell_ram: { id: 'shell_ram', species: 'cindrix', element: 'normal', cost: 10, power: 12, delivery: 'melee', effect: dmg, windup: 0.35, active: 0.25, recovery: 0.35, heavy: false, name: { en: 'Shell Ram', it: 'Carica Corazzata' } },
  cinder_spit: { id: 'cinder_spit', species: 'cindrix', element: 'fire', cost: 15, power: 16, delivery: 'projectile', effect: dmg, windup: 0.45, active: 0.15, recovery: 0.45, speed: 14, heavy: false, name: { en: 'Cinder Spit', it: 'Sputo di Brace' } },
  heat_shell: { id: 'heat_shell', species: 'cindrix', element: 'fire', cost: 20, power: 0, delivery: 'self', effect: { kind: 'shield', factor: 0.5, seconds: 4 }, windup: 0.3, active: 0.2, recovery: 0.3, heavy: false, name: { en: 'Heat Shell', it: 'Guscio Rovente' } },
  magma_burst: { id: 'magma_burst', species: 'cindrix', element: 'fire', cost: 35, power: 30, delivery: 'ground', effect: dmg, windup: 1.4, active: 0.5, recovery: 0.7, hitDelay: 0.15, heavy: true, name: { en: 'Magma Burst', it: 'Esplosione di Magma' } },
  // Brinkle
  bubble_bump: { id: 'bubble_bump', species: 'brinkle', element: 'normal', cost: 10, power: 12, delivery: 'melee', effect: dmg, windup: 0.35, active: 0.25, recovery: 0.35, heavy: false, name: { en: 'Bubble Bump', it: 'Spinta di Bolla' } },
  water_jet: { id: 'water_jet', species: 'brinkle', element: 'water', cost: 15, power: 16, delivery: 'beam', effect: dmg, windup: 0.5, active: 0.4, recovery: 0.35, hitDelay: 0.15, heavy: false, name: { en: 'Water Jet', it: "Getto d'Acqua" } },
  healing_rain: { id: 'healing_rain', species: 'brinkle', element: 'water', cost: 25, power: 0, delivery: 'self', effect: { kind: 'heal', amount: 18, seconds: 3 }, windup: 0.6, active: 0.3, recovery: 0.4, heavy: false, name: { en: 'Healing Rain', it: 'Pioggia Curativa' } },
  tidal_crash: { id: 'tidal_crash', species: 'brinkle', element: 'water', cost: 35, power: 30, delivery: 'wave', effect: dmg, windup: 1.2, active: 0.4, recovery: 0.7, speed: 9, heavy: true, name: { en: 'Tidal Crash', it: 'Schianto di Marea' } },
  // Vinram
  horn_charge: { id: 'horn_charge', species: 'vinram', element: 'normal', cost: 10, power: 13, delivery: 'melee', effect: dmg, windup: 0.4, active: 0.25, recovery: 0.4, heavy: false, name: { en: 'Horn Charge', it: 'Carica di Corna' } },
  leaf_volley: { id: 'leaf_volley', species: 'vinram', element: 'grass', cost: 15, power: 15, delivery: 'projectile', effect: dmg, windup: 0.45, active: 0.2, recovery: 0.45, speed: 12, heavy: false, name: { en: 'Leaf Volley', it: 'Raffica di Foglie' } },
  vine_snare: { id: 'vine_snare', species: 'vinram', element: 'grass', cost: 20, power: 0, delivery: 'projectile', effect: { kind: 'root', seconds: 2 }, windup: 0.5, active: 0.2, recovery: 0.4, speed: 11, heavy: false, name: { en: 'Vine Snare', it: 'Laccio di Liane' } },
  thorn_quake: { id: 'thorn_quake', species: 'vinram', element: 'grass', cost: 35, power: 30, delivery: 'ground', effect: dmg, windup: 1.3, active: 0.5, recovery: 0.7, speed: 10, heavy: true, name: { en: 'Thorn Quake', it: 'Terremoto di Spine' } },
  // Joltmoth
  wing_flick: { id: 'wing_flick', species: 'joltmoth', element: 'normal', cost: 10, power: 11, delivery: 'melee', effect: dmg, windup: 0.3, active: 0.2, recovery: 0.3, heavy: false, name: { en: 'Wing Flick', it: "Colpo d'Ala" } },
  spark_dart: { id: 'spark_dart', species: 'joltmoth', element: 'electric', cost: 15, power: 15, delivery: 'projectile', effect: dmg, windup: 0.4, active: 0.15, recovery: 0.4, speed: 22, heavy: false, name: { en: 'Spark Dart', it: 'Dardo Scintilla' } },
  static_field: { id: 'static_field', species: 'joltmoth', element: 'electric', cost: 20, power: 0, delivery: 'beam', effect: { kind: 'static', seconds: 5 }, windup: 0.5, active: 0.3, recovery: 0.4, hitDelay: 0.2, heavy: false, name: { en: 'Static Field', it: 'Campo Statico' } },
  thunder_lance: { id: 'thunder_lance', species: 'joltmoth', element: 'electric', cost: 35, power: 29, delivery: 'projectile', effect: dmg, windup: 1.1, active: 0.3, recovery: 0.7, speed: 45, heavy: true, name: { en: 'Thunder Lance', it: 'Lancia di Tuono' } },
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
