import { afterEach, describe, expect, it } from 'vitest';
import {
  ARENA_X_M, Bot, FULL_POWER_COOLDOWN_S, FULL_POWER_MULT, HYPE_STAMINA, LOADOUT_S, SNAP_SPEED, PREFERRED_GAP_M, defaultLoadout, DODGE_COST, HALF_FAR_M, HALF_NEAR_M, MOVES, MOVE_IDS, SPECIES, STAMINA_MAX, TICK_HZ, activeCreature,
  computeDamage, createMatch, hitChance, step, travelTicks, typeMultiplier, usesLeft,
  type BaseSpeciesId, type CheerId, type Intent, type MoveId, type SimEvent, type SimState, type SpeciesId,
} from '../src/sim';

// Accuracy rolls are random; tests about other mechanics make every move hit (restored after each test).
const REAL_ACCURACY = Object.fromEntries(MOVE_IDS.map((m) => [m, MOVES[m].accuracy])) as Record<MoveId, number>;
function sureHits() {
  for (const m of MOVE_IDS) MOVES[m].accuracy = 100;
}
afterEach(() => {
  for (const m of MOVE_IDS) MOVES[m].accuracy = REAL_ACCURACY[m];
});

const none: [Intent[], Intent[]] = [[], []];

function run(s: SimState, ticks: number, intents?: [Intent[], Intent[]]): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < ticks; i++) all.push(...step(s, i === 0 && intents ? intents : none));
  return all;
}
const sec = (x: number) => Math.round(x * TICK_HZ);
/** A match where both creatures are already on the field. */
function ready(a: BaseSpeciesId[], b: BaseSpeciesId[], seed = 1) {
  const s = createMatch([a, b], seed, { loadoutS: 0 });
  run(s, sec(1.1));
  return s;
}
const q = (...moves: (keyof typeof MOVES)[]): Intent => ({ type: 'queue', actions: moves.map((m) => ({ kind: 'move', move: m })) });
const dodge: Intent = { type: 'queue', actions: [{ kind: 'dodge' }] };
const alert: Intent = { type: 'queue', actions: [{ kind: 'alert' }] };

describe('type chart', () => {
  it('matches the spec', () => {
    expect(typeMultiplier('fire', 'grass')).toBe(1.25);
    expect(typeMultiplier('fire', 'fire')).toBe(0.5);
    expect(typeMultiplier('fire', 'water')).toBe(0.5);
    expect(typeMultiplier('fire', 'electric')).toBe(1);
    expect(typeMultiplier('water', 'fire')).toBe(1.25);
    expect(typeMultiplier('water', 'water')).toBe(0.5);
    expect(typeMultiplier('water', 'grass')).toBe(0.5);
    expect(typeMultiplier('grass', 'water')).toBe(1.25);
    expect(typeMultiplier('grass', 'grass')).toBe(0.5);
    expect(typeMultiplier('grass', 'fire')).toBe(0.5);
    expect(typeMultiplier('electric', 'water')).toBe(1.25);
    expect(typeMultiplier('electric', 'electric')).toBe(0.5);
    expect(typeMultiplier('electric', 'grass')).toBe(0.5);
    expect(typeMultiplier('electric', 'fire')).toBe(1);
    expect(typeMultiplier('normal', 'water')).toBe(1);
  });
});

describe('damage formula', () => {
  it('base × type × STAB × variance', () => {
    // roll 0.5 → variance 1.0
    expect(computeDamage(16, 'fire', 'fire', 'grass', 0.5, false)).toEqual({ damage: 25, eff: 'super' }); // 16*1.25*1.25
    expect(computeDamage(16, 'fire', 'fire', 'water', 0.5, false)).toEqual({ damage: 10, eff: 'weak' }); // 16*.5*1.25
    expect(computeDamage(12, 'normal', 'fire', 'grass', 0.5, false)).toEqual({ damage: 12, eff: 'neutral' }); // normal: neutral, no STAB
    expect(computeDamage(30, 'fire', 'fire', 'electric', 0.5, false).damage).toBe(38); // 37.5 → 38
  });
  it('variance spans 0.9–1.1', () => {
    expect(computeDamage(100, 'normal', 'fire', 'fire', 0, false).damage).toBe(90);
    expect(computeDamage(100, 'normal', 'fire', 'fire', 0.99999, false).damage).toBe(110);
  });
  it('heat shell halves damage', () => {
    expect(computeDamage(20, 'normal', 'fire', 'fire', 0.5, true).damage).toBe(10);
  });
  it('applies in the sim and emits effectiveness', () => {
    sureHits();
    const s = ready(['cindrix'], ['vinram']);
    const ev = run(s, sec(2.5), [[q('cinder_spit')], []]);
    const hit = ev.find((e) => e.t === 'hit');
    expect(hit).toMatchObject({ t: 'hit', p: 0, target: 1, eff: 'super' });
    const dmg = (hit as { damage: number }).damage;
    expect(dmg).toBeGreaterThanOrEqual(22); // 16*1.25*1.25*0.9
    expect(dmg).toBeLessThanOrEqual(28);
    expect(activeCreature(s.trainers[1]).hp).toBe(125 - dmg);
  });
});

describe('move uses', () => {
  it('limits uses per round by base cost tier', () => {
    expect(MOVES.magma_burst.uses).toBe(5); // 35
    expect(MOVES.volcanic_ruin.uses).toBe(5); // 45
    expect(MOVES.molten_leap.uses).toBe(10); // 30
    expect(MOVES.heat_shell.uses).toBe(15); // 20
    expect(MOVES.healing_rain.uses).toBe(15); // 25
    expect(MOVES.cinder_spit.uses).toBe(20); // 15
    expect(MOVE_IDS.every((m) => [5, 10, 15, 20].includes(MOVES[m].uses!))).toBe(true);
  });
  it('counts each start and refuses a move with no uses left', () => {
    const s = ready(['cindrix'], ['vinram']);
    const c = activeCreature(s.trainers[0]);
    step(s, [[q('magma_burst')], []]);
    expect(usesLeft(c, 'magma_burst')).toBe(4);
    s.trainers[0].action = null;
    c.used.magma_burst = 5;
    c.stamina = STAMINA_MAX;
    const ev = step(s, [[q('magma_burst')], []]);
    expect(ev).toContainEqual({ t: 'fail', p: 0, reason: 'no_uses' });
    expect(c.stamina).toBe(STAMINA_MAX); // nothing spent
    expect(s.trainers[0].action).toBeNull();
  });
  it('resets uses in the next round', () => {
    const s = ready(['cindrix'], ['vinram']);
    activeCreature(s.trainers[0]).used.magma_burst = 5;
    activeCreature(s.trainers[1]).hp = 0.1;
    activeCreature(s.trainers[1]).fainted = false;
    step(s, [[q('cinder_spit')], []]);
    run(s, sec(30));
    expect(s.round).toBe(2);
    expect(activeCreature(s.trainers[0]).used).toEqual({});
  });
  it('the bot never picks a move with no uses left', () => {
    const s = ready(['cindrix'], ['vinram']);
    const me = activeCreature(s.trainers[1]);
    for (const m of me.moves) if (m !== 'leaf_volley') me.used[m] = MOVES[m].uses;
    const bot = new Bot(1, 7);
    for (let i = 0; i < sec(20); i++) {
      for (const it of bot.think(s)) if (it.type === 'queue') for (const a of it.actions) if (a.kind === 'move') expect(a.move).toBe('leaf_volley');
      me.stamina = STAMINA_MAX;
      step(s, none);
    }
  });
});

