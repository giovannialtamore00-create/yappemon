// A Session owns (or mirrors) the authoritative SimState and exposes it to the renderer.
// LocalSession: sim runs here, opponent is the bot. Host/Client sessions live in src/net.

import { Bot } from '../sim/bot';
import { DT } from '../sim/data';
import { createMatch, step } from '../sim/sim';
import type { Intent, PlayerIdx, SimEvent, SimState, BaseSpeciesId } from '../sim/types';

export interface SessionView {
  prev: SimState;
  curr: SimState;
  /** 0..1 interpolation factor between prev and curr. */
  alpha: number;
}

export interface Session {
  readonly me: PlayerIdx;
  /** Advance time; returns events that happened since the last call. */
  update(dt: number): SimEvent[];
  view(): SessionView | null;
  send(intents: Intent[]): void;
  dispose(): void;
}

/** Fixed-step runner shared by LocalSession and the network host. */
export class SimRunner {
  state: SimState;
  prev: SimState;
  private acc = 0;
  private pending: [Intent[], Intent[]] = [[], []];

  constructor(teams: [BaseSpeciesId[], BaseSpeciesId[]], seed: number, private bot?: Bot) {
    this.state = createMatch(teams, seed);
    this.prev = structuredClone(this.state);
  }

  queue(p: PlayerIdx, intents: Intent[]) {
    this.pending[p].push(...intents);
  }

  /** Runs as many fixed ticks as `dt` allows (capped to avoid spirals after tab sleep). */
  advance(dt: number): SimEvent[] {
    this.acc = Math.min(this.acc + dt, DT * 10);
    const events: SimEvent[] = [];
    while (this.acc >= DT) {
      this.acc -= DT;
      if (this.bot) this.pending[this.bot.p].push(...this.bot.think(this.state));
      this.prev = structuredClone(this.state);
      events.push(...step(this.state, this.pending));
      this.pending = [[], []];
    }
    return events;
  }

  get alpha() {
    return this.acc / DT;
  }
}

export class LocalSession implements Session {
  readonly me: PlayerIdx = 0;
  private runner: SimRunner;

  constructor(myTeam: BaseSpeciesId[], botTeam: BaseSpeciesId[], seed = (Math.random() * 2 ** 32) >>> 0, passiveBot = false) {
    this.runner = new SimRunner([myTeam, botTeam], seed, passiveBot ? undefined : new Bot(1, seed ^ 0x9e3779b9));
  }

  update(dt: number) {
    return this.runner.advance(dt);
  }

  view(): SessionView {
    return { prev: this.runner.prev, curr: this.runner.state, alpha: this.runner.alpha };
  }

  send(intents: Intent[]) {
    this.runner.queue(this.me, intents);
  }

  dispose() {}
}
