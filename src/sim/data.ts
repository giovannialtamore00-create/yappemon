import type { BaseSpeciesId, CheerDef, CheerId, Element, MoveDef, MoveId, SpeciesDef, SpeciesId, SpeedClass } from './types';

export const TICK_HZ = 30;
export const DT = 1 / TICK_HZ;

export const STAMINA_MAX = 100;
export const STAMINA_REGEN_PER_S = 10;
export const STAMINA_PAUSE_S = 0.8;
export const QUEUE_MAX = 4;
export const INTERRUPT_THRESHOLD = 25;
export const STAB = 1.25;

/** All stamina costs are the listed base cost × 1.35, rounded (balance change requested by the user). */
export const STAMINA_COST_MULT = 1.35;
export const scaledCost = (base: number) => Math.round(base * STAMINA_COST_MULT);
/** Arming the dodge window is cheap and NOT scaled by the multiplier. */
export const DODGE_COST = 5;
/** How long an armed dodge window waits for an attack. */
export const DODGE_WINDOW_S = 2;
/** Super-effective multiplier (was 2×). */
export const SUPER_EFFECTIVE = 1.25;
export const NOT_VERY_EFFECTIVE = 0.5;
/** The dash triggered by the window: invulnerable 0.4 s, moves 1.8 m sideways over 0.3 s, then 1 s before another dash. */
export const DODGE_INVULN_S = 0.4;
export const DASH_S = 0.3;
export const DASH_M = 1.8;
export const DODGE_COOLDOWN_S = 1.0;
/** Alert stance: 3 s, accuracy against the creature ×0.7 (not scaled by the multiplier). */
export const ALERT_COST = 15;
export const ALERT_S = 3;
export const ALERT_EVADE = 0.7;
/** A creature busy with a move stands still: accuracy against it ×1.2. */
export const ATTACKING_EXPOSED = 1.2;
/** Verbal boosts (how the command was said; decision #73). SNAP: windup this many times faster. */
export const SNAP_SPEED = 1.5;
/** HYPE: stamina regained when the move starts, as a fraction of max stamina. */
export const HYPE_STAMINA = 0.1;
/** FULL POWER: accuracy and damage ×1.3, then unusable for this long (keeps counting between rounds). */
export const FULL_POWER_MULT = 1.3;
export const FULL_POWER_COOLDOWN_S = 60;
/** Saying the active creature's name before a command: +10 accuracy (points, capped at 100) on its moves. */
export const NAME_ACC_BONUS = 10;

/** Encouragements: instant, free, don't interrupt. Amounts are fractions of max stamina / max HP. */
export const CHEERS: Record<CheerId, CheerDef> = {
  come_on: { id: 'come_on', stamina: 0.05, name: { en: 'Come on', it: 'Forza' } },
  stay_strong: { id: 'stay_strong', tempHp: 0.02, name: { en: 'Stay strong', it: 'Resisti' } },
  courage: { id: 'courage', tempHp: 0.01, name: { en: 'Courage', it: 'Coraggio' } },
  perfect: { id: 'perfect', stamina: 0.05, name: { en: 'Perfect', it: 'Perfetto' } },
  dont_give_up: { id: 'dont_give_up', heal: 0.05, name: { en: "Don't give up", it: 'Non arrenderti' } },
};
export const CHEER_IDS = Object.keys(CHEERS) as CheerId[];
/** Minimum gap between any two encouragements of one player. */
export const CHEER_GAP_S = 5;
/** The same word again within this time has CHEER_REPEAT_FAIL chance of doing nothing. */
export const CHEER_REPEAT_S = 10;
export const CHEER_REPEAT_FAIL = 0.5;
/** Temporary HP: soaks damage first, gone after TEMP_HP_S, at most TEMP_HP_MAX × max HP. */
export const TEMP_HP_S = 10;
export const TEMP_HP_MAX = 0.1;
/** Quick moves wind up this long regardless of speed class; other attacks wind up at least MIN_WINDUP_S. */
export const QUICK_WINDUP_S = 0.15;
export const MIN_WINDUP_S = 0.6;

export const RECALL_S = 1.5;
export const SENDOUT_S = 1.0;
export const FORCED_SWITCH_S = 10;

