// Practice bot: issues random valid commands every 1–3 s and sometimes dodges heavy windups.
// Pure: reads SimState, returns intents. Uses its own RNG so it never perturbs the sim's.

import { MOVES, SPECIES, TICK_HZ } from './data';
import { Rng } from './rng';
import { activeCreature, benchSlot } from './sim';
import type { Intent, PlayerIdx, SimState } from './types';

export interface BotOptions {
  /** Probability of reacting to a visible heavy windup with a dodge. */
  dodgeChance: number;
  /** Probability per decision of recalling, when possible. */
  recallChance: number;
}

export class Bot {
  private rng: Rng;
  private nextThink = 0;
  private reactedTo = -1;
  private switchAt = -1;

  constructor(public p: PlayerIdx, seed: number, public opts: BotOptions = { dodgeChance: 0.45, recallChance: 0.06 }) {
    this.rng = new Rng(seed);
  }

  think(s: SimState): Intent[] {
    if (s.result || s.intermission > 0) return [];
    const me = s.trainers[this.p];
    const foe = s.trainers[this.p === 0 ? 1 : 0];

    if (me.field === 'choosing') {
      if (this.switchAt < 0) this.switchAt = s.tick + Math.round(this.rng.range(1, 2.5) * TICK_HZ);
      if (s.tick >= this.switchAt) {
        this.switchAt = -1;
        const slot = me.team.findIndex((c) => !c.fainted);
        return slot >= 0 ? [{ type: 'choose', slot: slot as 0 | 1 }] : [];
      }
      return [];
    }
    if (me.field !== 'active') return [];
    const c = activeCreature(me);

    // React to the opponent's heavy windup.
    const fa = foe.action;
    // Decide late in the windup so the invulnerable window overlaps the hit.
    if (fa && fa.phase === 'windup' && fa.action.kind === 'move' && MOVES[fa.action.move].heavy
        && fa.left < 10 && this.reactedTo !== fa.uid) {
      this.reactedTo = fa.uid;
      if (this.rng.next() < this.opts.dodgeChance && c.stamina >= 15 && c.rootTicks === 0) {
        return [{ type: 'queue', actions: [{ kind: 'dodge' }] }];
      }
    }

    if (s.tick < this.nextThink) return [];
    this.nextThink = s.tick + Math.round(this.rng.range(1, 3) * TICK_HZ);
    if (me.queue.length >= 2) return [];

    if (benchSlot(me) >= 0 && this.rng.next() < this.opts.recallChance && c.hp < c.maxHp * 0.4) {
      return [{ type: 'queue', actions: [{ kind: 'recall' }] }];
    }
    const affordable = SPECIES[c.species].moves.filter((m) => MOVES[m].cost <= c.stamina);
    if (!affordable.length) return [];
    return [{ type: 'queue', actions: [{ kind: 'move', move: this.rng.pick(affordable) }] }];
  }
}
