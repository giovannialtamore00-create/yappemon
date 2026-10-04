// Deterministic, render-free combat simulation. Fixed 30 Hz tick.
// `step()` mutates the state in place and returns the events of that tick.

import {
  CREATURE_GAP_M, DODGE_COOLDOWN_S, DODGE_COST, DODGE_INVULN_S, DODGE_STEP_M, DRIFT_LIMIT_M, DRIFT_SPEED, DT,
  FORCED_SWITCH_S, INTERRUPT_THRESHOLD, MOVES, QUEUE_MAX, RECALL_S, SENDOUT_S, SPECIES, SPEED_MULT,
  STAB, STAMINA_MAX, STAMINA_PAUSE_S, STAMINA_REGEN_PER_S, TICK_HZ, secToTicks, typeMultiplier,
} from './data';
import { nextRandom } from './rng';
import type {
  ActionRun, CreatureState, Effectiveness, Element, FailReason, Intent, MoveDef, PlayerIdx, QAction,
  SimEvent, SimState, SpeciesId, Strike, TrainerState,
} from './types';

export function createCreature(species: SpeciesId): CreatureState {
  const def = SPECIES[species];
  return {
    species, hp: def.maxHp, maxHp: def.maxHp, stamina: STAMINA_MAX, regenPause: 0, fainted: false,
    shieldTicks: 0, staticTicks: 0, rootTicks: 0, healTicks: 0, healPerTick: 0,
  };
}

function createTrainer(team: SpeciesId[]): TrainerState {
  return {
    team: team.map(createCreature), active: 0, field: 'sending', fieldTicks: secToTicks(SENDOUT_S),
    action: null, queue: [], dodgeCooldown: 0, invulnTicks: 0, x: 0, driftDir: 1,
  };
}

export function createMatch(teams: [SpeciesId[], SpeciesId[]], seed: number): SimState {
  const s: SimState = {
    tick: 0, rng: seed >>> 0, nextId: 1, trainers: [createTrainer(teams[0]), createTrainer(teams[1])],
    strikes: [], result: null,
  };
  s.trainers[1].driftDir = -1;
  return s;
}

export const activeCreature = (t: TrainerState): CreatureState => t.team[t.active]!;
const other = (p: PlayerIdx): PlayerIdx => (p === 0 ? 1 : 0);

function rand(s: SimState): number {
  const [v, n] = nextRandom(s.rng);
  s.rng = n;
  return v;
}

/** Pure damage formula, exported for tests. `roll` is in [0, 1). */
export function computeDamage(
  power: number, moveEl: Element, attackerEl: Element, defenderEl: Element, roll: number, shielded: boolean,
): { damage: number; eff: Effectiveness } {
  const mult = moveEl === 'normal' ? 1 : typeMultiplier(moveEl, defenderEl);
  const stab = moveEl !== 'normal' && moveEl === attackerEl ? STAB : 1;
  const variance = 0.9 + 0.2 * roll;
  const raw = power * mult * stab * variance * (shielded ? 0.5 : 1);
  return { damage: Math.max(1, Math.round(raw)), eff: mult > 1 ? 'super' : mult < 1 ? 'weak' : 'neutral' };
}

export function benchSlot(t: TrainerState): number {
  return t.team.findIndex((c, i) => i !== t.active && !c.fainted);
}

function speedMult(t: TrainerState) {
  return SPEED_MULT[SPECIES[activeCreature(t).species].speed];
}

// ---------------------------------------------------------------- step

export function step(s: SimState, intents: [Intent[], Intent[]]): SimEvent[] {
  const ev: SimEvent[] = [];
  if (s.result) return ev;
  if (s.tick === 0) for (const p of [0, 1] as const) ev.push({ t: 'sendout', p, slot: 0 });

  for (const p of [0, 1] as const) for (const it of intents[p]) applyIntent(s, p, it, ev);

  for (const p of [0, 1] as const) tickTrainer(s, p, ev);
  tickStrikes(s, ev);
  checkEnd(s, ev);
  s.tick++;
  return ev;
}