/** Arena: |x| ≤ ARENA_X_M; player 0 lives on z ∈ [HALF_NEAR_M, HALF_FAR_M], player 1 on the mirrored negative half. */
export const ARENA_X_M = 4.5;
export const HALF_NEAR_M = 1.0;
export const HALF_FAR_M = 5.2;
/** Where a creature appears (x 0, z ±HOME_Z_M). */
export const HOME_Z_M = 3;
/** Max speed (m/s) of stepping in/out toward the preferred distance. */
export const STEP_SPEED = 0.8;
/** Strafing is this much faster while alert. */
export const ALERT_STRAFE_MULT = 1.4;
/** Strafe legs last 0.8–2.2 s before the creature turns around. */
export const STRAFE_MIN_S = 0.8;
export const STRAFE_MAX_S = 2.2;
/** Random step in/out (±) around the preferred spot, re-rolled with each strafe leg. */
export const STEP_JITTER_M = 0.6;

export const SPEED_MULT: Record<SpeedClass, number> = { slow: 1.15, medium: 1, fast: 0.85 };
export const STRAFE_SPEED: Record<SpeedClass, number> = { slow: 1.2, medium: 1.6, fast: 2.2 };
/** Distance (m) each evolution line likes to keep from the opponent: it stands about half of it from the centre line. */
export const PREFERRED_GAP_M: Record<BaseSpeciesId, number> = { cindrix: 4.5, brinkle: 5.5, vinram: 4, joltmoth: 5, gravelo: 4, pipwing: 5, wispurr: 4.5 };

/** Rounds needed to win the match (best of 3). Set to 3 to always play all three rounds. */
export const ROUNDS_TO_WIN = 2;
export const MAX_ROUNDS = 3;
/** Break between rounds: result banner, then the evolution animation. */
export const INTERMISSION_S = 7;
/** Moves a creature brings into a round, chosen from everything it has learned. */
export const LOADOUT_SIZE = 4;
/** Before every round: time to pick (and read) the moves; ends early when both players are ready. */
export const LOADOUT_S = 30;

const CINDRIX_MOVES: MoveId[] = ['shell_ram', 'cinder_spit', 'heat_shell', 'magma_burst'];
const BRINKLE_MOVES: MoveId[] = ['bubble_bump', 'water_jet', 'healing_rain', 'tidal_crash'];
const VINRAM_MOVES: MoveId[] = ['horn_charge', 'leaf_volley', 'vine_snare', 'thorn_quake'];
const JOLTMOTH_MOVES: MoveId[] = ['wing_flick', 'spark_dart', 'static_field', 'thunder_lance'];
const GRAVELO_MOVES: MoveId[] = ['pebble_bump', 'gravel_shot', 'stone_skin', 'fault_quake'];
const PIPWING_MOVES: MoveId[] = ['beak_peck', 'feather_dart', 'dizzy_gale', 'hurricane'];
const WISPURR_MOVES: MoveId[] = ['paw_tap', 'psy_orb', 'calm_mind', 'mind_crush'];

