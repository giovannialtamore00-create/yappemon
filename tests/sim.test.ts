import { describe, expect, it } from 'vitest';
import {
  Bot, MOVES, SPECIES, STAMINA_MAX, TICK_HZ, activeCreature, computeDamage, createMatch, step, typeMultiplier,
  type Intent, type SimEvent, type SimState, type SpeciesId,
} from '../src/sim';

const none: [Intent[], Intent[]] = [[], []];

function run(s: SimState, ticks: number, intents?: [Intent[], Intent[]]): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < ticks; i++) all.push(...step(s, i === 0 && intents ? intents : none));
  return all;
}
const sec = (x: number) => Math.round(x * TICK_HZ);
/** A match where both creatures are already on the field. */
function ready(a: SpeciesId[], b: SpeciesId[], seed = 1) {
  const s = createMatch([a, b], seed);
  run(s, sec(1.1));
  return s;
}
const q = (...moves: (keyof typeof MOVES)[]): Intent => ({ type: 'queue', actions: moves.map((m) => ({ kind: 'move', move: m })) });
const dodge: Intent = { type: 'queue', actions: [{ kind: 'dodge' }] };

describe('type chart', () => {
  it('matches the spec', () => {
    expect(typeMultiplier('fire', 'grass')).toBe(2);
    expect(typeMultiplier('fire', 'fire')).toBe(0.5);
    expect(typeMultiplier('fire', 'water')).toBe(0.5);
    expect(typeMultiplier('fire', 'electric')).toBe(1);
    expect(typeMultiplier('water', 'fire')).toBe(2);
    expect(typeMultiplier('water', 'water')).toBe(0.5);
    expect(typeMultiplier('water', 'grass')).toBe(0.5);
    expect(typeMultiplier('grass', 'water')).toBe(2);
    expect(typeMultiplier('grass', 'grass')).toBe(0.5);
    expect(typeMultiplier('grass', 'fire')).toBe(0.5);
    expect(typeMultiplier('electric', 'water')).toBe(2);
    expect(typeMultiplier('electric', 'electric')).toBe(0.5);
    expect(typeMultiplier('electric', 'grass')).toBe(0.5);
    expect(typeMultiplier('electric', 'fire')).toBe(1);
    expect(typeMultiplier('normal', 'water')).toBe(1);
  });
});

describe('damage formula', () => {
  it('base × type × STAB × variance', () => {
    // roll 0.5 → variance 1.0
    expect(computeDamage(16, 'fire', 'fire', 'grass', 0.5, false)).toEqual({ damage: 40, eff: 'super' }); // 16*2*1.25
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
    const s = ready(['cindrix'], ['vinram']);
    const ev = run(s, sec(2.5), [[q('cinder_spit')], []]);
    const hit = ev.find((e) => e.t === 'hit');
    expect(hit).toMatchObject({ t: 'hit', p: 0, target: 1, eff: 'super' });
    const dmg = (hit as { damage: number }).damage;
    expect(dmg).toBeGreaterThanOrEqual(36); // 16*2*1.25*0.9
    expect(dmg).toBeLessThanOrEqual(44);
    expect(activeCreature(s.trainers[1]).hp).toBe(125 - dmg);
  });
});