describe('stamina', () => {
  it('spends cost at action start and pauses regen 0.8 s', () => {
    const s = ready(['cindrix'], ['vinram']);
    step(s, [[q('magma_burst')], []]);
    const c = activeCreature(s.trainers[0]);
    const cost = MOVES.magma_burst.cost;
    expect(cost).toBe(47); // 35 × 1.35
    expect(c.stamina).toBe(STAMINA_MAX - cost);
    run(s, sec(0.7));
    expect(c.stamina).toBe(STAMINA_MAX - cost); // still paused
    run(s, sec(0.2) + 1);
    expect(c.stamina).toBeGreaterThan(STAMINA_MAX - cost);
  });
  it('regenerates 10/s', () => {
    const s = ready(['cindrix'], ['vinram']);
    const c = activeCreature(s.trainers[0]);
    c.stamina = 50;
    run(s, sec(1));
    expect(c.stamina).toBeCloseTo(60, 5);
  });
  it('fails (and clears the queue) when stamina is short at execution time', () => {
    const s = ready(['cindrix'], ['vinram']);
    const c = activeCreature(s.trainers[0]);
    c.stamina = 20;
    const ev = run(s, 3, [[q('magma_burst', 'shell_ram', 'cinder_spit')], []]);
    expect(ev).toContainEqual({ t: 'fail', p: 0, reason: 'stamina' });
    expect(s.trainers[0].queue).toEqual([]);
    expect(s.trainers[0].action).toBeNull();
  });
  it('static field halves regen', () => {
    sureHits();
    const s = ready(['joltmoth'], ['cindrix']);
    run(s, sec(1.5), [[q('static_field')], []]);
    const c = activeCreature(s.trainers[1]);
    expect(c.staticTicks).toBeGreaterThan(0);
    c.stamina = 50;
    c.regenPause = 0;
    run(s, sec(1));
    expect(c.stamina).toBeCloseTo(55, 5);
  });
});

describe('queue and failure', () => {
  it('runs queued actions back to back', () => {
    sureHits();
    const s = ready(['cindrix'], ['vinram']);
    const ev = run(s, sec(5), [[q('shell_ram', 'cinder_spit', 'shell_ram')], []]);
    expect(ev.filter((e) => e.t === 'action_start' && e.p === 0)).toHaveLength(3);
    expect(ev.filter((e) => e.t === 'hit' && e.p === 0)).toHaveLength(3);
  });
  it('caps the queue at 4', () => {
    const s = ready(['cindrix'], ['vinram']);
    const ev = run(s, 1, [[q('shell_ram', 'shell_ram', 'shell_ram', 'shell_ram', 'shell_ram', 'shell_ram')], []]);
    expect(ev).toContainEqual({ t: 'queue_full', p: 0 });
    expect(s.trainers[0].queue.length + (s.trainers[0].action ? 1 : 0)).toBeLessThanOrEqual(4);
  });
  it('a hit of 25+ interrupts a windup and clears the victim queue', () => {
    sureHits();
    const s = ready(['cindrix'], ['vinram']);
    // Vinram winds up a (stretched) Thorn Quake; Cindrix lands a super-effective Magma Burst (≥42 dmg) during it.
    step(s, [[], [q('thorn_quake', 'horn_charge')]]);
    s.trainers[1].action!.left = sec(4);
    const ev = run(s, sec(2.5), [[q('magma_burst')], []]);
    expect(ev.find((e) => e.t === 'hit' && e.p === 0)).toMatchObject({ interrupted: true });
    expect(ev).toContainEqual({ t: 'fail', p: 1, reason: 'interrupted' });
    expect(s.trainers[1].queue).toEqual([]);
  });
  it('small hits do not interrupt', () => {
    sureHits();
    const s = ready(['cindrix'], ['vinram']);
    step(s, [[], [q('thorn_quake')]]);
    const ev = run(s, sec(1), [[q('shell_ram')], []]);
    expect(ev.find((e) => e.t === 'hit' && e.p === 0)).toMatchObject({ interrupted: false });
    expect(ev.some((e) => e.t === 'fail')).toBe(false);
  });
  it('fails when the target is recalled mid-move', () => {
    const s = ready(['cindrix'], ['vinram', 'brinkle']);
    step(s, [[], [{ type: 'queue', actions: [{ kind: 'recall' }] }]]);
    run(s, sec(0.8));
    const ev = run(s, sec(2), [[q('magma_burst')], []]);
    expect(ev).toContainEqual({ t: 'fail', p: 0, reason: 'target_recalled' });
  });
  it('stop clears the queue', () => {
    const s = ready(['cindrix'], ['vinram']);
    step(s, [[q('shell_ram', 'shell_ram', 'shell_ram')], []]);
    const ev = run(s, 1, [[{ type: 'stop' }], []]);
    expect(ev).toContainEqual({ t: 'stopped', p: 0 });
    expect(s.trainers[0].queue).toEqual([]);
  });
  it('rejects moves the active creature does not know', () => {
    const s = ready(['cindrix'], ['vinram']);
    const ev = run(s, 1, [[q('water_jet')], []]);
    expect(ev).toContainEqual({ t: 'invalid', p: 0, reason: 'unknown_move' });
  });
});