// Stage 2: HP ×1.25, damage ×1.15, +1 move. Stage 3: HP ×1.5, damage ×1.3, +1 more move.
export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  cindrix: { id: 'cindrix', name: 'Cindrix', element: 'fire', maxHp: 110, speed: 'medium', moves: CINDRIX_MOVES, stage: 1, family: 'cindrix', next: 'pyroxen', dmgMult: 1 },
  brinkle: { id: 'brinkle', name: 'Brinkle', element: 'water', maxHp: 120, speed: 'medium', moves: BRINKLE_MOVES, stage: 1, family: 'brinkle', next: 'tsunafin', dmgMult: 1 },
  vinram: { id: 'vinram', name: 'Vinram', element: 'grass', maxHp: 125, speed: 'slow', moves: VINRAM_MOVES, stage: 1, family: 'vinram', next: 'thornhorn', dmgMult: 1 },
  joltmoth: { id: 'joltmoth', name: 'Joltmoth', element: 'electric', maxHp: 95, speed: 'fast', moves: JOLTMOTH_MOVES, stage: 1, family: 'joltmoth', next: 'stormoth', dmgMult: 1 },

  gravelo: { id: 'gravelo', name: 'Gravelo', element: 'rock', element2: 'ground', maxHp: 130, speed: 'slow', moves: GRAVELO_MOVES, stage: 1, family: 'gravelo', next: 'boulderax', dmgMult: 1 },
  pipwing: { id: 'pipwing', name: 'Pipwing', element: 'flying', maxHp: 90, speed: 'fast', moves: PIPWING_MOVES, stage: 1, family: 'pipwing', next: 'galehawk', dmgMult: 1 },
  wispurr: { id: 'wispurr', name: 'Wispurr', element: 'psychic', maxHp: 100, speed: 'medium', moves: WISPURR_MOVES, stage: 1, family: 'wispurr', next: 'mystiline', dmgMult: 1 },

  pyroxen: { id: 'pyroxen', name: 'Pyroxen', element: 'fire', maxHp: 138, speed: 'medium', moves: [...CINDRIX_MOVES, 'rock_hurl', 'molten_leap'], stage: 2, family: 'cindrix', next: 'calderox', dmgMult: 1.15 },
  tsunafin: { id: 'tsunafin', name: 'Tsunafin', element: 'water', maxHp: 150, speed: 'medium', moves: [...BRINKLE_MOVES, 'frost_fin', 'tide_mirror'], stage: 2, family: 'brinkle', next: 'abyssmaw', dmgMult: 1.15 },
  thornhorn: { id: 'thornhorn', name: 'Thornhorn', element: 'grass', maxHp: 156, speed: 'slow', moves: [...VINRAM_MOVES, 'toxic_thorns', 'bramble_stampede'], stage: 2, family: 'vinram', next: 'elderoot', dmgMult: 1.15 },
  stormoth: { id: 'stormoth', name: 'Stormoth', element: 'electric', maxHp: 119, speed: 'fast', moves: [...JOLTMOTH_MOVES, 'gale_slash', 'chain_storm'], stage: 2, family: 'joltmoth', next: 'tempestra', dmgMult: 1.15 },

  boulderax: { id: 'boulderax', name: 'Boulderax', element: 'rock', element2: 'ground', maxHp: 163, speed: 'slow', moves: [...GRAVELO_MOVES, 'magma_chunk'], stage: 2, family: 'gravelo', next: 'tectonyx', dmgMult: 1.15 },
  galehawk: { id: 'galehawk', name: 'Galehawk', element: 'flying', maxHp: 113, speed: 'fast', moves: [...PIPWING_MOVES, 'shadow_talon'], stage: 2, family: 'pipwing', next: 'zephyrion', dmgMult: 1.15 },
  mystiline: { id: 'mystiline', name: 'Mystiline', element: 'psychic', maxHp: 125, speed: 'medium', moves: [...WISPURR_MOVES, 'spirit_hex'], stage: 2, family: 'wispurr', next: 'astralynx', dmgMult: 1.15 },

  calderox: { id: 'calderox', name: 'Calderox', element: 'fire', maxHp: 165, speed: 'medium', moves: [...CINDRIX_MOVES, 'rock_hurl', 'molten_leap', 'tremor_crush', 'volcanic_ruin'], stage: 3, family: 'cindrix', dmgMult: 1.3 },
  abyssmaw: { id: 'abyssmaw', name: 'Abyssmaw', element: 'water', maxHp: 180, speed: 'medium', moves: [...BRINKLE_MOVES, 'frost_fin', 'tide_mirror', 'void_bite', 'maelstrom'], stage: 3, family: 'brinkle', dmgMult: 1.3 },
  elderoot: { id: 'elderoot', name: 'Elderoot', element: 'grass', maxHp: 188, speed: 'slow', moves: [...VINRAM_MOVES, 'toxic_thorns', 'bramble_stampede', 'mind_bloom', 'ancient_bloom'], stage: 3, family: 'vinram', dmgMult: 1.3 },
  tempestra: { id: 'tempestra', name: 'Tempestra', element: 'electric', maxHp: 143, speed: 'fast', moves: [...JOLTMOTH_MOVES, 'gale_slash', 'chain_storm', 'razor_pinion', 'sky_judgement'], stage: 3, family: 'joltmoth', dmgMult: 1.3 },
  tectonyx: { id: 'tectonyx', name: 'Tectonyx', element: 'rock', element2: 'ground', maxHp: 195, speed: 'slow', moves: [...GRAVELO_MOVES, 'magma_chunk', 'glacier_drop'], stage: 3, family: 'gravelo', dmgMult: 1.3 },
  zephyrion: { id: 'zephyrion', name: 'Zephyrion', element: 'flying', maxHp: 135, speed: 'fast', moves: [...PIPWING_MOVES, 'shadow_talon', 'draco_zephyr'], stage: 3, family: 'pipwing', dmgMult: 1.3 },
  astralynx: { id: 'astralynx', name: 'Astralynx', element: 'psychic', maxHp: 150, speed: 'medium', moves: [...WISPURR_MOVES, 'spirit_hex', 'astral_blade'], stage: 3, family: 'wispurr', dmgMult: 1.3 },
};

/** Selectable (stage-1) species. */
export const SPECIES_IDS: BaseSpeciesId[] = ['cindrix', 'brinkle', 'vinram', 'joltmoth', 'gravelo', 'pipwing', 'wispurr'];
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