// ---------------------------------------------------------------- intents

function pushActions(s: SimState, p: PlayerIdx, actions: QAction[], ev: SimEvent[]) {
  const t = s.trainers[p];
  if (actions.length === 0) return;
  if (actions[0]!.kind === 'dodge') {
    // Dodge jumps the queue: it cancels a windup/recovery so it can be used reactively.
    if (t.action && t.action.phase !== 'active' && t.action.action.kind !== 'dodge') t.action = null;
    t.queue = [...actions, ...t.queue];
  } else {
    t.queue = [...t.queue, ...actions];
  }
  if (t.queue.length > QUEUE_MAX) {
    t.queue.length = QUEUE_MAX;
    ev.push({ t: 'queue_full', p });
  }
}

function applyIntent(s: SimState, p: PlayerIdx, it: Intent, ev: SimEvent[]) {
  const t = s.trainers[p];
  switch (it.type) {
    case 'queue': {
      if (t.field === 'choosing' || t.field === 'out') return void ev.push({ t: 'invalid', p, reason: 'not_now' });
      const species = activeCreature(t).species;
      const valid = it.actions.filter((a) => a.kind !== 'move' || MOVES[a.move].species === species);
      if (valid.length < it.actions.length) ev.push({ t: 'invalid', p, reason: 'unknown_move' });
      if (valid.some((a) => a.kind === 'recall') && benchSlot(t) < 0) {
        ev.push({ t: 'invalid', p, reason: 'cannot_recall' });
        pushActions(s, p, valid.filter((a) => a.kind !== 'recall'), ev);
        return;
      }
      pushActions(s, p, valid, ev);
      return;
    }
    case 'stop':
      t.queue = [];
      ev.push({ t: 'stopped', p });
      return;
    case 'choose':
      return choose(s, p, it.slot, ev);
    case 'go': {
      const slot = t.team.findIndex((c, i) => c.species === it.species && !c.fainted && (t.field === 'choosing' || i !== t.active));
      if (t.field === 'choosing') {
        if (slot >= 0) choose(s, p, slot as 0 | 1, ev);
        else ev.push({ t: 'invalid', p, reason: 'not_now' });
        return;
      }
      if (slot >= 0 && slot !== t.active && (t.field === 'active' || t.field === 'sending')) {
        pushActions(s, p, [{ kind: 'recall' }], ev);
      } else ev.push({ t: 'invalid', p, reason: 'not_now' });
      return;
    }
  }
}

function choose(s: SimState, p: PlayerIdx, slot: number, ev: SimEvent[]) {
  const t = s.trainers[p];
  if (t.field !== 'choosing') return;
  const c = t.team[slot];
  if (!c || c.fainted) return void ev.push({ t: 'invalid', p, reason: 'not_now' });
  sendOut(s, p, slot, ev);
}

function sendOut(s: SimState, p: PlayerIdx, slot: number, ev: SimEvent[]) {
  const t = s.trainers[p];
  t.active = slot;
  t.field = 'sending';
  t.fieldTicks = secToTicks(SENDOUT_S);
  t.action = null;
  t.queue = [];
  t.x = 0;
  t.invulnTicks = 0;
  ev.push({ t: 'sendout', p, slot });
}

// ---------------------------------------------------------------- per-trainer tick

function spend(c: CreatureState, cost: number) {
  c.stamina -= cost;
  c.regenPause = secToTicks(STAMINA_PAUSE_S);
}

function fail(s: SimState, p: PlayerIdx, reason: FailReason, ev: SimEvent[]) {
  const t = s.trainers[p];
  t.action = null;
  t.queue = [];
  ev.push({ t: 'fail', p, reason });
}