describe('accuracy and combos', () => {
  it('hitChance = accuracy × target state', () => {
    const s = ready(['cindrix'], ['vinram']);
    const foe = s.trainers[1];
    expect(hitChance(MOVES.cinder_spit, foe)).toBeCloseTo(0.9);
    expect(hitChance(MOVES.thunder_lance, foe)).toBeCloseTo(0.75);
    expect(hitChance(MOVES.shell_ram, foe)).toBe(1);
    // Busy with a move: ×1.2 (capped at 1).
    step(s, [[], [q('thorn_quake')]]);
    expect(hitChance(MOVES.cinder_spit, foe)).toBe(1);
    expect(hitChance(MOVES.thunder_lance, foe)).toBeCloseTo(0.9);
    // Alert: ×0.7.
    const t = ready(['cindrix'], ['vinram']);
    step(t, [[], [alert]]);
    expect(hitChance(MOVES.cinder_spit, t.trainers[1])).toBeCloseTo(0.63);
    expect(hitChance(MOVES.shell_ram, t.trainers[1])).toBeCloseTo(0.7);
  });
  it('accuracy rolls hit roughly as often as hitChance says', () => {
    let hits = 0, misses = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = ready(['joltmoth'], ['cindrix'], seed);
      const ev = run(s, sec(3), [[q('thunder_lance')], []]);
      hits += ev.filter((e) => e.t === 'hit' && e.p === 0).length;
      misses += ev.filter((e) => e.t === 'miss' && e.p === 0).length;
    }
    expect(hits + misses).toBe(200);
    expect(hits / 200).toBeGreaterThan(0.65); // 75 %
    expect(hits / 200).toBeLessThan(0.85);
  });
  it('a miss keeps the attacker queue', () => {
    const s = ready(['cindrix'], ['vinram']);
    MOVES.cinder_spit.accuracy = 0;
    const ev = run(s, sec(4), [[q('cinder_spit', 'shell_ram', 'shell_ram')], []]);
    expect(ev).toContainEqual(expect.objectContaining({ t: 'miss', p: 0, target: 1, move: 'cinder_spit' }));
    expect(ev.some((e) => e.t === 'fail')).toBe(false);
    expect(ev.filter((e) => e.t === 'action_start' && e.p === 0)).toHaveLength(3);
    expect(ev.filter((e) => e.t === 'hit' && e.p === 0)).toHaveLength(2);
  });
  it('getting hit clears your remaining queue (not the current action)', () => {
    sureHits();
    const s = ready(['cindrix'], ['vinram']);
    step(s, [[], [q('thorn_quake', 'leaf_volley', 'leaf_volley')]]);
    const ev = run(s, sec(0.5), [[q('shell_ram')], []]);
    expect(ev).toContainEqual({ t: 'combo_broken', p: 1, lost: 2 });
    expect(s.trainers[1].queue).toEqual([]);
    expect(s.trainers[1].action?.action).toEqual({ kind: 'move', move: 'thorn_quake' });
  });
  it('no combo_broken when nothing was queued', () => {
    sureHits();
    const s = ready(['cindrix'], ['vinram']);
    const ev = run(s, sec(1), [[q('shell_ram')], []]);
    expect(ev.some((e) => e.t === 'hit')).toBe(true);
    expect(ev.some((e) => e.t === 'combo_broken')).toBe(false);
  });
  it('quick moves wind up in 0.15 s whatever the speed class', () => {
    for (const [sp, mv] of [['vinram', 'horn_charge'], ['joltmoth', 'wing_flick']] as const) {
      const s = ready([sp], ['cindrix']);
      step(s, [[q(mv)], []]);
      expect(s.trainers[0].action?.total).toBe(sec(0.15));
    }
    for (const m of ['shell_ram', 'bubble_bump', 'horn_charge', 'wing_flick'] as const) {
      expect(MOVES[m]).toMatchObject({ quick: true, accuracy: 100, cost: 20 });
    }
  });
  it('every non-quick attack winds up at least 0.6 s', () => {
    for (const m of Object.values(MOVES)) {
      if (m.delivery !== 'self' && !m.quick) expect(m.windup).toBeGreaterThanOrEqual(0.6);
    }
  });
  it('strike travel time depends on the real distance', () => {
    expect(travelTicks(MOVES.cinder_spit, 7)).toBe(sec(0.5));
    expect(travelTicks(MOVES.cinder_spit, 3.5)).toBe(sec(0.25));
    expect(travelTicks(MOVES.shell_ram, 7)).toBe(0);
  });
});

describe('dodge window', () => {
  it('costs 5 and arms a 2 s window without interrupting the current move', () => {
    const s = ready(['cindrix'], ['vinram']);
    step(s, [[q('magma_burst')], []]);
    run(s, 5);
    const ev = run(s, 1, [[dodge], []]);
    expect(DODGE_COST).toBe(5);
    expect(ev).toContainEqual({ t: 'dodge_ready', p: 0, on: true });
    expect(s.trainers[0].dodgeReady).toBe(sec(2) - 1); // armed on intent, then one tick elapsed
    expect(s.trainers[0].action?.action).toEqual({ kind: 'move', move: 'magma_burst' });
    expect(activeCreature(s.trainers[0]).stamina).toBe(STAMINA_MAX - MOVES.magma_burst.cost - 5);
  });
  it('auto-dodges the first normal attack and the attacker keeps its queue', () => {
    sureHits();
    const s = ready(['cindrix'], ['vinram']);
    step(s, [[], [dodge]]);
    const ev = run(s, sec(3), [[q('cinder_spit', 'cinder_spit')], []]);
    expect(ev).toContainEqual(expect.objectContaining({ t: 'dodge', p: 1 }));
    expect(ev).toContainEqual(expect.objectContaining({ t: 'dodged', p: 0, target: 1, move: 'cinder_spit' }));
    expect(ev).toContainEqual({ t: 'dodge_ready', p: 1, on: false });
    expect(ev.some((e) => e.t === 'fail')).toBe(false);
    expect(ev.filter((e) => e.t === 'action_start' && e.p === 0)).toHaveLength(2);
    // Only the first attack is dodged: the window is used up.
    expect(ev.filter((e) => e.t === 'hit' && e.p === 0)).toHaveLength(1);
  });
  it('quick moves go through the window', () => {
    sureHits();
    const s = ready(['cindrix'], ['vinram']);
    step(s, [[], [dodge]]);
    const ev = run(s, sec(0.8), [[q('shell_ram')], []]);
    expect(ev.find((e) => e.t === 'hit' && e.p === 0)).toBeTruthy();
    expect(ev.some((e) => e.t === 'dodge')).toBe(false);
    expect(s.trainers[1].dodgeReady).toBeGreaterThan(0);
  });
  it('the dash cancels the dodger’s own windup', () => {
    sureHits();
    const s = ready(['cindrix'], ['vinram']);
    step(s, [[], [q('thorn_quake')]]);
    step(s, [[], [dodge]]);
    const ev = run(s, sec(1.2), [[q('cinder_spit')], []]);
    expect(ev).toContainEqual(expect.objectContaining({ t: 'dodge', p: 1 }));
    expect(s.trainers[1].action).toBeNull();
    expect(ev.some((e) => e.t === 'launch' && e.p === 1)).toBe(false);
  });
  it('expires silently after 2 s', () => {
    const s = ready(['cindrix'], ['vinram']);
    step(s, [[dodge], []]);
    const ev = run(s, sec(2));
    expect(ev).toContainEqual({ t: 'dodge_ready', p: 0, on: false });
    expect(ev.some((e) => e.t === 'dodge')).toBe(false);
    expect(s.trainers[0].dodgeReady).toBe(0);
  });
  it('dashes to the requested side (player 1 faces the other way)', () => {
    sureHits();
    for (const [p, dir, world] of [[0, -1, -1], [0, 1, 1], [1, -1, 1], [1, 1, -1]] as const) {
      const s = ready(['cindrix'], ['cindrix']);
      s.trainers[p].x = 0;
      const d: Intent = { type: 'queue', actions: [{ kind: 'dodge', dir }] };
      const intents: [Intent[], Intent[]] = p === 0 ? [[d], [q('cinder_spit')]] : [[q('cinder_spit')], [d]];
      const ev = run(s, sec(2), intents);
      expect(ev).toContainEqual({ t: 'dodge', p, dir: world });
    }
  });
  it('a queued dodge arms when reached', () => {
    const s = ready(['cindrix'], ['vinram']);
    const ev = run(s, sec(1), [[{ type: 'queue', actions: [{ kind: 'move', move: 'shell_ram' }, { kind: 'dodge' }] }], []]);
    expect(ev).toContainEqual({ t: 'dodge_ready', p: 0, on: true });
  });
  it('fails without enough stamina', () => {
    const s = ready(['cindrix'], ['vinram']);
    activeCreature(s.trainers[0]).stamina = 3;
    const ev = run(s, 1, [[dodge], []]);
    expect(ev).toContainEqual({ t: 'fail', p: 0, reason: 'stamina' });
    expect(s.trainers[0].dodgeReady).toBe(0);
  });
  it('cannot dodge while rooted', () => {
    sureHits();
    const s = ready(['vinram'], ['cindrix']);
    run(s, sec(1.8), [[q('vine_snare')], []]);
    expect(activeCreature(s.trainers[1]).rootTicks).toBeGreaterThan(0);
    const ev = run(s, 2, [[], [dodge]]);
    expect(ev).toContainEqual({ t: 'fail', p: 1, reason: 'rooted' });
  });
});