/**
 * Default loadout: stage 1 brings its 4 moves; an evolved form keeps the previous loadout with its newest move
 * swapped into the last slot (so a freshly learned move is always tried unless the player changes it).
 */
export function defaultLoadout(species: SpeciesId, prev?: MoveId[]): MoveId[] {
  const pool = SPECIES[species].moves;
  const base = prev && prev.length === LOADOUT_SIZE && prev.every((m) => pool.includes(m)) ? [...prev] : pool.slice(0, LOADOUT_SIZE);
  const newest = pool[pool.length - 1]!;
  if (!base.includes(newest)) base[LOADOUT_SIZE - 1] = newest;
  return base;
}

/** A valid loadout: LOADOUT_SIZE distinct moves the species knows. */
export function validLoadout(species: SpeciesId, moves: MoveId[]): boolean {
  return moves.length === LOADOUT_SIZE && new Set(moves).size === LOADOUT_SIZE && moves.every((m) => knowsMove(species, m));
}
export const sameFamily = (a: SpeciesId, b: SpeciesId) => SPECIES[a].family === SPECIES[b].family;

const dmg = { kind: 'damage' } as const;

// Timings: quick melee wind up 0.15 s (not dodgeable with the window), other attacks at least 0.6 s,
// heavies 1.4–1.9 s so a voice "dodge" (recognizer latency ≈ 0.6–1.2 s) can arm the window in time.
// `accuracy` = base hit chance in %, modified by the target's state (see hitChance in sim.ts).
export const MOVES: Record<MoveId, MoveDef> = {
  // Cindrix
  shell_ram: { id: 'shell_ram', species: 'cindrix', element: 'normal', cost: 15, power: 8, delivery: 'melee', effect: dmg, windup: 0.15, active: 0.25, recovery: 0.35, heavy: false, quick: true, accuracy: 100, name: { en: 'Shell Ram', it: 'Carica Corazzata' } },
  cinder_spit: { id: 'cinder_spit', species: 'cindrix', element: 'fire', cost: 15, power: 16, delivery: 'projectile', effect: dmg, windup: 0.6, active: 0.15, recovery: 0.45, speed: 14, heavy: false, accuracy: 90, name: { en: 'Cinder Spit', it: 'Sputo di Brace' } },
  heat_shell: { id: 'heat_shell', species: 'cindrix', element: 'fire', cost: 20, power: 0, delivery: 'self', effect: { kind: 'shield', factor: 0.5, seconds: 4 }, windup: 0.3, active: 0.2, recovery: 0.3, heavy: false, accuracy: 100, name: { en: 'Heat Shell', it: 'Guscio Rovente' } },
  magma_burst: { id: 'magma_burst', species: 'cindrix', element: 'fire', cost: 35, power: 30, delivery: 'ground', effect: dmg, windup: 1.7, active: 0.5, recovery: 0.7, hitDelay: 0.15, heavy: true, accuracy: 80, name: { en: 'Magma Burst', it: 'Esplosione di Magma' } },
  // Brinkle
  bubble_bump: { id: 'bubble_bump', species: 'brinkle', element: 'normal', cost: 15, power: 8, delivery: 'melee', effect: dmg, windup: 0.15, active: 0.25, recovery: 0.35, heavy: false, quick: true, accuracy: 100, name: { en: 'Bubble Bump', it: 'Spinta di Bolla' } },
  water_jet: { id: 'water_jet', species: 'brinkle', element: 'water', cost: 15, power: 16, delivery: 'beam', effect: dmg, windup: 0.6, active: 0.4, recovery: 0.35, hitDelay: 0.15, heavy: false, accuracy: 90, name: { en: 'Water Jet', it: "Getto d'Acqua" } },
  healing_rain: { id: 'healing_rain', species: 'brinkle', element: 'water', cost: 25, power: 0, delivery: 'self', effect: { kind: 'heal', amount: 18, seconds: 3 }, windup: 0.6, active: 0.3, recovery: 0.4, heavy: false, accuracy: 100, name: { en: 'Healing Rain', it: 'Pioggia Curativa' } },
  tidal_crash: { id: 'tidal_crash', species: 'brinkle', element: 'water', cost: 35, power: 30, delivery: 'wave', effect: dmg, windup: 1.5, active: 0.4, recovery: 0.7, speed: 9, heavy: true, accuracy: 80, name: { en: 'Tidal Crash', it: 'Schianto di Marea' } },
  // Vinram
  horn_charge: { id: 'horn_charge', species: 'vinram', element: 'normal', cost: 15, power: 9, delivery: 'melee', effect: dmg, windup: 0.15, active: 0.25, recovery: 0.4, heavy: false, quick: true, accuracy: 100, name: { en: 'Horn Charge', it: 'Carica di Corna' } },
  leaf_volley: { id: 'leaf_volley', species: 'vinram', element: 'grass', cost: 15, power: 15, delivery: 'projectile', effect: dmg, windup: 0.6, active: 0.2, recovery: 0.45, speed: 12, heavy: false, accuracy: 90, name: { en: 'Leaf Volley', it: 'Raffica di Foglie' } },
  vine_snare: { id: 'vine_snare', species: 'vinram', element: 'grass', cost: 20, power: 0, delivery: 'projectile', effect: { kind: 'root', seconds: 2 }, windup: 0.6, active: 0.2, recovery: 0.4, speed: 11, heavy: false, accuracy: 85, name: { en: 'Vine Snare', it: 'Laccio di Liane' } },
  thorn_quake: { id: 'thorn_quake', species: 'vinram', element: 'grass', cost: 35, power: 30, delivery: 'ground', effect: dmg, windup: 1.5, active: 0.5, recovery: 0.7, speed: 10, heavy: true, accuracy: 80, name: { en: 'Thorn Quake', it: 'Terremoto di Spine' } },
  // Joltmoth
  wing_flick: { id: 'wing_flick', species: 'joltmoth', element: 'normal', cost: 15, power: 8, delivery: 'melee', effect: dmg, windup: 0.15, active: 0.2, recovery: 0.3, heavy: false, quick: true, accuracy: 100, name: { en: 'Wing Flick', it: "Colpo d'Ala" } },
  spark_dart: { id: 'spark_dart', species: 'joltmoth', element: 'electric', cost: 15, power: 15, delivery: 'projectile', effect: dmg, windup: 0.6, active: 0.15, recovery: 0.4, speed: 22, heavy: false, accuracy: 90, name: { en: 'Spark Dart', it: 'Dardo Scintilla' } },
  static_field: { id: 'static_field', species: 'joltmoth', element: 'electric', cost: 20, power: 0, delivery: 'beam', effect: { kind: 'static', seconds: 5 }, windup: 0.6, active: 0.3, recovery: 0.4, hitDelay: 0.2, heavy: false, accuracy: 85, name: { en: 'Static Field', it: 'Campo Statico' } },
  thunder_lance: { id: 'thunder_lance', species: 'joltmoth', element: 'electric', cost: 35, power: 29, delivery: 'projectile', effect: dmg, windup: 1.4, active: 0.3, recovery: 0.7, speed: 45, heavy: true, accuracy: 75, name: { en: 'Thunder Lance', it: 'Lancia di Tuono' } },

  // Stage 2 moves
  molten_leap: { id: 'molten_leap', species: 'pyroxen', element: 'fire', cost: 30, power: 24, delivery: 'melee', effect: dmg, windup: 0.9, active: 0.3, recovery: 0.6, heavy: false, accuracy: 85, name: { en: 'Molten Leap', it: 'Balzo Fuso' } },
  tide_mirror: { id: 'tide_mirror', species: 'tsunafin', element: 'water', cost: 25, power: 0, delivery: 'self', effect: { kind: 'mirror', seconds: 1.5 }, windup: 0.25, active: 0.2, recovery: 0.3, heavy: false, accuracy: 100, name: { en: 'Tide Mirror', it: 'Specchio di Marea' } },
  bramble_stampede: { id: 'bramble_stampede', species: 'thornhorn', element: 'grass', cost: 30, power: 24, delivery: 'melee', effect: dmg, windup: 0.9, active: 0.3, recovery: 0.6, heavy: false, armored: true, accuracy: 90, name: { en: 'Bramble Stampede', it: 'Carica di Rovi' } },
  chain_storm: { id: 'chain_storm', species: 'stormoth', element: 'electric', cost: 30, power: 10, delivery: 'projectile', effect: dmg, windup: 0.7, active: 0.6, recovery: 0.5, speed: 26, hits: 3, hitGap: 0.25, heavy: false, accuracy: 85, name: { en: 'Chain Storm', it: 'Tempesta a Catena' } },
  // Stage 3 moves
  volcanic_ruin: { id: 'volcanic_ruin', species: 'calderox', element: 'fire', cost: 45, power: 40, delivery: 'ground', effect: dmg, windup: 1.9, active: 0.6, recovery: 0.9, hitDelay: 0.2, heavy: true, accuracy: 75, name: { en: 'Volcanic Ruin', it: 'Rovina Vulcanica' } },
  maelstrom: { id: 'maelstrom', species: 'abyssmaw', element: 'water', cost: 40, power: 26, delivery: 'wave', effect: dmg, windup: 1.6, active: 0.5, recovery: 0.8, speed: 8, alsoRoot: 1.5, heavy: true, accuracy: 80, name: { en: 'Maelstrom', it: 'Gorgo Abissale' } },
  ancient_bloom: { id: 'ancient_bloom', species: 'elderoot', element: 'grass', cost: 35, power: 0, delivery: 'self', effect: { kind: 'heal', amount: 35, seconds: 3 }, windup: 0.8, active: 0.4, recovery: 0.5, heavy: false, accuracy: 100, name: { en: 'Ancient Bloom', it: 'Fioritura Antica' } },
  sky_judgement: { id: 'sky_judgement', species: 'tempestra', element: 'electric', cost: 45, power: 38, delivery: 'beam', effect: dmg, windup: 1.8, active: 0.4, recovery: 0.9, hitDelay: 0.1, heavy: true, accuracy: 75, name: { en: 'Sky Judgement', it: 'Giudizio Celeste' } },

  // Off-type moves learned by evolving (stage 2: rock/ice/poison/flying, stage 3: ground/dark/psychic/steel)
  rock_hurl: { id: 'rock_hurl', species: 'pyroxen', element: 'rock', cost: 30, power: 22, delivery: 'projectile', effect: dmg, windup: 0.8, active: 0.2, recovery: 0.5, speed: 13, heavy: false, accuracy: 85, name: { en: 'Rock Hurl', it: 'Lancio di Roccia' } },
  frost_fin: { id: 'frost_fin', species: 'tsunafin', element: 'ice', cost: 30, power: 22, delivery: 'beam', effect: dmg, windup: 0.8, active: 0.4, recovery: 0.5, hitDelay: 0.15, heavy: false, accuracy: 85, name: { en: 'Frost Fin', it: 'Pinna Gelida' } },
  toxic_thorns: { id: 'toxic_thorns', species: 'thornhorn', element: 'poison', cost: 30, power: 22, delivery: 'projectile', effect: dmg, windup: 0.8, active: 0.2, recovery: 0.5, speed: 14, heavy: false, accuracy: 85, name: { en: 'Toxic Thorns', it: 'Spine Tossiche' } },
  gale_slash: { id: 'gale_slash', species: 'stormoth', element: 'flying', cost: 30, power: 22, delivery: 'projectile', effect: dmg, windup: 0.8, active: 0.2, recovery: 0.45, speed: 24, heavy: false, accuracy: 85, name: { en: 'Gale Slash', it: 'Fendente di Vento' } },
  tremor_crush: { id: 'tremor_crush', species: 'calderox', element: 'ground', cost: 45, power: 38, delivery: 'ground', effect: dmg, windup: 1.9, active: 0.6, recovery: 0.9, hitDelay: 0.2, heavy: true, accuracy: 75, name: { en: 'Tremor Crush', it: 'Frantuma Terra' } },
  void_bite: { id: 'void_bite', species: 'abyssmaw', element: 'dark', cost: 45, power: 38, delivery: 'melee', effect: dmg, windup: 1.2, active: 0.3, recovery: 0.8, heavy: true, accuracy: 80, name: { en: 'Void Bite', it: 'Morso del Vuoto' } },
  mind_bloom: { id: 'mind_bloom', species: 'elderoot', element: 'psychic', cost: 45, power: 37, delivery: 'beam', effect: dmg, windup: 1.8, active: 0.4, recovery: 0.9, hitDelay: 0.1, heavy: true, accuracy: 75, name: { en: 'Mind Bloom', it: 'Fiore Mentale' } },
  razor_pinion: { id: 'razor_pinion', species: 'tempestra', element: 'steel', cost: 45, power: 38, delivery: 'projectile', effect: dmg, windup: 1.6, active: 0.3, recovery: 0.8, speed: 40, heavy: true, accuracy: 75, name: { en: 'Razor Pinion', it: 'Penna Tagliente' } },

  // Gravelo line (Rock/Earth): Boulderax learns a Fire move, Tectonyx an Ice move
  pebble_bump: { id: 'pebble_bump', species: 'gravelo', element: 'normal', cost: 15, power: 9, delivery: 'melee', effect: dmg, windup: 0.15, active: 0.25, recovery: 0.4, heavy: false, quick: true, accuracy: 100, name: { en: 'Pebble Bump', it: 'Botta di Sasso' } },
  gravel_shot: { id: 'gravel_shot', species: 'gravelo', element: 'rock', cost: 15, power: 15, delivery: 'projectile', effect: dmg, windup: 0.6, active: 0.2, recovery: 0.45, speed: 14, heavy: false, accuracy: 90, name: { en: 'Gravel Shot', it: 'Colpo di Ghiaia' } },
  stone_skin: { id: 'stone_skin', species: 'gravelo', element: 'rock', cost: 20, power: 0, delivery: 'self', effect: { kind: 'shield', factor: 0.5, seconds: 4 }, windup: 0.3, active: 0.2, recovery: 0.3, heavy: false, accuracy: 100, name: { en: 'Stone Skin', it: 'Pelle di Pietra' } },
  fault_quake: { id: 'fault_quake', species: 'gravelo', element: 'ground', cost: 35, power: 30, delivery: 'ground', effect: dmg, windup: 1.5, active: 0.5, recovery: 0.7, hitDelay: 0.2, heavy: true, accuracy: 80, name: { en: 'Fault Quake', it: 'Faglia Sismica' } },
  magma_chunk: { id: 'magma_chunk', species: 'boulderax', element: 'fire', cost: 30, power: 22, delivery: 'projectile', effect: dmg, windup: 0.8, active: 0.2, recovery: 0.5, speed: 12, heavy: false, accuracy: 85, name: { en: 'Magma Chunk', it: 'Blocco di Magma' } },
  glacier_drop: { id: 'glacier_drop', species: 'tectonyx', element: 'ice', cost: 45, power: 38, delivery: 'ground', effect: dmg, windup: 1.9, active: 0.6, recovery: 0.9, hitDelay: 0.2, heavy: true, accuracy: 75, name: { en: 'Glacier Drop', it: 'Caduta Glaciale' } },
  // Pipwing line (Flying): Galehawk learns a Dark move, Zephyrion a Dragon move
  beak_peck: { id: 'beak_peck', species: 'pipwing', element: 'normal', cost: 15, power: 8, delivery: 'melee', effect: dmg, windup: 0.15, active: 0.2, recovery: 0.3, heavy: false, quick: true, accuracy: 100, name: { en: 'Beak Peck', it: 'Beccata' } },
  feather_dart: { id: 'feather_dart', species: 'pipwing', element: 'flying', cost: 15, power: 15, delivery: 'projectile', effect: dmg, windup: 0.6, active: 0.15, recovery: 0.4, speed: 20, heavy: false, accuracy: 90, name: { en: 'Feather Dart', it: 'Dardo di Piuma' } },
  dizzy_gale: { id: 'dizzy_gale', species: 'pipwing', element: 'flying', cost: 20, power: 0, delivery: 'beam', effect: { kind: 'static', seconds: 5 }, windup: 0.6, active: 0.3, recovery: 0.4, hitDelay: 0.2, heavy: false, accuracy: 85, name: { en: 'Dizzy Gale', it: 'Vento Stordente' } },
  hurricane: { id: 'hurricane', species: 'pipwing', element: 'flying', cost: 35, power: 30, delivery: 'wave', effect: dmg, windup: 1.5, active: 0.4, recovery: 0.7, speed: 10, heavy: true, accuracy: 80, name: { en: 'Hurricane', it: 'Uragano' } },
  shadow_talon: { id: 'shadow_talon', species: 'galehawk', element: 'dark', cost: 30, power: 22, delivery: 'melee', effect: dmg, windup: 0.8, active: 0.3, recovery: 0.6, heavy: false, accuracy: 85, name: { en: 'Shadow Talon', it: 'Artiglio Ombra' } },
  draco_zephyr: { id: 'draco_zephyr', species: 'zephyrion', element: 'dragon', cost: 45, power: 38, delivery: 'beam', effect: dmg, windup: 1.8, active: 0.4, recovery: 0.9, hitDelay: 0.1, heavy: true, accuracy: 75, name: { en: 'Draco Zephyr', it: 'Soffio Draconico' } },
  // Wispurr line (Psychic): Mystiline learns a Ghost move, Astralynx a Steel move
  paw_tap: { id: 'paw_tap', species: 'wispurr', element: 'normal', cost: 15, power: 8, delivery: 'melee', effect: dmg, windup: 0.15, active: 0.2, recovery: 0.3, heavy: false, quick: true, accuracy: 100, name: { en: 'Paw Tap', it: 'Zampata' } },
  psy_orb: { id: 'psy_orb', species: 'wispurr', element: 'psychic', cost: 15, power: 15, delivery: 'projectile', effect: dmg, windup: 0.6, active: 0.2, recovery: 0.4, speed: 12, heavy: false, accuracy: 90, name: { en: 'Psy Orb', it: 'Sfera Psichica' } },
  calm_mind: { id: 'calm_mind', species: 'wispurr', element: 'psychic', cost: 25, power: 0, delivery: 'self', effect: { kind: 'heal', amount: 18, seconds: 3 }, windup: 0.6, active: 0.3, recovery: 0.4, heavy: false, accuracy: 100, name: { en: 'Calm Mind', it: 'Mente Calma' } },
  mind_crush: { id: 'mind_crush', species: 'wispurr', element: 'psychic', cost: 35, power: 30, delivery: 'beam', effect: dmg, windup: 1.5, active: 0.4, recovery: 0.7, hitDelay: 0.15, heavy: true, accuracy: 80, name: { en: 'Mind Crush', it: 'Schianto Mentale' } },
  spirit_hex: { id: 'spirit_hex', species: 'mystiline', element: 'ghost', cost: 30, power: 22, delivery: 'projectile', effect: dmg, windup: 0.8, active: 0.2, recovery: 0.5, speed: 11, heavy: false, accuracy: 85, name: { en: 'Spirit Hex', it: 'Maleficio Spettrale' } },
  astral_blade: { id: 'astral_blade', species: 'astralynx', element: 'steel', cost: 45, power: 38, delivery: 'beam', effect: dmg, windup: 1.7, active: 0.4, recovery: 0.9, hitDelay: 0.1, heavy: true, accuracy: 75, name: { en: 'Astral Blade', it: 'Lama Astrale' } },
};

