// Pure voice-command parser: transcript text → commands → sim intents.
// Robust to recognizer garbling: accents/case normalized, phonetic folding, Levenshtein similarity
// over token windows, and alias lists with distinctive keywords.

import { ALL_SPECIES_IDS, MOVES, SPECIES, knowsMove, sameFamily } from '../sim/data';
import type { Intent, MoveId, QAction, SpeciesId } from '../sim/types';
import {
  ALERT_ALIASES, CONNECTORS, DODGE_ALIASES, DODGE_DIR_WORDS, FILLERS, GO_WORDS, MOVE_ALIASES, PICK_ALIASES, RECALL_ALIASES, SPECIES_ALIASES, STOP_ALIASES,
} from './aliases';

export type Command =
  | { kind: 'move'; move: MoveId }
  /** `dir`: −1 left / +1 right when said ("dodge left", "schiva a destra"). */
  | { kind: 'dodge'; dir?: 1 | -1 }
  | { kind: 'alert' }
  | { kind: 'recall' }
  | { kind: 'stop' }
  | { kind: 'go'; species: SpeciesId; explicit: boolean }
  | { kind: 'pick'; slot: 0 | 1 };

export interface ParseContext {
  /** When set, only this creature's moves are considered (much more robust). */
  activeSpecies?: SpeciesId;
  /** When set, only these moves (the creature's chosen loadout) are considered. */
  moves?: MoveId[];
}

export interface ParseResult {
  commands: Command[];
  /** Words that did not match anything (for HUD feedback). */
  unmatched: string[];
}

