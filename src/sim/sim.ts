// Deterministic, render-free combat simulation. Fixed 30 Hz tick.
// `step()` mutates the state in place and returns the events of that tick.

import {
  ALERT_COST, ALERT_EVADE, ALERT_S, ALERT_STRAFE_MULT, ARENA_X_M, ATTACKING_EXPOSED, DASH_M, DASH_S, DODGE_COOLDOWN_S,
  DODGE_COST, DODGE_INVULN_S, DODGE_WINDOW_S, DT, FORCED_SWITCH_S, HALF_FAR_M, HALF_NEAR_M, HOME_Z_M, INTERRUPT_THRESHOLD,
  MOVES, PREFERRED_GAP_M, SNAP_SPEED, HYPE_STAMINA, FULL_POWER_MULT, FULL_POWER_COOLDOWN_S, NAME_ACC_BONUS, COMBO_ACC_MULT, COMBO_WINDUP_MULT, CHEERS, CHEER_GAP_S, CHEER_REPEAT_S, CHEER_REPEAT_FAIL, TEMP_HP_S, TEMP_HP_MAX, QUEUE_MAX, QUICK_WINDUP_S, RECALL_S, SENDOUT_S, SPECIES, SPEED_MULT, STAB, STAMINA_MAX,
  STAMINA_PAUSE_S, STAMINA_REGEN_PER_S, STEP_JITTER_M, STEP_SPEED, STRAFE_MAX_S, STRAFE_MIN_S, STRAFE_SPEED, TICK_HZ, INTERMISSION_S,
  LOADOUT_S, MAX_ROUNDS, ROUNDS_TO_WIN, defaultLoadout, elementsOf, sameFamily, secToTicks, speciesAtStage, typeMultiplier, validLoadout,
} from './data';
import { nextRandom } from './rng';
import type {
  ActionRun, BaseSpeciesId, CheerId, CreatureState, Effectiveness, Element, FailReason, Intent, MoveDef, MoveId, PlayerIdx, QAction,
  SimEvent, SimState, SpeciesId, Strike, TrainerState,
} from './types';

export function createCreature(species: SpeciesId, moves = defaultLoadout(species)): CreatureState {
  const def = SPECIES[species];
  return {
    species, hp: def.maxHp, maxHp: def.maxHp, stamina: STAMINA_MAX, regenPause: 0, fainted: false,
    shieldTicks: 0, staticTicks: 0, rootTicks: 0, healTicks: 0, healPerTick: 0, mirrorTicks: 0, moves, used: {}, tempHp: 0, tempTicks: 0,
  };
}

/** Player 0 lives on the z > 0 half of the arena, player 1 on z < 0. */
const side = (p: PlayerIdx) => (p === 0 ? 1 : -1);

function createTrainer(p: PlayerIdx, team: SpeciesId[], loadouts: MoveId[][] = []): TrainerState {
  return {
    team: team.map((sp, i) => createCreature(sp, defaultLoadout(sp, loadouts[i]))), active: 0, field: 'sending', fieldTicks: secToTicks(SENDOUT_S),
    action: null, queue: [], dodgeCooldown: 0, invulnTicks: 0,
    x: 0, z: side(p) * HOME_Z_M, driftDir: p === 0 ? 1 : -1, strafeTicks: secToTicks(1.2), stepZ: HOME_Z_M,
    chain: 0, manual: false, steerX: 0, steerZ: 0, dodgeReady: 0, dodgeDir: 0, dashTicks: 0, dashDir: 1, alertTicks: 0, cheerTick: -1e9, cheerAt: {},
  };
}

/** Fresh trainers for a round: every creature at the evolution stage matching the round. */
function setupRound(s: SimState) {
  const stage = Math.min(3, s.round);
  s.trainers = [
    createTrainer(0, s.teams[0].map((b) => speciesAtStage(b, stage)), s.loadouts[0]),
    createTrainer(1, s.teams[1].map((b) => speciesAtStage(b, stage)), s.loadouts[1]),
  ];
  s.loadouts = [s.trainers[0].team.map((c) => [...c.moves]), s.trainers[1].team.map((c) => [...c.moves])];
  s.strikes = [];
  s.loadout = s.loadoutLen;
  s.ready = [false, false];
}