function tickCreatureStatus(p: PlayerIdx, c: CreatureState, onField: boolean, ev: SimEvent[]) {
  if (c.fainted) return;
  if (c.regenPause > 0) c.regenPause--;
  else c.stamina = Math.min(STAMINA_MAX, c.stamina + (STAMINA_REGEN_PER_S * DT) * (c.staticTicks > 0 ? 0.5 : 1));
  if (!onField) return;
  const dec = (k: 'shieldTicks' | 'staticTicks' | 'rootTicks', status: 'shield' | 'static' | 'root') => {
    if (c[k] > 0 && --c[k] === 0) ev.push({ t: 'status', p, status, on: false });
  };
  dec('shieldTicks', 'shield');
  dec('staticTicks', 'static');
  dec('rootTicks', 'root');
  if (c.healTicks > 0) {
    c.hp = Math.min(c.maxHp, c.hp + c.healPerTick);
    if (--c.healTicks === 0) ev.push({ t: 'status', p, status: 'heal', on: false });
  }
}

function clearStatuses(c: CreatureState) {
  c.shieldTicks = c.staticTicks = c.rootTicks = c.healTicks = 0;
  c.healPerTick = 0;
}

function tickTrainer(s: SimState, p: PlayerIdx, ev: SimEvent[]) {
  const t = s.trainers[p];
  t.team.forEach((c, i) => tickCreatureStatus(p, c, i === t.active && t.field === 'active', ev));
  if (t.dodgeCooldown > 0) t.dodgeCooldown--;
  if (t.invulnTicks > 0) t.invulnTicks--;

  if (t.field === 'sending') {
    if (--t.fieldTicks <= 0) t.field = 'active';
    return;
  }
  if (t.field === 'choosing') {
    if (--t.fieldTicks <= 0) {
      const slot = t.team.findIndex((c) => !c.fainted);
      if (slot >= 0) sendOut(s, p, slot, ev);
    }
    return;
  }
  if (t.field !== 'active') return;

  if (!t.action) startNext(s, p, ev);
  if (t.action) advanceAction(s, p, ev);
  else drift(s, t);
}

function drift(_s: SimState, t: TrainerState) {
  const c = activeCreature(t);
  if (c.rootTicks > 0) return;
  t.x += t.driftDir * DRIFT_SPEED[SPECIES[c.species].speed] * DT;
  if (t.x > DRIFT_LIMIT_M) { t.x = DRIFT_LIMIT_M; t.driftDir = -1; }
  if (t.x < -DRIFT_LIMIT_M) { t.x = -DRIFT_LIMIT_M; t.driftDir = 1; }
}

function newRun(s: SimState, action: QAction, windupTicks: number): ActionRun {
  return { action, phase: 'windup', left: windupTicks, total: windupTicks, uid: s.nextId++ };
}

function startNext(s: SimState, p: PlayerIdx, ev: SimEvent[]) {
  const t = s.trainers[p];
  const c = activeCreature(t);
  while (!t.action && t.queue.length) {
    const a = t.queue[0]!;
    if (a.kind === 'dodge') {
      if (c.rootTicks > 0) return fail(s, p, 'rooted', ev);
      if (t.dodgeCooldown > 0) return; // wait for cooldown, keep queue
      if (c.stamina < DODGE_COST) return fail(s, p, 'stamina', ev);
      t.queue.shift();
      spend(c, DODGE_COST);
      t.action = newRun(s, a, 1);
    } else if (a.kind === 'recall') {
      t.queue.shift();
      if (benchSlot(t) < 0) return fail(s, p, 'no_bench', ev);
      t.action = newRun(s, a, secToTicks(RECALL_S));
    } else {
      t.queue.shift();
      const m = MOVES[a.move];
      if (m.species !== c.species) continue; // stale entry after a switch
      if (c.stamina < m.cost) return fail(s, p, 'stamina', ev);
      spend(c, m.cost);
      t.action = newRun(s, a, secToTicks(m.windup * speedMult(t)));
    }
    ev.push({ t: 'action_start', p, action: a });
  }
}