describe('alert', () => {
  it('costs 15, lasts 3 s and delays queued attacks', () => {
    const s = ready(['cindrix'], ['vinram']);
    const ev = step(s, [[{ type: 'queue', actions: [{ kind: 'alert' }, { kind: 'move', move: 'shell_ram' }] }], []]);
    expect(ev).toContainEqual({ t: 'alert', p: 0, on: true });
    expect(activeCreature(s.trainers[0]).stamina).toBe(STAMINA_MAX - 15);
    ev.push(...run(s, sec(1)));
    expect(s.trainers[0].alertTicks).toBeGreaterThan(0);
    expect(ev.some((e) => e.t === 'launch' && e.p === 0)).toBe(false);
    const later = run(s, sec(2.5));
    expect(later).toContainEqual({ t: 'alert', p: 0, on: false });
    expect(later).toContainEqual(expect.objectContaining({ t: 'launch', p: 0, move: 'shell_ram' }));
  });
  it('is not interrupted by big hits', () => {
    sureHits();
    const s = ready(['vinram'], ['cindrix']);
    step(s, [[alert], []]);
    const ev = run(s, sec(2.5), [[], [q('cinder_spit')]]);
    expect(ev.find((e) => e.t === 'hit' && e.p === 1)).toBeTruthy();
    expect(ev.some((e) => e.t === 'fail')).toBe(false);
    expect(s.trainers[0].action?.action.kind).toBe('alert');
  });
  it('fails without enough stamina', () => {
    const s = ready(['cindrix'], ['vinram']);
    activeCreature(s.trainers[0]).stamina = 10;
    const ev = run(s, 1, [[alert], []]);
    expect(ev).toContainEqual({ t: 'fail', p: 0, reason: 'stamina' });
  });
});

describe('movement', () => {
  it('idle creatures strafe; creatures doing a move stand still', () => {
    const s = ready(['cindrix'], ['vinram']);
    const x0 = s.trainers[0].x;
    run(s, sec(0.5));
    expect(s.trainers[0].x).not.toBeCloseTo(x0, 2);
    step(s, [[q('magma_burst')], []]);
    const { x, z } = s.trainers[0];
    run(s, sec(1));
    expect(s.trainers[0].x).toBe(x);
    expect(s.trainers[0].z).toBe(z);
  });
  it('settles around the preferred distance (no drift to the bounds)', () => {
    for (const [a, b] of [['vinram', 'brinkle'], ['cindrix', 'brinkle'], ['joltmoth', 'vinram']] as const) {
      const s = ready([a], [b]);
      const want = (PREFERRED_GAP_M[a] + PREFERRED_GAP_M[b]) / 2;
      for (let i = 0; i < 6; i++) {
        run(s, sec(5));
        expect(s.trainers[0].z).toBeGreaterThanOrEqual(HALF_NEAR_M);
        expect(s.trainers[1].z).toBeLessThanOrEqual(-HALF_NEAR_M);
        expect(Math.abs(Math.abs(s.trainers[0].z - s.trainers[1].z) - want)).toBeLessThan(1.3);
      }
    }
  });
  it('stays in bounds for a whole bot match', () => {
    const s = createMatch([['joltmoth', 'cindrix'], ['brinkle', 'vinram']], 9);
    const a = new Bot(0, 10);
    const b = new Bot(1, 11);
    for (let n = 0; !s.result && n < TICK_HZ * 600; n++) {
      step(s, [a.think(s), b.think(s)]);
      for (const [p, t] of s.trainers.entries()) {
        expect(Math.abs(t.x)).toBeLessThanOrEqual(ARENA_X_M + 1e-9);
        const z = p === 0 ? t.z : -t.z;
        expect(z).toBeGreaterThanOrEqual(HALF_NEAR_M - 1e-9);
        expect(z).toBeLessThanOrEqual(HALF_FAR_M + 1e-9);
      }
    }
    expect(s.result).not.toBeNull();
  });
  it('a send-out puts the creature at its home spot', () => {
    const s = ready(['cindrix', 'joltmoth'], ['vinram']);
    run(s, sec(3), [[{ type: 'queue', actions: [{ kind: 'recall' }] }], []]);
    expect(activeCreature(s.trainers[0]).species).toBe('joltmoth');
    const fresh = createMatch([['cindrix'], ['vinram']], 1, { loadoutS: 0 });
    expect([fresh.trainers[0].x, fresh.trainers[0].z, fresh.trainers[1].z]).toEqual([0, 3, -3]);
  });
});

