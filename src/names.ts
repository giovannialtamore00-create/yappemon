// Custom names chosen before the fight: creatures (per evolution line) and the first word of moves.
// Display-only: the sim never sees them, so it stays deterministic.

import { MOVES, SPECIES, SPECIES_IDS } from './sim/data';
import type { Lang, MoveId, SpeciesId } from './sim/types';

export interface TeamNames {
  /** Evolution-line id (base species) -> new creature name. */
  creatures: Record<string, string>;
  /** Move id -> new first word of the move name (both languages). */
  moves: Record<string, string>;
}

export const NAME_MAX = 12;

const store: [TeamNames, TeamNames] = [{ creatures: {}, moves: {} }, { creatures: {}, moves: {} }];
let me: 0 | 1 = 0;
let version = 0;

/** Bumps on every change; HUD caches include it so they redraw after a rename. */
export const namesVersion = () => version;
export const setMe = (p: 0 | 1) => { me = p; version++; };
export const getNames = (p: 0 | 1): TeamNames => store[p];
export const setNames = (p: 0 | 1, n: TeamNames) => { store[p] = n; version++; };
export const clearNames = () => { store[0] = { creatures: {}, moves: {} }; store[1] = { creatures: {}, moves: {} }; version++; };

/** Letters (any language) only, trimmed, capped. Returns '' for anything unusable. */
export function cleanWord(s: string): string {
  return s.normalize('NFC').replace(/[^\p{L}]/gu, '').slice(0, NAME_MAX);
}

export function creatureName(p: 0 | 1, sp: SpeciesId): string {
  return store[p].creatures[SPECIES[sp].family] ?? SPECIES[sp].name;
}

export function moveName(p: 0 | 1, id: MoveId, lang: Lang): string {
  const base = MOVES[id].name[lang];
  const w = store[p].moves[id];
  if (!w) return base;
  const rest = base.split(' ').slice(1);
  return [w, ...rest].join(' ');
}

/** Names of the local player (menus, move choice, move cards). */
export const myCreature = (sp: SpeciesId) => creatureName(me, sp);
export const myMove = (id: MoveId, lang: Lang) => moveName(me, id, lang);

/** Keeps only valid entries for known ids, so a bad peer message can't inject junk. */
export function sanitizeNames(raw: unknown): TeamNames {
  const out: TeamNames = { creatures: {}, moves: {} };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Partial<TeamNames>;
  const used = new Set<string>();
  if (r.creatures && typeof r.creatures === 'object') {
    for (const id of SPECIES_IDS) {
      const v = (r.creatures as Record<string, unknown>)[id];
      if (typeof v !== 'string') continue;
      const w = cleanWord(v);
      if (w && !used.has(w.toLowerCase())) { out.creatures[id] = w; used.add(w.toLowerCase()); }
    }
  }
  if (r.moves && typeof r.moves === 'object') {
    for (const id of Object.keys(MOVES)) {
      const v = (r.moves as Record<string, unknown>)[id];
      if (typeof v !== 'string') continue;
      const w = cleanWord(v);
      if (w) out.moves[id] = w;
    }
  }
  return out;
}
