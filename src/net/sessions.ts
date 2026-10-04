// Network sessions. Host-authoritative: the host runs the sim (player 0) and broadcasts snapshots
// at ~20 Hz plus the events since the last snapshot; the client (player 1) sends only intents and
// renders snapshots with a small interpolation delay.

import { ALL_SPECIES_IDS, DT, MOVES, SPECIES_IDS } from '../sim/data';
import type { Intent, MoveId, PlayerIdx, QAction, SimEvent, SimState, SpeciesId, BaseSpeciesId } from '../sim/types';
import { SimRunner, type Session, type SessionView } from '../game/session';
import type { Link } from './link';

const SNAP_INTERVAL = 0.05; // 20 Hz
const INTERP_DELAY_MS = 110;

// ---------------------------------------------------------------- validation of remote input

const isSpecies = (x: unknown): x is SpeciesId => typeof x === 'string' && (ALL_SPECIES_IDS as string[]).includes(x);
const isBase = (x: unknown): x is BaseSpeciesId => typeof x === 'string' && (SPECIES_IDS as string[]).includes(x);

export function sanitizeTeam(x: unknown): BaseSpeciesId[] | null {
  if (!Array.isArray(x) || x.length !== 2 || !x.every(isBase) || x[0] === x[1]) return null;
  return x as BaseSpeciesId[];
}

function sanitizeAction(a: unknown): QAction | null {
  if (typeof a !== 'object' || a === null) return null;
  const k = (a as { kind?: unknown }).kind;
  if (k === 'dodge' || k === 'recall') return { kind: k };
  const m = (a as { move?: unknown }).move;
  if (k === 'move' && typeof m === 'string' && m in MOVES) return { kind: 'move', move: m as MoveId };
  return null;
}

/** Remote intents are untrusted: rebuild them from known-good shapes only. */
export function sanitizeIntents(list: unknown): Intent[] {
  if (!Array.isArray(list)) return [];
  const out: Intent[] = [];
  for (const it of list.slice(0, 8)) {
    if (typeof it !== 'object' || it === null) continue;
    const i = it as Record<string, unknown>;
    if (i.type === 'stop') out.push({ type: 'stop' });
    else if (i.type === 'choose' && (i.slot === 0 || i.slot === 1)) out.push({ type: 'choose', slot: i.slot });
    else if (i.type === 'go' && isSpecies(i.species)) out.push({ type: 'go', species: i.species });
    else if (i.type === 'queue' && Array.isArray(i.actions)) {
      const actions = i.actions.slice(0, 4).map(sanitizeAction).filter((a): a is QAction => a !== null);
      if (actions.length) out.push({ type: 'queue', actions });
    }
  }
  return out;
}

// ---------------------------------------------------------------- host

export class HostSession implements Session {
  readonly me: PlayerIdx = 0;
  private runner: SimRunner;
  private pendingEvents: SimEvent[] = [];
  private snapAcc = 0;

  constructor(teams: [BaseSpeciesId[], BaseSpeciesId[]], private link: Link, seed = (Math.random() * 2 ** 32) >>> 0) {
    this.runner = new SimRunner(teams, seed);
  }

  receiveIntents(list: unknown) {
    const intents = sanitizeIntents(list);
    if (intents.length) this.runner.queue(1, intents);
  }

  update(dt: number): SimEvent[] {
    const events = this.runner.advance(dt);
    this.pendingEvents.push(...events);
    this.snapAcc += dt;
    if (this.snapAcc >= SNAP_INTERVAL || events.some((e) => e.t === 'match_end')) {
      this.snapAcc = 0;
      this.link.send({ k: 'snap', state: this.runner.state, events: this.pendingEvents });
      this.pendingEvents = [];
    }
    return events;
  }

  view(): SessionView {
    return { prev: this.runner.prev, curr: this.runner.state, alpha: this.runner.alpha };
  }

  send(intents: Intent[]) {
    this.runner.queue(0, intents);
  }

  dispose() {}
}

// ---------------------------------------------------------------- client

interface Snap { state: SimState; events: SimEvent[]; delivered: boolean }

export class ClientSession implements Session {
  readonly me: PlayerIdx = 1;
  private buf: Snap[] = [];
  /** performance.now() − tick·DT for the snapshot that arrived fastest (ms). */
  private offset = Number.NaN;
  private current: SessionView | null = null;

  constructor(private link: Link) {}

  receiveSnapshot(state: SimState, events: SimEvent[]) {
    if (!state || typeof state.tick !== 'number') return;
    const last = this.buf[this.buf.length - 1];
    if (last && state.tick <= last.state.tick) return; // out of order / duplicate
    const sample = performance.now() - state.tick * DT * 1000;
    if (Number.isNaN(this.offset) || sample < this.offset) this.offset = sample;
    else this.offset += (sample - this.offset) * 0.01; // follow slow drift / sustained lag
    this.buf.push({ state, events: Array.isArray(events) ? events : [], delivered: false });
    if (this.buf.length > 40) this.buf.splice(0, this.buf.length - 40);
  }

  update(): SimEvent[] {
    if (!this.buf.length) return [];
    const renderTick = (performance.now() - this.offset - INTERP_DELAY_MS) / (DT * 1000);
    // Index of the newest snapshot at or before renderTick.
    let i = -1;
    for (let k = 0; k < this.buf.length; k++) if (this.buf[k]!.state.tick <= renderTick) i = k;
    let a: Snap;
    let b: Snap;
    let alpha: number;
    if (i < 0) { a = b = this.buf[0]!; alpha = 0; }
    else if (i >= this.buf.length - 1) { a = b = this.buf[this.buf.length - 1]!; alpha = 1; }
    else {
      a = this.buf[i]!;
      b = this.buf[i + 1]!;
      alpha = Math.min(1, Math.max(0, (renderTick - a.state.tick) / (b.state.tick - a.state.tick)));
    }
    // Deliver events of every snapshot up to the one being shown.
    const events: SimEvent[] = [];
    const upto = this.buf.indexOf(b);
    for (let k = 0; k <= upto; k++) {
      const s = this.buf[k]!;
      if (!s.delivered) { s.delivered = true; events.push(...s.events); }
    }
    // Drop snapshots that are fully in the past.
    if (i > 1) this.buf.splice(0, i - 1);
    this.current = { prev: a.state, curr: b.state, alpha };
    return events;
  }

  view(): SessionView | null {
    return this.current;
  }

  send(intents: Intent[]) {
    this.link.send({ k: 'intents', list: intents });
  }

  dispose() {}
}