describe('fainting and switching', () => {
  it('faint opens a forced switch prompt and auto-sends after 10 s', () => {
    const s = ready(['cindrix'], ['vinram', 'brinkle']);
    activeCreature(s.trainers[1]).hp = 5;
    const ev = run(s, sec(1.5), [[q('shell_ram')], []]);
    expect(ev).toContainEqual({ t: 'faint', p: 1, slot: 0 });
    expect(ev).toContainEqual({ t: 'switch_prompt', p: 1, seconds: 10 });
    expect(s.trainers[1].field).toBe('choosing');
    const later = run(s, sec(10));
    expect(later).toContainEqual({ t: 'sendout', p: 1, slot: 1 });
    expect(s.trainers[1].active).toBe(1);
  });
  it('choose / go picks the replacement', () => {
    const s = ready(['cindrix'], ['vinram', 'brinkle']);
    activeCreature(s.trainers[1]).hp = 5;
    run(s, sec(1.5), [[q('shell_ram')], []]);
    const ev = run(s, 1, [[], [{ type: 'go', species: 'brinkle' }]]);
    expect(ev).toContainEqual({ t: 'sendout', p: 1, slot: 1 });
    run(s, sec(1.1));
    expect(s.trainers[1].field).toBe('active');
  });
  it('recall swaps creatures and keeps HP', () => {
    const s = ready(['cindrix', 'joltmoth'], ['vinram']);
    activeCreature(s.trainers[0]).hp = 50;
    const ev = run(s, sec(3), [[{ type: 'queue', actions: [{ kind: 'recall' }] }], []]);
    expect(ev).toContainEqual({ t: 'recall', p: 0, slot: 0 });
    expect(ev).toContainEqual({ t: 'sendout', p: 0, slot: 1 });
    expect(s.trainers[0].active).toBe(1);
    expect(s.trainers[0].team[0]!.hp).toBe(50);
  });
  it('go <bench creature> recalls', () => {
    const s = ready(['cindrix', 'joltmoth'], ['vinram']);
    run(s, sec(3), [[{ type: 'go', species: 'joltmoth' }], []]);
    expect(activeCreature(s.trainers[0]).species).toBe('joltmoth');
  });
  it('cannot recall without a living bench creature', () => {
    const s = ready(['cindrix', 'joltmoth'], ['vinram']);
    s.trainers[0].team[1]!.fainted = true;
    const ev = run(s, 1, [[{ type: 'queue', actions: [{ kind: 'recall' }] }], []]);
    expect(ev).toContainEqual({ t: 'invalid', p: 0, reason: 'cannot_recall' });
  });
  it('a round ends when both creatures of a trainer fainted', () => {
    const s = ready(['cindrix'], ['vinram', 'brinkle']);
    knockOutTrainer(s, 1);
    expect(s.score).toEqual([1, 0]);
    expect(s.result).toBeNull();
    expect(s.intermission).toBeGreaterThan(0);
  });
});

/** Player 0 (Cindrix lead, using Shell Ram) knocks out both of `loser`'s creatures. */
function knockOutTrainer(s: SimState, loser: 0 | 1): SimEvent[] {
  const winner = loser === 0 ? 1 : 0;
  const t = s.trainers[loser];
  for (const c of t.team) c.hp = 1;
  const melee = (sp: string) => SPECIES[sp as SpeciesId].moves[0]!;
  const evs: SimEvent[] = [];
  for (let i = 0; i < sec(20) && !evs.some((e) => e.t === 'round_end'); i++) {
    const w = s.trainers[winner];
    const intents: [Intent[], Intent[]] = [[], []];
    if (w.field === 'active' && !w.action && !w.queue.length) intents[winner] = [q(melee(activeCreature(w).species))];
    if (t.field === 'choosing') intents[loser] = [{ type: 'choose', slot: t.team.findIndex((c) => !c.fainted) as 0 | 1 }];
    evs.push(...step(s, intents));
  }
  return evs;
}

describe('rounds and evolution', () => {
  it('round 2 uses stage-2 forms, round 3 the final stage', () => {
    const s = ready(['cindrix', 'brinkle'], ['vinram', 'joltmoth']);
    expect(s.trainers[0].team.map((c) => c.species)).toEqual(['cindrix', 'brinkle']);
    const ev1 = knockOutTrainer(s, 1);
    expect(ev1).toContainEqual({ t: 'round_end', round: 1, winner: 0, score: [1, 0], next: 2 });
    const brk = run(s, s.intermission + 1);
    expect(brk).toContainEqual({ t: 'round_start', round: 2 });
    expect(s.round).toBe(2);
    expect(s.trainers[0].team.map((c) => c.species)).toEqual(['pyroxen', 'tsunafin']);
    expect(s.trainers[1].team.map((c) => c.species)).toEqual(['thornhorn', 'stormoth']);
    expect(s.trainers[0].team[0]!.hp).toBe(SPECIES.pyroxen.maxHp);
    run(s, sec(1.1));
    knockOutTrainer(s, 0);
    expect(s.score).toEqual([1, 1]);
    run(s, s.intermission + 1);
    expect(s.trainers[0].team.map((c) => c.species)).toEqual(['calderox', 'abyssmaw']);
    expect(s.trainers[1].team.map((c) => c.species)).toEqual(['elderoot', 'tempestra']);
  });
  it('first to 2 rounds wins the match', () => {
    const s = ready(['cindrix', 'brinkle'], ['vinram', 'joltmoth']);
    knockOutTrainer(s, 1);
    run(s, s.intermission + 1 + sec(1.1));
    const ev = knockOutTrainer(s, 1);
    expect(ev).toContainEqual({ t: 'round_end', round: 2, winner: 0, score: [2, 0], next: null });
    expect(ev).toContainEqual({ t: 'match_end', winner: 0 });
    expect(s.result).toEqual({ winner: 0 });
    expect(step(s, none)).toEqual([]); // frozen
  });
  it('intents are ignored during the break between rounds', () => {
    const s = ready(['cindrix'], ['vinram']);
    knockOutTrainer(s, 1);
    expect(run(s, 1, [[q('shell_ram')], []]).some((e) => e.t === 'action_start')).toBe(false);
  });
  it('evolutions keep earlier moves and learn one more each stage', () => {
    expect(SPECIES.cindrix.moves).toHaveLength(4);
    expect(SPECIES.pyroxen.moves).toEqual([...SPECIES.cindrix.moves, 'molten_leap']);
    expect(SPECIES.calderox.moves).toEqual([...SPECIES.pyroxen.moves, 'volcanic_ruin']);
    expect(SPECIES.tempestra.moves).toHaveLength(6);
  });
  it('evolved forms hit harder', () => {
    const base = computeDamage(20, 'normal', 'fire', 'fire', 0.5, false, SPECIES.cindrix.dmgMult).damage;
    const evo = computeDamage(20, 'normal', 'fire', 'fire', 0.5, false, SPECIES.calderox.dmgMult).damage;
    expect(evo).toBeGreaterThan(base);
  });
});