describe('stamina', () => {
  it('spends cost at action start and pauses regen 0.8 s', () => {
    const s = ready(['cindrix'], ['vinram']);
    step(s, [[q('magma_burst')], []]);
    const c = activeCreature(s.trainers[0]);
    expect(c.stamina).toBe(STAMINA_MAX - 35);
    run(s, sec(0.7));
    expect(c.stamina).toBe(STAMINA_MAX - 35); // still paused
    run(s, sec(0.2) + 1);
    expect(c.stamina).toBeGreaterThan(STAMINA_MAX - 35);
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
  it('a dodged move clears the WHOLE remaining queue', () => {
    const s = ready(['cindrix'], ['vinram']);
    // Opponent dodges right as the spit is about to land.
    step(s, [[q('cinder_spit', 'shell_ram', 'shell_ram')], []]);
    let dodgedAt = -1;
    const evs: SimEvent[] = [];
    for (let i = 0; i < sec(3); i++) {
      const strike = s.strikes[0];
      const intents: [Intent[], Intent[]] = strike && strike.left === 4 ? [[], [dodge]] : none;
      const ev = step(s, intents);
      evs.push(...ev);
      if (ev.some((e) => e.t === 'dodged')) { dodgedAt = i; break; }
    }
    expect(dodgedAt).toBeGreaterThan(0);
    expect(evs).toContainEqual({ t: 'fail', p: 0, reason: 'dodged' });
    expect(s.trainers[0].queue).toEqual([]);
    expect(s.trainers[0].action).toBeNull();
    // The creature then idles: no further actions start by themselves.
    const later = run(s, sec(2));
    expect(later.filter((e) => e.t === 'action_start' && e.p === 0)).toHaveLength(0);
  });
  it('a hit of 25+ interrupts a windup and clears the victim queue', () => {
    const s = ready(['cindrix'], ['vinram']);
    // Vinram winds up a slow Thorn Quake; Cindrix lands a super-effective spit (≥36 dmg) during it.
    step(s, [[], [q('thorn_quake', 'horn_charge')]]);
    const ev = run(s, sec(1.2), [[q('cinder_spit')], []]);
    expect(ev.find((e) => e.t === 'hit' && e.p === 0)).toMatchObject({ interrupted: true });
    expect(ev).toContainEqual({ t: 'fail', p: 1, reason: 'interrupted' });
    expect(s.trainers[1].queue).toEqual([]);
  });
  it('small hits do not interrupt', () => {
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

describe('dodge', () => {
  it('jumps the queue and gives an invulnerable window, with a cooldown', () => {
    const s = ready(['cindrix'], ['vinram']);
    step(s, [[q('magma_burst')], []]);
    run(s, 5);
    const ev = run(s, 3, [[dodge], []]);
    expect(ev).toContainEqual(expect.objectContaining({ t: 'dodge', p: 0 }));
    expect(s.trainers[0].invulnTicks).toBeGreaterThan(0);
    expect(s.trainers[0].dodgeCooldown).toBeGreaterThan(0);
    expect(activeCreature(s.trainers[0]).stamina).toBeLessThanOrEqual(STAMINA_MAX - 35 - 15 + 1);
  });
  it('cannot dodge while rooted', () => {
    const s = ready(['vinram'], ['cindrix']);
    run(s, sec(1.6), [[q('vine_snare')], []]);
    expect(activeCreature(s.trainers[1]).rootTicks).toBeGreaterThan(0);
    const ev = run(s, 2, [[], [dodge]]);
    expect(ev).toContainEqual({ t: 'fail', p: 1, reason: 'rooted' });
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
  it('match ends when both creatures of a trainer fainted', () => {
    const s = ready(['cindrix'], ['vinram', 'brinkle']);
    activeCreature(s.trainers[1]).hp = 1;
    s.trainers[1].team[1]!.hp = 1;
    run(s, sec(1.5), [[q('shell_ram')], []]);
    run(s, 1, [[], [{ type: 'choose', slot: 1 }]]);
    run(s, sec(1.2));
    const ev = run(s, sec(1.5), [[q('shell_ram')], []]);
    expect(ev).toContainEqual({ t: 'match_end', winner: 0 });
    expect(s.result).toEqual({ winner: 0 });
    expect(step(s, none)).toEqual([]); // frozen
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
  it('species data matches the spec', () => {
    expect(SPECIES.cindrix.maxHp).toBe(110);
    expect(SPECIES.brinkle.maxHp).toBe(120);
    expect(SPECIES.vinram.maxHp).toBe(125);
    expect(SPECIES.joltmoth.maxHp).toBe(95);
    expect(Object.values(MOVES)).toHaveLength(16);
  });
});