// ---------------------------------------------------------------- text utils

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`´-]/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Rough phonetic folding shared by EN and IT recognizer output. */
export function fold(s: string): string {
  return s
    .replace(/ph/g, 'f')
    .replace(/h/g, '')
    .replace(/[cq]/g, 'k')
    .replace(/y/g, 'i')
    .replace(/z/g, 's')
    .replace(/w/g, 'v')
    .replace(/(.)\1+/g, '$1');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

function similarity(a: string, b: string): number {
  const ra = a.replace(/ /g, '');
  const rb = b.replace(/ /g, '');
  const raw = 1 - levenshtein(ra, rb) / Math.max(ra.length, rb.length);
  const fa = fold(ra);
  const fb = fold(rb);
  const folded = 1 - levenshtein(fa, fb) / Math.max(fa.length, fb.length, 1);
  return Math.max(raw, folded);
}

/** Minimum similarity a phrase needs. Short phrases must match (almost) exactly. */
function threshold(phrase: string): number {
  const len = phrase.replace(/ /g, '').length;
  if (len <= 4) return 1;
  if (len <= 6) return 0.8;
  return 0.74;
}

// ---------------------------------------------------------------- phrase table

interface Phrase {
  text: string;
  tokens: number;
  cmd: Command;
  /** Moves are filtered by the active species. */
  species?: SpeciesId;
}

function buildPhrases(): Phrase[] {
  const out: Phrase[] = [];
  const add = (text: string, cmd: Command, species?: SpeciesId) => {
    const n = normalize(text);
    if (n && !out.some((p) => p.text === n && JSON.stringify(p.cmd) === JSON.stringify(cmd))) {
      out.push({ text: n, tokens: n.split(' ').length, cmd, species });
    }
  };
  for (const m of Object.values(MOVES)) {
    const cmd: Command = { kind: 'move', move: m.id };
    add(m.name.en, cmd, m.species);
    add(m.name.it, cmd, m.species);
    for (const a of MOVE_ALIASES[m.id]) add(a, cmd, m.species);
  }
  for (const id of ALL_SPECIES_IDS) {
    add(SPECIES[id].name, { kind: 'go', species: id, explicit: false });
    for (const a of SPECIES_ALIASES[id]) add(a, { kind: 'go', species: id, explicit: false });
  }
  for (const a of DODGE_ALIASES) add(a, { kind: 'dodge' });
  for (const a of ALERT_ALIASES) add(a, { kind: 'alert' });
  for (const a of RECALL_ALIASES) add(a, { kind: 'recall' });
  for (const a of STOP_ALIASES) add(a, { kind: 'stop' });
  for (const slot of [0, 1] as const) for (const a of PICK_ALIASES[slot]) add(a, { kind: 'pick', slot });
  return out;
}

const PHRASES = buildPhrases();
const PHRASE_TOKENS = new Set(PHRASES.flatMap((p) => p.text.split(' ')));
const CONNECTOR_SEQS = CONNECTORS.map((c) => normalize(c).split(' ')).sort((a, b) => b.length - a.length);

// ---------------------------------------------------------------- parsing

function splitSegments(tokens: string[]): string[][] {
  const segs: string[][] = [[]];
  for (let i = 0; i < tokens.length; ) {
    const conn = CONNECTOR_SEQS.find((seq) => seq.every((w, k) => tokens[i + k] === w));
    if (conn) {
      segs.push([]);
      i += conn.length;
    } else {
      segs[segs.length - 1]!.push(tokens[i]!);
      i++;
    }
  }
  return segs.filter((s) => s.length);
}

interface Match { start: number; end: number; score: number; phrase: Phrase }

function matchSegment(seg: string[], ctx: ParseContext): { found: Match[]; leftover: string[] } {
  // Explicit "go <creature>" marker anywhere in the segment.
  const explicitGo = seg.some((w) => GO_WORDS.has(w));
  // A side word ("left", "destra") goes with a dodge in the same segment; it is not matched on its own.
  const dirWord = seg.find((w) => w in DODGE_DIR_WORDS);
  const words = seg.filter((w) => (!FILLERS.has(w) || PHRASE_TOKENS.has(w)) && !(w in DODGE_DIR_WORDS));
  const candidates: Match[] = [];
  for (const ph of PHRASES) {
    if (ph.cmd.kind === 'move' && ctx.moves && !ctx.moves.includes(ph.cmd.move)) continue;
    if (ph.cmd.kind === 'move' && ctx.activeSpecies && !knowsMove(ctx.activeSpecies, ph.cmd.move)) continue;
    const need = threshold(ph.text);
    for (let n = Math.max(1, ph.tokens - 1); n <= ph.tokens + 1; n++) {
      for (let i = 0; i + n <= words.length; i++) {
        const score = similarity(words.slice(i, i + n).join(' '), ph.text);
        if (score >= need) candidates.push({ start: i, end: i + n, score, phrase: ph });
      }
    }
  }
  // Best first: higher score, then more words covered, then longer phrase.
  candidates.sort((a, b) => b.score - a.score || (b.end - b.start) - (a.end - a.start) || b.phrase.text.length - a.phrase.text.length);
  const used = new Array<boolean>(words.length).fill(false);
  const found: Match[] = [];
  for (const c of candidates) {
    let free = true;
    for (let i = c.start; i < c.end; i++) if (used[i]) free = false;
    if (!free) continue;
    for (let i = c.start; i < c.end; i++) used[i] = true;
    const cmd = c.phrase.cmd;
    if (cmd.kind === 'go' && explicitGo) found.push({ ...c, phrase: { ...c.phrase, cmd: { ...cmd, explicit: true } } });
    else if (cmd.kind === 'dodge' && dirWord) found.push({ ...c, phrase: { ...c.phrase, cmd: { kind: 'dodge', dir: DODGE_DIR_WORDS[dirWord]! } } });
    else found.push(c);
  }
  found.sort((a, b) => a.start - b.start);
  const leftover = words.filter((w, i) => !used[i] && !FILLERS.has(w));
  if (dirWord && !found.some((m) => m.phrase.cmd.kind === 'dodge')) leftover.push(dirWord);
  return { found, leftover };
}

export function parse(text: string, ctx: ParseContext = {}): ParseResult {
  const tokens = normalize(text).split(' ').filter(Boolean);
  const commands: Command[] = [];
  const unmatched: string[] = [];
  for (const seg of splitSegments(tokens)) {
    const { found, leftover } = matchSegment(seg, ctx);
    // Pieces of one garbled name ("esplosione di magna") can match separately: merge adjacent
    // identical commands inside a segment. Repeats must be joined with a connector ("spit then spit").
    found.forEach((m, i) => {
      if (i > 0 && JSON.stringify(found[i - 1]!.phrase.cmd) === JSON.stringify(m.phrase.cmd)) return;
      commands.push(m.phrase.cmd);
    });
    unmatched.push(...leftover);
  }
  // A creature name said alongside other commands ("Cindrix, cinder spit") is just addressing it.
  const hasOther = commands.some((c) => c.kind !== 'go' && c.kind !== 'pick');
  const filtered = commands.filter((c) => !(c.kind === 'go' && !c.explicit && hasOther));
  // "come back, go Joltmoth": the go already implies the recall.
  const hasGo = filtered.some((c) => c.kind === 'go');
  return { commands: hasGo ? filtered.filter((c) => c.kind !== 'recall') : filtered, unmatched };
}

/**
 * Turn parsed commands into sim intents. Consecutive actions become one queue intent;
 * `stop` / `go` / `pick` stay in order around them.
 * `forcedSwitch`: whether a switch prompt is open (then picks/names choose a creature).
 */
export function toIntents(cmds: Command[], opts: { forcedSwitch?: boolean; activeSpecies?: SpeciesId } = {}): Intent[] {
  const out: Intent[] = [];
  let batch: QAction[] = [];
  const flush = () => {
    if (batch.length) out.push({ type: 'queue', actions: batch });
    batch = [];
  };
  for (const c of cmds) {
    switch (c.kind) {
      case 'move': batch.push({ kind: 'move', move: c.move }); break;
      case 'dodge': batch.push(c.dir ? { kind: 'dodge', dir: c.dir } : { kind: 'dodge' }); break;
      case 'alert': batch.push({ kind: 'alert' }); break;
      case 'recall': batch.push({ kind: 'recall' }); break;
      case 'stop': flush(); out.push({ type: 'stop' }); break;
      case 'go':
        if (!opts.forcedSwitch && opts.activeSpecies && sameFamily(c.species, opts.activeSpecies)) break; // already out
        flush();
        out.push({ type: 'go', species: c.species });
        break;
      case 'pick':
        if (opts.forcedSwitch) { flush(); out.push({ type: 'choose', slot: c.slot }); }
        break;
    }
  }
  flush();
  return out;
}