/** Puts both sides into round 2 (stage-2 forms on the field). */
function stage2(a: BaseSpeciesId[], b: BaseSpeciesId[]) {
  const s = ready(a, b);
  knockOutTrainer(s, 1);
  run(s, s.intermission + 1 + sec(1.1));
  return s;
}

describe('stage 2/3 move mechanics', () => {
  it('Tide Mirror reflects the next hit; the attacker counts as hit (queue lost)', () => {
    sureHits();
    const s = stage2(['brinkle'], ['cindrix']);
    run(s, sec(0.6), [[q('tide_mirror')], []]);
    expect(activeCreature(s.trainers[0]).mirrorTicks).toBeGreaterThan(0);
    const hpFoe = activeCreature(s.trainers[1]).hp;
    const ev = run(s, sec(0.5), [[], [q('shell_ram', 'shell_ram')]]);
    expect(ev.find((e) => e.t === 'reflect')).toMatchObject({ p: 0, target: 1, move: 'shell_ram' });
    expect(ev).toContainEqual({ t: 'combo_broken', p: 1, lost: 1 });
    expect(ev.some((e) => e.t === 'fail')).toBe(false);
    expect(activeCreature(s.trainers[0]).hp).toBe(SPECIES.tsunafin.maxHp);
    expect(activeCreature(s.trainers[1]).hp).toBeLessThan(hpFoe);
  });
  it('Bramble Stampede cannot be interrupted', () => {
    sureHits();
    const s = stage2(['vinram'], ['cindrix']);
    step(s, [[q('bramble_stampede')], []]);
    s.trainers[0].action!.left = sec(3); // stretch the windup so the spit surely lands during it
    activeCreature(s.trainers[0]).hp = 999;
    const ev = run(s, sec(2), [[], [q('cinder_spit')]]);
    const hit = ev.find((e) => e.t === 'hit' && e.p === 1);
    expect(hit && 'damage' in hit && hit.damage).toBeGreaterThanOrEqual(25);
    expect(ev.some((e) => e.t === 'fail' && e.p === 0)).toBe(false);
  });
  it('Chain Storm fires 3 separate strikes', () => {
    sureHits();
    const s = stage2(['joltmoth'], ['vinram']);
    const ev = run(s, sec(3), [[q('chain_storm')], []]);
    expect(ev.filter((e) => e.t === 'hit' && e.move === 'chain_storm')).toHaveLength(3);
  });
  it('Maelstrom damages and roots', () => {
    sureHits();
    const s = stage2(['brinkle'], ['cindrix']);
    knockOutTrainer(s, 0); // 1–1 → round 3
    run(s, s.intermission + 1 + sec(1.1));
    expect(activeCreature(s.trainers[0]).species).toBe('abyssmaw');
    const ev = run(s, sec(3.5), [[q('maelstrom')], []]);
    expect(ev.find((e) => e.t === 'hit' && e.move === 'maelstrom')).toBeTruthy();
    expect(ev).toContainEqual({ t: 'status', p: 1, status: 'root', on: true });
  });
});

describe('determinism and bot', () => {
  function botMatch(seed: number) {
    const s = createMatch([['cindrix', 'brinkle'], ['vinram', 'joltmoth']], seed);
    const a = new Bot(0, seed + 1);
    const b = new Bot(1, seed + 2);
    let n = 0;
    while (!s.result && n++ < TICK_HZ * 600) step(s, [a.think(s), b.think(s)]);
    return s;
  }
  it('same seed → same result', () => {
    const x = botMatch(42);
    const y = botMatch(42);
    expect(JSON.stringify(x)).toBe(JSON.stringify(y));
  });
  it('bot vs bot matches finish', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = botMatch(seed);
      expect(s.result).not.toBeNull();
    }
  });
  it('bots arm dodges against heavies, go on alert, and both hits and misses happen', () => {
    const count: Record<string, number> = {};
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const s = createMatch([['cindrix', 'brinkle'], ['vinram', 'joltmoth']], seed);
      const a = new Bot(0, seed + 1);
      const b = new Bot(1, seed + 2);
      for (let n = 0; !s.result && n < TICK_HZ * 600; n++) {
        for (const e of step(s, [a.think(s), b.think(s)])) count[e.t] = (count[e.t] ?? 0) + 1;
      }
    }
    for (const t of ['dodge_ready', 'dodge', 'dodged', 'alert', 'miss', 'hit', 'combo_broken']) expect(count[t] ?? 0).toBeGreaterThan(0);
  });
  it('species data matches the spec', () => {
    expect(SPECIES.cindrix.maxHp).toBe(110);
    expect(SPECIES.brinkle.maxHp).toBe(120);
    expect(SPECIES.vinram.maxHp).toBe(125);
    expect(SPECIES.joltmoth.maxHp).toBe(95);
    expect(Object.values(MOVES)).toHaveLength(24);
  });
});