/**
 * `teams` are stage-1 species; round 1 uses them, round 2 their first evolution, round 3 the last.
 * `loadoutS`: length of the move-choice phase before each round (0 = skip it and fight with default loadouts).
 */
export function createMatch(teams: [BaseSpeciesId[], BaseSpeciesId[]], seed: number, opts: { loadoutS?: number } = {}): SimState {
  const loadoutLen = (opts.loadoutS ?? LOADOUT_S) > 0 ? secToTicks(opts.loadoutS ?? LOADOUT_S) : 0;
  const s: SimState = {
    tick: 0, rng: seed >>> 0, nextId: 1, trainers: [createTrainer(0, []), createTrainer(1, [])],
    strikes: [], teams: [[...teams[0]], [...teams[1]]], round: 1, score: [0, 0], intermission: 0, result: null,
    loadout: 0, loadoutLen, ready: [false, false], loadouts: [[], []], fullPowerCd: [0, 0],
  };
  setupRound(s);
  return s;
}

export const activeCreature = (t: TrainerState): CreatureState => t.team[t.active]!;
/** Starts of `move` this creature has left this round. */
export const usesLeft = (c: CreatureState, move: MoveId): number => (MOVES[move].uses ?? Infinity) - (c.used[move] ?? 0);
const other = (p: PlayerIdx): PlayerIdx => (p === 0 ? 1 : 0);

function rand(s: SimState): number {
  const [v, n] = nextRandom(s.rng);
  s.rng = n;
  return v;
}

/** Pure damage formula, exported for tests. `roll` is in [0, 1). */
export function computeDamage(
  power: number, moveEl: Element, attackerEl: Element | readonly Element[], defenderEl: Element | readonly Element[], roll: number, shielded: boolean, stageMult = 1,
): { damage: number; eff: Effectiveness } {
  const mult = moveEl === 'normal' ? 1 : typeMultiplier(moveEl, defenderEl);
  const attackerEls = typeof attackerEl === 'string' ? [attackerEl] : attackerEl;
  const stab = moveEl !== 'normal' && attackerEls.includes(moveEl) ? STAB : 1;
  const variance = 0.9 + 0.2 * roll;
  const raw = power * stageMult * mult * stab * variance * (shielded ? 0.5 : 1);
  return { damage: Math.max(1, Math.round(raw)), eff: mult > 1 ? 'super' : mult < 1 ? 'weak' : 'neutral' };
}

export function benchSlot(t: TrainerState): number {
  return t.team.findIndex((c, i) => i !== t.active && !c.fainted);
}

function speedMult(t: TrainerState) {
  return SPEED_MULT[SPECIES[activeCreature(t).species].speed];
}

/**
 * Chance (0–1) that `move` hits a creature in state `target`: accuracy × state modifier
 * (busy with a move ×1.2, alert ×0.7, otherwise ×1). Dodges are handled separately.
 * `named`: +NAME_ACC_BONUS to the base accuracy (capped at 100) before the modifiers.
 */
export function hitChance(move: MoveDef, target: TrainerState, full = false, named = false, combo = false): number {
  const mod = target.action?.action.kind === 'move' ? ATTACKING_EXPOSED : target.alertTicks > 0 ? ALERT_EVADE : 1;
  const acc = named ? Math.min(100, move.accuracy + NAME_ACC_BONUS) : move.accuracy;
  return Math.min(1, (acc / 100) * mod * (full ? FULL_POWER_MULT : 1) * (combo ? COMBO_ACC_MULT : 1));
}

export const distance = (a: TrainerState, b: TrainerState) => Math.hypot(a.x - b.x, a.z - b.z);

// ---------------------------------------------------------------- step