/** Uses per round by base stamina cost: strongest (≥35) 5, strong (30) 10, normal (20–25) 15, common (15) 20. */
export function usesForBaseCost(base: number): number {
  return base >= 35 ? 5 : base >= 30 ? 10 : base >= 20 ? 15 : 20;
}

// Costs above are base values; apply the global stamina-cost multiplier once.
for (const m of Object.values(MOVES)) {
  m.uses = usesForBaseCost(m.cost);
  m.cost = scaledCost(m.cost);
}

export const MOVE_IDS = Object.keys(MOVES) as MoveId[];

/** Attack element → defender element → multiplier (absent = 1). Super effective = ×1.25, not very effective = ×0.5. */
const SE = SUPER_EFFECTIVE;
const NV = NOT_VERY_EFFECTIVE;
const CHART: Partial<Record<Element, Partial<Record<Element, number>>>> = {
  fire: { grass: SE, ice: SE, steel: SE, fire: NV, water: NV, rock: NV, dragon: NV },
  water: { fire: SE, rock: SE, ground: SE, water: NV, grass: NV, dragon: NV },
  grass: { water: SE, rock: SE, ground: SE, grass: NV, fire: NV, poison: NV, flying: NV, dragon: NV, steel: NV },
  electric: { water: SE, flying: SE, electric: NV, grass: NV, dragon: NV, ground: NV },
  rock: { fire: SE, ice: SE, flying: SE, ground: NV, steel: NV },
  ground: { fire: SE, electric: SE, poison: SE, rock: SE, steel: SE, grass: NV, flying: NV },
  flying: { grass: SE, electric: NV, rock: NV, steel: NV },
  psychic: { poison: SE, psychic: NV, steel: NV, dark: NV },
  ghost: { psychic: SE, ghost: SE, dark: NV },
  dark: { psychic: SE, ghost: SE, dark: NV },
  dragon: { dragon: SE, steel: NV },
  poison: { grass: SE, poison: NV, ground: NV, rock: NV, ghost: NV, steel: NV },
  steel: { rock: SE, ice: SE, fire: NV, water: NV, electric: NV, steel: NV },
  ice: { grass: SE, ground: SE, flying: SE, dragon: SE, fire: NV, water: NV, ice: NV, steel: NV },
};

/** Multiplier of an attack element against one or two defender elements (dual types multiply: 0.25–1.56). */
export function typeMultiplier(attack: Element, defend: Element | readonly Element[]): number {
  const defs = typeof defend === 'string' ? [defend] : defend;
  return defs.reduce((m, d) => m * (CHART[attack]?.[d] ?? 1), 1);
}

/** The one or two elements of a species. */
export const elementsOf = (species: SpeciesId): Element[] => {
  const d = SPECIES[species];
  return d.element2 ? [d.element, d.element2] : [d.element];
};

export const secToTicks = (s: number) => Math.max(1, Math.round(s * TICK_HZ));