function advanceAction(s: SimState, p: PlayerIdx, ev: SimEvent[]) {
  const t = s.trainers[p];
  const run = t.action!;
  if (--run.left > 0) return;
  const a = run.action;
  if (run.phase === 'windup') {
    run.phase = 'active';
    run.left = run.total = activeTicks(t, a);
    onActiveStart(s, p, ev);
  } else if (run.phase === 'active') {
    run.phase = 'recovery';
    run.left = run.total = recoveryTicks(t, a);
    if (a.kind === 'recall') {
      // Recall finished: creature is in the orb, the bench creature is sent out.
      const c = activeCreature(t);
      clearStatuses(c);
      ev.push({ t: 'recall', p, slot: t.active });
      const slot = benchSlot(t);
      if (slot >= 0) sendOut(s, p, slot, ev);
      else t.action = null;
      return;
    }
    if (run.left <= 0) t.action = null;
  } else {
    t.action = null;
  }
}

function activeTicks(t: TrainerState, a: QAction) {
  if (a.kind === 'dodge') return secToTicks(DODGE_INVULN_S);
  if (a.kind === 'recall') return 1;
  return secToTicks(MOVES[a.move].active * speedMult(t));
}
function recoveryTicks(t: TrainerState, a: QAction) {
  if (a.kind === 'dodge') return secToTicks(0.2);
  if (a.kind === 'recall') return 0;
  return secToTicks(MOVES[a.move].recovery * speedMult(t));
}

function onActiveStart(s: SimState, p: PlayerIdx, ev: SimEvent[]) {
  const t = s.trainers[p];
  const a = t.action!.action;
  const c = activeCreature(t);
  if (a.kind === 'dodge') {
    const dir: 1 | -1 = t.x > 1 ? -1 : t.x < -1 ? 1 : rand(s) < 0.5 ? -1 : 1;
    t.x = Math.max(-DRIFT_LIMIT_M - 0.5, Math.min(DRIFT_LIMIT_M + 0.5, t.x + dir * DODGE_STEP_M));
    t.invulnTicks = secToTicks(DODGE_INVULN_S);
    t.dodgeCooldown = secToTicks(DODGE_COOLDOWN_S);
    ev.push({ t: 'dodge', p, dir });
    return;
  }
  if (a.kind === 'recall') return;
  const m = MOVES[a.move];
  if (m.delivery === 'self') {
    if (m.effect.kind === 'shield') {
      c.shieldTicks = secToTicks(m.effect.seconds);
      ev.push({ t: 'status', p, status: 'shield', on: true });
    } else if (m.effect.kind === 'heal') {
      c.healTicks = secToTicks(m.effect.seconds);
      c.healPerTick = m.effect.amount / c.healTicks;
      ev.push({ t: 'status', p, status: 'heal', on: true });
      ev.push({ t: 'heal', p, amount: m.effect.amount });
    }
    ev.push({ t: 'launch', p, move: m.id });
    return;
  }
  const o = other(p);
  const ot = s.trainers[o];
  if (ot.field !== 'active') {
    ev.push({ t: 'launch', p, move: m.id });
    return fail(s, p, 'target_recalled', ev);
  }
  const strike: Strike = {
    id: s.nextId++, owner: p, ownerSlot: t.active, ownerActionUid: t.action!.uid, target: o, targetSlot: ot.active,
    move: m.id, left: travelTicks(m), total: travelTicks(m), fromX: t.x, toX: ot.x,
  };
  ev.push({ t: 'launch', p, move: m.id, strike: strike.id });
  if (m.delivery === 'melee') resolveStrike(s, strike, ev);
  else s.strikes.push(strike);
}

export function travelTicks(m: MoveDef): number {
  if (m.delivery === 'melee') return 0;
  if (m.speed) return Math.max(1, Math.round((CREATURE_GAP_M / m.speed) * TICK_HZ));
  return secToTicks(m.hitDelay ?? 0.1);
}

// ---------------------------------------------------------------- strikes

function tickStrikes(s: SimState, ev: SimEvent[]) {
  const due: Strike[] = [];
  s.strikes = s.strikes.filter((k) => (--k.left <= 0 ? (due.push(k), false) : true));
  for (const k of due) resolveStrike(s, k, ev);
}