export function step(s: SimState, intents: [Intent[], Intent[]]): SimEvent[] {
  const ev: SimEvent[] = [];
  if (s.result) return ev;
  for (const p of [0, 1] as const) if (s.fullPowerCd[p] > 0) s.fullPowerCd[p]--;
  if (s.tick === 0) {
    if (s.loadout > 0) ev.push({ t: 'loadout_start', round: s.round, seconds: s.loadout / TICK_HZ });
    else for (const p of [0, 1] as const) ev.push({ t: 'sendout', p, slot: 0 });
  }
  if (s.intermission > 0) {
    // Between rounds: nothing moves; when the break ends, everyone comes back evolved.
    if (--s.intermission === 0) {
      setupRound(s);
      if (s.loadout > 0) ev.push({ t: 'loadout_start', round: s.round, seconds: s.loadout / TICK_HZ });
      else beginRound(s, ev);
    }
    s.tick++;
    return ev;
  }
  if (s.loadout > 0) {
    // Choosing moves: only loadout / ready intents count; the round starts when time is up or both are ready.
    for (const p of [0, 1] as const) for (const it of intents[p]) applyLoadoutIntent(s, p, it, ev);
    if (--s.loadout === 0 || (s.ready[0] && s.ready[1])) {
      s.loadout = 0;
      ev.push({ t: 'loadout_end', round: s.round });
      beginRound(s, ev);
    }
    s.tick++;
    return ev;
  }

  for (const p of [0, 1] as const) for (const it of intents[p]) applyIntent(s, p, it, ev);

  for (const p of [0, 1] as const) tickTrainer(s, p, ev);
  tickStrikes(s, ev);
  checkEnd(s, ev);
  s.tick++;
  return ev;
}

/** Creatures are thrown out (round 2+ also announces the round). */
function beginRound(s: SimState, ev: SimEvent[]) {
  if (s.round > 1) ev.push({ t: 'round_start', round: s.round });
  for (const p of [0, 1] as const) ev.push({ t: 'sendout', p, slot: 0 });
}

function applyLoadoutIntent(s: SimState, p: PlayerIdx, it: Intent, ev: SimEvent[]) {
  if (s.ready[p]) return;
  if (it.type === 'ready') {
    s.ready[p] = true;
    ev.push({ t: 'ready', p });
  } else if (it.type === 'loadout') {
    const c = s.trainers[p].team[it.slot];
    if (!c || !validLoadout(c.species, it.moves)) return void ev.push({ t: 'invalid', p, reason: 'not_now' });
    c.moves = [...it.moves];
    s.loadouts[p][it.slot] = [...it.moves];
  }
}

// ---------------------------------------------------------------- intents