describe('loadout phase', () => {
  const ready2: [Intent[], Intent[]] = [[{ type: 'ready' }], [{ type: 'ready' }]];
  it('a match starts with the move choice; the round begins when both are ready', () => {
    const s = createMatch([['cindrix'], ['vinram']], 1);
    const ev = run(s, sec(2));
    expect(ev).toContainEqual({ t: 'loadout_start', round: 1, seconds: LOADOUT_S });
    expect(ev.some((e) => e.t === 'sendout')).toBe(false);
    expect(s.trainers[0].field).toBe('sending');
    expect(run(s, 1, [[q('cinder_spit')], []]).some((e) => e.t === 'action_start')).toBe(false); // no fighting yet
    const start = run(s, 2, ready2);
    expect(start).toContainEqual({ t: 'ready', p: 0 });
    expect(start).toContainEqual({ t: 'loadout_end', round: 1 });
    expect(start).toContainEqual({ t: 'sendout', p: 0, slot: 0 });
    expect(s.loadout).toBe(0);
  });
  it('ends by itself when time is up', () => {
    const s = createMatch([['cindrix'], ['vinram']], 1, { loadoutS: 2 });
    const ev = run(s, sec(2) + 1, [[{ type: 'ready' }], []]);
    expect(ev).toContainEqual({ t: 'loadout_end', round: 1 });
  });
  it('defaults: stage 1 brings its 4 moves; an evolution swaps its newest move into the last slot', () => {
    expect(defaultLoadout('cindrix')).toEqual(['shell_ram', 'cinder_spit', 'heat_shell', 'magma_burst']);
    expect(defaultLoadout('pyroxen', ['shell_ram', 'cinder_spit', 'heat_shell', 'magma_burst'])).toEqual(['shell_ram', 'cinder_spit', 'heat_shell', 'molten_leap']);
    expect(defaultLoadout('calderox', ['magma_burst', 'cinder_spit', 'heat_shell', 'shell_ram'])).toEqual(['magma_burst', 'cinder_spit', 'heat_shell', 'volcanic_ruin']);
    expect(defaultLoadout('calderox', ['volcanic_ruin', 'cinder_spit', 'heat_shell', 'shell_ram'])).toEqual(['volcanic_ruin', 'cinder_spit', 'heat_shell', 'shell_ram']);
  });
  it('a chosen loadout is kept into the next round and limits the moves you can use', () => {
    const s = createMatch([['cindrix', 'brinkle'], ['vinram', 'joltmoth']], 1);
    run(s, 2, ready2);
    run(s, sec(1.1));
    knockOutTrainer(s, 1);
    run(s, s.intermission);
    expect(s.loadout).toBeGreaterThan(0);
    expect(activeCreature(s.trainers[0]).species).toBe('pyroxen');
    const pick: MoveId[] = ['molten_leap', 'magma_burst', 'cinder_spit', 'shell_ram'];
    run(s, 1, [[{ type: 'loadout', slot: 0, moves: pick }], []]);
    expect(activeCreature(s.trainers[0]).moves).toEqual(pick);
    expect(s.loadouts[0][0]).toEqual(pick);
    run(s, 2, ready2);
    run(s, sec(1.1));
    const ev = run(s, 1, [[q('heat_shell')], []]);
    expect(ev).toContainEqual({ t: 'invalid', p: 0, reason: 'unknown_move' });
    // Round 3: the pick is carried, with Volcanic Ruin swapped into the last slot.
    knockOutTrainer(s, 0);
    run(s, s.intermission);
    expect(activeCreature(s.trainers[0]).moves).toEqual(['molten_leap', 'magma_burst', 'cinder_spit', 'volcanic_ruin']);
  });
  it('rejects invalid loadouts', () => {
    const s = createMatch([['cindrix'], ['vinram']], 1);
    const bad: MoveId[][] = [
      ['shell_ram', 'cinder_spit', 'heat_shell'],
      ['shell_ram', 'shell_ram', 'heat_shell', 'magma_burst'],
      ['shell_ram', 'cinder_spit', 'heat_shell', 'water_jet'],
      ['shell_ram', 'cinder_spit', 'heat_shell', 'molten_leap'], // not learned yet at stage 1
    ];
    for (const moves of bad) {
      const ev = run(s, 1, [[{ type: 'loadout', slot: 0, moves }], []]);
      expect(ev).toContainEqual({ t: 'invalid', p: 0, reason: 'not_now' });
    }
    expect(activeCreature(s.trainers[0]).moves).toEqual(defaultLoadout('cindrix'));
  });
  it('changes are locked once ready, and ignored outside the phase', () => {
    const s = createMatch([['brinkle'], ['vinram']], 1);
    run(s, 1, [[{ type: 'ready' }], []]);
    run(s, 1, [[{ type: 'loadout', slot: 0, moves: ['water_jet', 'bubble_bump', 'healing_rain', 'tidal_crash'] }], []]);
    expect(activeCreature(s.trainers[0]).moves).toEqual(defaultLoadout('brinkle'));
  });
});

describe('verbal boosts', () => {
  const qb = (move: MoveId, boost: 'snap' | 'hype' | 'full'): Intent => ({ type: 'queue', actions: [{ kind: 'move', move, boost }] });
  const windupOf = (intent: Intent) => {
    const s = ready(['cindrix'], ['vinram']);
    step(s, [[intent], []]);
    return s.trainers[0].action!.total;
  };

  it('SNAP: windup 1.5× faster', () => {
    const normal = windupOf(q('magma_burst'));
    expect(windupOf(qb('magma_burst', 'snap'))).toBe(Math.round(normal / SNAP_SPEED));
  });

  it('HYPE: regains 10% of max stamina when the move starts', () => {
    const s = ready(['cindrix'], ['vinram']);
    const c = activeCreature(s.trainers[0]);
    c.stamina = 50;
    const ev = step(s, [[qb('cinder_spit', 'hype')], []]);
    // (plus one tick of normal regen, which runs earlier in the same tick)
    expect(c.stamina).toBeCloseTo(50 - MOVES.cinder_spit.cost + HYPE_STAMINA * STAMINA_MAX, 0);
    expect(ev).toContainEqual({ t: 'boost', p: 0, boost: 'hype' });
  });

  it('FULL POWER: accuracy ×1.3 (capped at 100%)', () => {
    const s = ready(['joltmoth'], ['vinram']);
    expect(hitChance(MOVES.thunder_lance, s.trainers[1], true)).toBeCloseTo(0.75 * FULL_POWER_MULT);
    expect(hitChance(MOVES.cinder_spit, s.trainers[1], true)).toBe(1);
  });

  it('FULL POWER: damage ×1.3', () => {
    sureHits();
    const dmg = (intent: Intent) => {
      const s = ready(['cindrix'], ['vinram'], 5);
      const hit = run(s, sec(3), [[intent], []]).find((e) => e.t === 'hit' && e.p === 0);
      return (hit as Extract<SimEvent, { t: 'hit' }>).damage;
    };
    const normal = dmg(q('cinder_spit'));
    expect(Math.abs(dmg(qb('cinder_spit', 'full')) - normal * FULL_POWER_MULT)).toBeLessThanOrEqual(1);
  });

  it('FULL POWER: 60 s cooldown, then usable again', () => {
    const s = ready(['cindrix'], ['vinram']);
    const ev1 = run(s, sec(2), [[qb('cinder_spit', 'full')], []]);
    expect(ev1).toContainEqual({ t: 'boost', p: 0, boost: 'full' });
    expect(s.fullPowerCd[0]).toBeGreaterThan(0);
    // during the cooldown the move still runs, without the boost
    const ev2 = run(s, 1, [[qb('cinder_spit', 'full')], []]);
    expect(ev2.some((e) => e.t === 'boost')).toBe(false);
    expect(ev2).toContainEqual({ t: 'action_start', p: 0, action: { kind: 'move', move: 'cinder_spit' } });
    s.fullPowerCd[0] = 1; // skip ahead to the end of the cooldown
    run(s, sec(2));
    expect(s.fullPowerCd[0]).toBe(0);
    activeCreature(s.trainers[0]).stamina = STAMINA_MAX;
    expect(run(s, 1, [[qb('cinder_spit', 'full')], []])).toContainEqual({ t: 'boost', p: 0, boost: 'full' });
    expect(s.fullPowerCd[0]).toBe(sec(FULL_POWER_COOLDOWN_S));
  });

  it('FULL POWER on a self move does nothing and spends no cooldown', () => {
    const s = ready(['cindrix'], ['vinram']);
    const ev = step(s, [[qb('heat_shell', 'full')], []]);
    expect(ev.some((e) => e.t === 'boost')).toBe(false);
    expect(s.fullPowerCd[0]).toBe(0);
  });

  it('the cooldown keeps running between rounds', () => {
    const s = ready(['cindrix'], ['vinram']);
    run(s, 1, [[qb('cinder_spit', 'full')], []]);
    activeCreature(s.trainers[1]).hp = 0.1;
    sureHits();
    const ev = run(s, sec(3));
    expect(ev.some((e) => e.t === 'round_end' || e.t === 'faint')).toBe(true);
    expect(s.fullPowerCd[0]).toBe(sec(FULL_POWER_COOLDOWN_S) - sec(3));
  });
});