/** Fail the owner only if it is still the same creature on the field. */
function failOwner(s: SimState, k: Strike, reason: FailReason, ev: SimEvent[]) {
  const ot = s.trainers[k.owner];
  if (ot.field === 'active' && ot.active === k.ownerSlot) fail(s, k.owner, reason, ev);
}

function resolveStrike(s: SimState, k: Strike, ev: SimEvent[]) {
  const tt = s.trainers[k.target];
  const target = tt.team[k.targetSlot]!;
  if (target.fainted) return void ev.push({ t: 'fizzle', p: k.owner, move: k.move, strike: k.id });
  if (tt.field !== 'active' || tt.active !== k.targetSlot) {
    ev.push({ t: 'fizzle', p: k.owner, move: k.move, strike: k.id });
    return failOwner(s, k, 'target_recalled', ev);
  }
  const m = MOVES[k.move];
  if (tt.invulnTicks > 0) {
    ev.push({ t: 'dodged', p: k.owner, target: k.target, move: k.move, strike: k.id });
    return failOwner(s, k, 'dodged', ev);
  }
  const eff = m.effect;
  if (eff.kind === 'root') {
    target.rootTicks = secToTicks(eff.seconds);
    ev.push({ t: 'hit', p: k.owner, target: k.target, move: k.move, damage: 0, eff: 'neutral', interrupted: false, heavy: false, strike: k.id });
    ev.push({ t: 'status', p: k.target, status: 'root', on: true });
    return;
  }
  if (eff.kind === 'static') {
    target.staticTicks = secToTicks(eff.seconds);
    ev.push({ t: 'hit', p: k.owner, target: k.target, move: k.move, damage: 0, eff: 'neutral', interrupted: false, heavy: false, strike: k.id });
    ev.push({ t: 'status', p: k.target, status: 'static', on: true });
    return;
  }
  if (eff.kind !== 'damage') return;
  const attackerEl = SPECIES[s.trainers[k.owner].team[k.ownerSlot]!.species].element;
  const { damage, eff: e } = computeDamage(m.power, m.element, attackerEl, SPECIES[target.species].element, rand(s), target.shieldTicks > 0);
  target.hp = Math.max(0, target.hp - damage);
  const run = tt.action;
  const interrupted = damage >= INTERRUPT_THRESHOLD && !!run && run.phase === 'windup' && run.action.kind === 'move';
  ev.push({ t: 'hit', p: k.owner, target: k.target, move: k.move, damage, eff: e, interrupted, heavy: m.heavy, strike: k.id });
  if (target.hp <= 0) return faint(s, k.target, ev);
  if (interrupted) fail(s, k.target, 'interrupted', ev);
}

function faint(s: SimState, p: PlayerIdx, ev: SimEvent[]) {
  const t = s.trainers[p];
  const c = activeCreature(t);
  c.fainted = true;
  c.hp = 0;
  clearStatuses(c);
  t.action = null;
  t.queue = [];
  t.invulnTicks = 0;
  ev.push({ t: 'faint', p, slot: t.active });
  // The opponent's pending moves have no target any more.
  const o = s.trainers[other(p)];
  if (o.action?.action.kind === 'move') o.action = null;
  o.queue = [];
  s.strikes = s.strikes.filter((k) => k.target !== p);
  if (benchSlot(t) >= 0) {
    t.field = 'choosing';
    t.fieldTicks = secToTicks(FORCED_SWITCH_S);
    ev.push({ t: 'switch_prompt', p, seconds: FORCED_SWITCH_S });
  } else {
    t.field = 'out';
  }
}

function checkEnd(s: SimState, ev: SimEvent[]) {
  const out0 = s.trainers[0].field === 'out';
  const out1 = s.trainers[1].field === 'out';
  if (!out0 && !out1) return;
  const winner = out0 && out1 ? 'draw' : out0 ? 1 : 0;
  s.result = { winner };
  ev.push({ t: 'match_end', winner });
}