function pushActions(s: SimState, p: PlayerIdx, actions: QAction[], ev: SimEvent[]) {
  const t = s.trainers[p];
  // A command that starts with "dodge" arms the window right away, even mid-move; the rest is queued.
  let i = 0;
  while (i < actions.length && t.field === 'active') {
    const a = actions[i]!;
    if (a.kind !== 'dodge') break;
    if (!armDodge(s, p, a, ev)) return;
    i++;
  }
  if (i === actions.length) return;
  t.queue = [...t.queue, ...actions.slice(i)];
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
      const known = activeCreature(t).moves;
      const valid = it.actions.filter((a) => a.kind !== 'move' || known.includes(a.move));
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
    case 'steer':
      t.manual = true;
      t.steerX = it.x;
      t.steerZ = it.z;
      return;
    case 'choose':
      return choose(s, p, it.slot, ev);
    case 'cheer':
      return cheer(s, p, it.word, ev);
    case 'loadout':
    case 'ready':
      return; // only during the loadout phase
    case 'go': {
      const slot = t.team.findIndex((c, i) => sameFamily(c.species, it.species) && !c.fainted && (t.field === 'choosing' || i !== t.active));
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

/**
 * Encouragement: only for a creature on the field, at least CHEER_GAP_S after the previous one (else ignored).
 * The same word within CHEER_REPEAT_S has a CHEER_REPEAT_FAIL chance of doing nothing (it still counts as said).
 */
function cheer(s: SimState, p: PlayerIdx, word: CheerId, ev: SimEvent[]) {
  const t = s.trainers[p];
  const c = activeCreature(t);
  if (t.field !== 'active' || c.fainted || s.tick - t.cheerTick < secToTicks(CHEER_GAP_S)) return;
  const repeat = s.tick - (t.cheerAt[word] ?? -1e9) < secToTicks(CHEER_REPEAT_S);
  t.cheerTick = t.cheerAt[word] = s.tick;
  if (repeat && rand(s) < CHEER_REPEAT_FAIL) return;
  const d = CHEERS[word];
  if (d.stamina) c.stamina = Math.min(STAMINA_MAX, c.stamina + d.stamina * STAMINA_MAX);
  if (d.tempHp) {
    c.tempHp = Math.min(TEMP_HP_MAX * c.maxHp, c.tempHp + d.tempHp * c.maxHp);
    c.tempTicks = secToTicks(TEMP_HP_S);
  }
  if (d.heal) {
    const amount = Math.min(c.maxHp - c.hp, d.heal * c.maxHp);
    c.hp += amount;
    if (amount > 0) ev.push({ t: 'heal', p, amount });
  }
  ev.push({ t: 'cheer', p, word });
}

/** Damage minus what temporary HP soaks up. */
function afterTempHp(c: CreatureState, damage: number): number {
  const soak = Math.min(c.tempHp, damage);
  c.tempHp -= soak;
  return damage - soak;
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
  resetStance(s, p, ev);
  t.x = 0;
  t.z = side(p) * HOME_Z_M;
  t.stepZ = HOME_Z_M;
  ev.push({ t: 'sendout', p, slot });
}

/** Clears the dodge window, dash and alert (new creature on the field, or fainted). */
function resetStance(s: SimState, p: PlayerIdx, ev: SimEvent[]) {
  const t = s.trainers[p];
  if (t.dodgeReady > 0) ev.push({ t: 'dodge_ready', p, on: false });
  if (t.alertTicks > 0) ev.push({ t: 'alert', p, on: false });
  t.dodgeReady = t.dashTicks = t.alertTicks = t.invulnTicks = 0;
  t.dodgeDir = 0;
}

/** Spends the dodge cost and arms the window. Returns false (after failing) when it can't. */
function armDodge(s: SimState, p: PlayerIdx, a: Extract<QAction, { kind: 'dodge' }>, ev: SimEvent[]): boolean {
  const t = s.trainers[p];
  const c = activeCreature(t);
  if (c.rootTicks > 0) return fail(s, p, 'rooted', ev), false;
  if (c.stamina < DODGE_COST) return fail(s, p, 'stamina', ev), false;
  spend(c, DODGE_COST);
  if (t.dodgeReady === 0) ev.push({ t: 'dodge_ready', p, on: true });
  t.dodgeReady = secToTicks(DODGE_WINDOW_S);
  t.dodgeDir = a.dir ?? 0;
  return true;
}

/** The armed window catches an attack: dash sideways, invulnerable for a moment. */
function dash(s: SimState, p: PlayerIdx, ev: SimEvent[]) {
  const t = s.trainers[p];
  // The requested side is from the creature's point of view; player 1 faces +z, so its left is world +x.
  let dir: 1 | -1;
  if (t.dodgeDir !== 0) dir = (p === 0 ? t.dodgeDir : -t.dodgeDir) as 1 | -1;
  else dir = t.x > 1 ? -1 : t.x < -1 ? 1 : rand(s) < 0.5 ? -1 : 1;
  t.dodgeReady = 0;
  t.dodgeDir = 0;
  ev.push({ t: 'dodge_ready', p, on: false });
  // A windup (or recovery) in progress is lost, stamina included; alert keeps going.
  if (t.action?.action.kind === 'move') t.action = null;
  t.dashTicks = secToTicks(DASH_S);
  t.dashDir = dir;
  t.invulnTicks = secToTicks(DODGE_INVULN_S);
  t.dodgeCooldown = secToTicks(DODGE_COOLDOWN_S);
  ev.push({ t: 'dodge', p, dir });
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

/** `p` took a hit: whatever it had queued is lost (the current action keeps going). */
function breakCombo(s: SimState, p: PlayerIdx, ev: SimEvent[]) {
  const t = s.trainers[p];
  if (!t.queue.length) return;
  ev.push({ t: 'combo_broken', p, lost: t.queue.length });
  t.queue = [];
}

function tickCreatureStatus(p: PlayerIdx, c: CreatureState, onField: boolean, ev: SimEvent[]) {
  if (c.fainted) return;
  if (c.regenPause > 0) c.regenPause--;
  else c.stamina = Math.min(STAMINA_MAX, c.stamina + (STAMINA_REGEN_PER_S * DT) * (c.staticTicks > 0 ? 0.5 : 1));
  if (!onField) return;
  const dec = (k: 'shieldTicks' | 'staticTicks' | 'rootTicks' | 'mirrorTicks', status: 'shield' | 'static' | 'root' | 'mirror') => {
    if (c[k] > 0 && --c[k] === 0) ev.push({ t: 'status', p, status, on: false });
  };
  dec('shieldTicks', 'shield');
  dec('staticTicks', 'static');
  dec('rootTicks', 'root');
  dec('mirrorTicks', 'mirror');
  if (c.tempTicks > 0 && --c.tempTicks === 0) c.tempHp = 0;
  if (c.healTicks > 0) {
    c.hp = Math.min(c.maxHp, c.hp + c.healPerTick);
    if (--c.healTicks === 0) ev.push({ t: 'status', p, status: 'heal', on: false });
  }
}

function clearStatuses(c: CreatureState) {
  c.shieldTicks = c.staticTicks = c.rootTicks = c.healTicks = c.mirrorTicks = 0;
  c.healPerTick = 0;
  c.tempHp = c.tempTicks = 0;
}

function tickTrainer(s: SimState, p: PlayerIdx, ev: SimEvent[]) {
  const t = s.trainers[p];
  t.team.forEach((c, i) => tickCreatureStatus(p, c, i === t.active && t.field === 'active', ev));
  if (t.dodgeCooldown > 0) t.dodgeCooldown--;
  if (t.invulnTicks > 0) t.invulnTicks--;
  if (t.dodgeReady > 0 && --t.dodgeReady === 0) {
    t.dodgeDir = 0;
    ev.push({ t: 'dodge_ready', p, on: false });
  }
  if (t.alertTicks > 0 && --t.alertTicks === 0) ev.push({ t: 'alert', p, on: false });

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
  if (!t.action) t.chain = 0;
  if (t.action) advanceAction(s, p, ev);
  if (t.field === 'active') move(s, p);
}

const clampX = (x: number) => Math.max(-ARENA_X_M, Math.min(ARENA_X_M, x));

/**
 * Movement: a dash in progress slides sideways; otherwise a free (or alert) creature strafes along x and
 * steps in/out to keep its preferred distance, always on its own half. Busy or rooted creatures stand still.
 */
function move(s: SimState, p: PlayerIdx) {
  const t = s.trainers[p];
  const c = activeCreature(t);
  if (t.dashTicks > 0) {
    t.dashTicks--;
    t.x = clampX(t.x + (t.dashDir * DASH_M) / secToTicks(DASH_S));
    return;
  }
  if (c.rootTicks > 0) return;
  if (t.action && t.action.action.kind !== 'alert') return;
  if (t.manual) {
    // Creature-relative: player 1 faces +z, so its right is world −x. Toward the opponent = smaller |z|.
    t.x = clampX(t.x + (p === 0 ? t.steerX : -t.steerX) * STRAFE_SPEED[SPECIES[c.species].speed] * (t.alertTicks > 0 ? ALERT_STRAFE_MULT : 1) * DT);
    const absZ = Math.abs(t.z) - t.steerZ * STEP_SPEED * DT;
    t.z = side(p) * Math.max(HALF_NEAR_M, Math.min(HALF_FAR_M, absZ));
    return;
  }
  const def = SPECIES[c.species];
  if (--t.strafeTicks <= 0) {
    t.driftDir = t.driftDir === 1 ? -1 : 1;
    t.strafeTicks = secToTicks(STRAFE_MIN_S + (STRAFE_MAX_S - STRAFE_MIN_S) * rand(s));
    // Each creature keeps half its preferred gap from the centre line (stable whatever the opponent does),
    // stepping a little in or out each leg.
    t.stepZ = PREFERRED_GAP_M[def.family] / 2 + (rand(s) * 2 - 1) * STEP_JITTER_M;
  }
  t.x += t.driftDir * STRAFE_SPEED[def.speed] * (t.alertTicks > 0 ? ALERT_STRAFE_MULT : 1) * DT;
  if (t.x >= ARENA_X_M) { t.x = ARENA_X_M; t.driftDir = -1; }
  if (t.x <= -ARENA_X_M) { t.x = -ARENA_X_M; t.driftDir = 1; }
  // Step in/out (along z) toward the chosen distance from the centre line.
  const wantAbsZ = Math.max(HALF_NEAR_M, Math.min(HALF_FAR_M, t.stepZ));
  const dz = side(p) * wantAbsZ - t.z;
  const maxStep = STEP_SPEED * DT;
  t.z += Math.max(-maxStep, Math.min(maxStep, dz));
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
      // Instant: arms the window and moves on to the next command.
      t.queue.shift();
      if (!armDodge(s, p, a, ev)) return;
      continue;
    } else if (a.kind === 'alert') {
      t.queue.shift();
      if (c.stamina < ALERT_COST) return fail(s, p, 'stamina', ev);
      spend(c, ALERT_COST);
      // Occupies the action slot for the whole stance (queued attacks wait); can't be interrupted.
      t.action = { action: a, phase: 'active', left: secToTicks(ALERT_S), total: secToTicks(ALERT_S), uid: s.nextId++ };
      t.alertTicks = secToTicks(ALERT_S);
      ev.push({ t: 'alert', p, on: true });
    } else if (a.kind === 'recall') {
      t.queue.shift();
      if (benchSlot(t) < 0) return fail(s, p, 'no_bench', ev);
      t.action = newRun(s, a, secToTicks(RECALL_S));
    } else {
      t.queue.shift();
      const m = MOVES[a.move];
      if (!c.moves.includes(m.id)) continue; // stale entry after a switch
      if (usesLeft(c, m.id) <= 0) return fail(s, p, 'no_uses', ev);
      if (c.stamina < m.cost) return fail(s, p, 'stamina', ev);
      spend(c, m.cost);
      c.used[m.id] = (c.used[m.id] ?? 0) + 1;
      const first = boostedAction(s, p, a);
      const second = t.chain === 1;
      t.chain++;
      const run = second ? { ...first, combo: true as const } : first;
      const windup = (m.quick ? QUICK_WINDUP_S : m.windup * speedMult(t)) / (run.boost === 'snap' ? SNAP_SPEED : 1) * (second ? COMBO_WINDUP_MULT : 1);
      t.action = newRun(s, run, secToTicks(windup));
      ev.push({ t: 'action_start', p, action: run });
      if (run.boost === 'hype') c.stamina = Math.min(STAMINA_MAX, c.stamina + HYPE_STAMINA * STAMINA_MAX);
      if (run.boost === 'full') s.fullPowerCd[p] = secToTicks(FULL_POWER_COOLDOWN_S);
      if (run.boost) ev.push({ t: 'boost', p, boost: run.boost });
      continue;
    }
    ev.push({ t: 'action_start', p, action: a });
  }
}

/** Drops a boost that can't apply: FULL POWER while cooling down or on a self move (no cooldown spent). */
function boostedAction(s: SimState, p: PlayerIdx, a: Extract<QAction, { kind: 'move' }>): Extract<QAction, { kind: 'move' }> {
  if (a.boost !== 'full' || (s.fullPowerCd[p] === 0 && MOVES[a.move].delivery !== 'self')) return a;
  return a.named ? { kind: 'move', move: a.move, named: true } : { kind: 'move', move: a.move };
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
  if (a.kind !== 'move') return 1;
  return secToTicks(MOVES[a.move].active * speedMult(t));
}
function recoveryTicks(t: TrainerState, a: QAction) {
  if (a.kind !== 'move') return 0;
  return secToTicks(MOVES[a.move].recovery * speedMult(t));
}

function onActiveStart(s: SimState, p: PlayerIdx, ev: SimEvent[]) {
  const t = s.trainers[p];
  const a = t.action!.action;
  const c = activeCreature(t);
  if (a.kind !== 'move') return;
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
    } else if (m.effect.kind === 'mirror') {
      c.mirrorTicks = secToTicks(m.effect.seconds);
      ev.push({ t: 'status', p, status: 'mirror', on: true });
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
  const hits = m.hits ?? 1;
  const travel = travelTicks(m, distance(t, ot));
  for (let i = 0; i < hits; i++) {
    const delay = i * secToTicks(m.hitGap ?? 0.25);
    const strike: Strike = {
      id: s.nextId++, owner: p, ownerSlot: t.active, ownerActionUid: t.action!.uid, target: o, targetSlot: ot.active,
      move: m.id, left: travel + delay, total: travel, fromX: t.x, fromZ: t.z, toX: ot.x, toZ: ot.z,
    };
    if (a.boost === 'full') strike.full = true;
    if (a.named) strike.named = true;
    if (a.combo) strike.combo = true;
    ev.push({ t: 'launch', p, move: m.id, strike: strike.id });
    if (m.delivery === 'melee') resolveStrike(s, strike, ev);
    else s.strikes.push(strike);
  }
}

/** Ticks from launch to impact over `dist` metres. */
export function travelTicks(m: MoveDef, dist: number): number {
  if (m.delivery === 'melee') return 0;
  if (m.speed) return Math.max(1, Math.round((dist / m.speed) * TICK_HZ));
  return secToTicks(m.hitDelay ?? 0.1);
}

// ---------------------------------------------------------------- strikes

function tickStrikes(s: SimState, ev: SimEvent[]) {
  const due: Strike[] = [];
  s.strikes = s.strikes.filter((k) => (--k.left <= 0 ? (due.push(k), false) : true));
  for (const k of due) resolveStrike(s, k, ev);
}

/** The owner's creature is still the one on the field (it wasn't recalled or knocked out meanwhile). */
const ownerOnField = (s: SimState, k: Strike) => {
  const ot = s.trainers[k.owner];
  return ot.field === 'active' && ot.active === k.ownerSlot;
};

/** Fail the owner only if it is still the same creature on the field. */
function failOwner(s: SimState, k: Strike, reason: FailReason, ev: SimEvent[]) {
  if (k.quiet) return;
  // Later strikes of the same multi-hit action don't fail it again.
  for (const o of s.strikes) if (o.ownerActionUid === k.ownerActionUid) o.quiet = true;
  if (ownerOnField(s, k)) fail(s, k.owner, reason, ev);
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
  // Missing never costs the attacker its queue: mid-dash, caught by the dodge window, or a failed accuracy roll.
  if (tt.invulnTicks > 0) return void ev.push({ t: 'dodged', p: k.owner, target: k.target, move: k.move, strike: k.id });
  const run = tt.action;
  if (tt.dodgeReady > 0 && !m.quick && target.rootTicks === 0 && tt.dodgeCooldown === 0
      && run?.action.kind !== 'recall' && !(run?.action.kind === 'move' && run.phase === 'active')) {
    dash(s, k.target, ev);
    return void ev.push({ t: 'dodged', p: k.owner, target: k.target, move: k.move, strike: k.id });
  }
  if (rand(s) >= hitChance(m, tt, k.full, k.named, k.combo)) return void ev.push({ t: 'miss', p: k.owner, target: k.target, move: k.move, strike: k.id });

  const eff = m.effect;
  if (eff.kind === 'root' || eff.kind === 'static') {
    if (eff.kind === 'root') target.rootTicks = secToTicks(eff.seconds);
    else target.staticTicks = secToTicks(eff.seconds);
    ev.push({ t: 'hit', p: k.owner, target: k.target, move: k.move, damage: 0, eff: 'neutral', interrupted: false, heavy: false, strike: k.id });
    ev.push({ t: 'status', p: k.target, status: eff.kind, on: true });
    return breakCombo(s, k.target, ev);
  }
  if (eff.kind !== 'damage') return;
  const attacker = s.trainers[k.owner].team[k.ownerSlot]!;
  const attackerDef = SPECIES[attacker.species];
  const power = m.power * (k.full ? FULL_POWER_MULT : 1);
  if (target.mirrorTicks > 0) {
    // Tide Mirror: the hit bounces back at the attacker (computed against the attacker's own type).
    target.mirrorTicks = 0;
    ev.push({ t: 'status', p: k.target, status: 'mirror', on: false });
    const back = computeDamage(power, m.element, elementsOf(attacker.species), elementsOf(attacker.species), rand(s), attacker.shieldTicks > 0, attackerDef.dmgMult);
    ev.push({ t: 'reflect', p: k.target, target: k.owner, move: k.move, damage: back.damage });
    // The reflected hit counts as the attacker getting hit: its queued commands are lost.
    if (ownerOnField(s, k) && !attacker.fainted) {
      attacker.hp = Math.max(0, attacker.hp - afterTempHp(attacker, back.damage));
      if (attacker.hp <= 0) faint(s, k.owner, ev);
      else breakCombo(s, k.owner, ev);
    }
    return;
  }
  const { damage, eff: e } = computeDamage(power, m.element, elementsOf(attacker.species), elementsOf(target.species), rand(s), target.shieldTicks > 0, attackerDef.dmgMult);
  target.hp = Math.max(0, target.hp - afterTempHp(target, damage));
  const interrupted = damage >= INTERRUPT_THRESHOLD && !!run && run.phase === 'windup' && run.action.kind === 'move' && !MOVES[run.action.move].armored;
  ev.push({ t: 'hit', p: k.owner, target: k.target, move: k.move, damage, eff: e, interrupted, heavy: m.heavy, strike: k.id });
  if (target.hp <= 0) return faint(s, k.target, ev);
  if (m.alsoRoot) {
    target.rootTicks = secToTicks(m.alsoRoot);
    ev.push({ t: 'status', p: k.target, status: 'root', on: true });
  }
  breakCombo(s, k.target, ev);
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
  resetStance(s, p, ev);
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

/** A round ends when one trainer has no creatures left; the match is best of 3 (see ROUNDS_TO_WIN). */
function checkEnd(s: SimState, ev: SimEvent[]) {
  const out0 = s.trainers[0].field === 'out';
  const out1 = s.trainers[1].field === 'out';
  if (!out0 && !out1) return;
  const winner = out0 && out1 ? 'draw' : out0 ? 1 : 0;
  if (winner !== 'draw') s.score[winner]++;
  const decided = s.score[0] >= ROUNDS_TO_WIN || s.score[1] >= ROUNDS_TO_WIN || s.round >= MAX_ROUNDS;
  ev.push({ t: 'round_end', round: s.round, winner, score: [s.score[0], s.score[1]], next: decided ? null : s.round + 1 });
  s.strikes = [];
  for (const t of s.trainers) { t.action = null; t.queue = []; }
  if (decided) {
    const w = s.score[0] === s.score[1] ? 'draw' : s.score[0] > s.score[1] ? 0 : 1;
    s.result = { winner: w };
    ev.push({ t: 'match_end', winner: w });
    return;
  }
  s.round++;
  s.intermission = secToTicks(INTERMISSION_S);
}