describe('creature name accuracy bonus', () => {
  const qn = (move: MoveId): Intent => ({ type: 'queue', actions: [{ kind: 'move', move, named: true }] });
  it('hitChance: +10 accuracy, capped at 100, before state modifiers', () => {
    const s = ready(['cindrix'], ['vinram']);
    const foe = s.trainers[1];
    expect(hitChance(MOVES.thunder_lance, foe, false, true)).toBeCloseTo(0.85);
    expect(hitChance(MOVES.cinder_spit, foe, false, true)).toBe(1);
    expect(hitChance(MOVES.shell_ram, foe, false, true)).toBe(1);
    step(s, [[], [alert]]);
    expect(hitChance(MOVES.cinder_spit, foe, false, true)).toBeCloseTo(0.7);
  });
  it('a named 90% move never misses; unnamed it sometimes does', () => {
    let namedMiss = 0, plainMiss = 0;
    for (let seed = 1; seed <= 60; seed++) {
      namedMiss += run(ready(['cindrix'], ['vinram'], seed), sec(3), [[qn('cinder_spit')], []]).filter((e) => e.t === 'miss').length;
      plainMiss += run(ready(['cindrix'], ['vinram'], seed), sec(3), [[q('cinder_spit')], []]).filter((e) => e.t === 'miss').length;
    }
    expect(namedMiss).toBe(0);
    expect(plainMiss).toBeGreaterThan(0);
  });
});

describe('encouragements', () => {
  const ch = (word: CheerId): Intent => ({ type: 'cheer', word });
  const sp = (s: SimState) => activeCreature(s.trainers[0]);
  it('stamina words: +5% of max stamina, instantly, without touching the action or queue', () => {
    for (const w of ['come_on', 'perfect'] as const) {
      const s = ready(['cindrix'], ['vinram']);
      step(s, [[q('magma_burst', 'cinder_spit')], []]);
      const before = { action: s.trainers[0].action!.uid, queue: s.trainers[0].queue.length };
      sp(s).stamina = 40;
      const ev = step(s, [[ch(w)], []]);
      expect(sp(s).stamina).toBeCloseTo(45, 0);
      expect(ev).toContainEqual({ t: 'cheer', p: 0, word: w });
      expect(s.trainers[0].action!.uid).toBe(before.action);
      expect(s.trainers[0].queue.length).toBe(before.queue);
    }
  });
  it("don't give up: heals 5% of max HP (not above max)", () => {
    const s = ready(['cindrix'], ['vinram']);
    sp(s).hp = 50;
    step(s, [[ch('dont_give_up')], []]);
    expect(sp(s).hp).toBeCloseTo(50 + 0.05 * sp(s).maxHp);
    const f = ready(['cindrix'], ['vinram']);
    step(f, [[ch('dont_give_up')], []]);
    expect(sp(f).hp).toBe(sp(f).maxHp);
  });
  it('temp HP: soaks damage first, capped at 10% of max HP, gone after 10 s', () => {
    const s = ready(['cindrix'], ['vinram']);
    const c = sp(s);
    step(s, [[ch('stay_strong')], []]);
    expect(c.tempHp).toBeCloseTo(0.02 * c.maxHp);
    run(s, sec(5.1));
    step(s, [[ch('courage')], []]);
    expect(c.tempHp).toBeCloseTo(0.03 * c.maxHp);
    // cap
    c.tempHp = 0.095 * c.maxHp;
    run(s, sec(5.1));
    step(s, [[ch('courage')], []]);
    expect(c.tempHp).toBeCloseTo(0.1 * c.maxHp);
    // soak: foe hits; HP drops only by damage beyond the temp HP
    c.tempHp = 3;
    const hp = c.hp;
    MOVES.horn_charge.accuracy = 100;
    const ev = run(s, sec(3), [[], [q('horn_charge')]]);
    const hit = ev.find((e) => e.t === 'hit' && e.target === 0) as Extract<SimEvent, { t: 'hit' }>;
    expect(hit).toBeTruthy();
    expect(c.hp).toBeCloseTo(hp - Math.max(0, hit.damage - 3));
    expect(c.tempHp).toBeCloseTo(Math.max(0, 3 - hit.damage));
    // expiry
    const e2 = ready(['cindrix'], ['vinram']);
    step(e2, [[ch('stay_strong')], []]);
    run(e2, sec(10));
    expect(sp(e2).tempHp).toBe(0);
  });
  it('5 s gap between any two encouragements', () => {
    const s = ready(['cindrix'], ['vinram']);
    sp(s).stamina = 10;
    step(s, [[ch('come_on')], []]);
    const ev = run(s, sec(4.5), [[ch('perfect')], []]);
    expect(ev.filter((e) => e.t === 'cheer')).toHaveLength(0);
    run(s, sec(0.6));
    const ev2 = step(s, [[ch('perfect')], []]);
    expect(ev2.filter((e) => e.t === 'cheer')).toHaveLength(1);
  });
  it('same word within 10 s: about half do nothing; after 10 s always works', () => {
    let worked = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const s = ready(['cindrix'], ['vinram'], seed);
      step(s, [[ch('courage')], []]);
      run(s, sec(6));
      worked += step(s, [[ch('courage')], []]).filter((e) => e.t === 'cheer').length;
    }
    expect(worked).toBeGreaterThan(30);
    expect(worked).toBeLessThan(70);
    for (let seed = 1; seed <= 20; seed++) {
      const s = ready(['cindrix'], ['vinram'], seed);
      step(s, [[ch('courage')], []]);
      run(s, sec(10.1));
      expect(step(s, [[ch('courage')], []]).filter((e) => e.t === 'cheer')).toHaveLength(1);
    }
  });
  it('nothing while the creature is not on the field', () => {
    const s = createMatch([['cindrix'], ['vinram']], 1);
    expect(step(s, [[ch('come_on')], []]).filter((e) => e.t === 'cheer')).toHaveLength(0);
  });
});
