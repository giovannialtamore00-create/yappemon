import { describe, expect, it } from 'vitest';
import { levenshtein, normalize, parse, toIntents, type Command } from '../src/voice/parser';
import type { MoveId, SpeciesId } from '../src/sim/types';

const moves = (text: string, sp?: SpeciesId) =>
  parse(text, { activeSpecies: sp }).commands.map((c) => (c.kind === 'move' ? c.move : c.kind === 'go' ? `go:${c.species}` : c.kind === 'pick' ? `pick:${c.slot}` : c.kind));

describe('text utils', () => {
  it('normalizes case, accents and punctuation', () => {
    expect(normalize("Getto d'Acqua!")).toBe('getto d acqua');
    expect(normalize('  SCHIVÀ,  poi   Rientrà ')).toBe('schiva poi rientra');
  });
  it('levenshtein', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('same', 'same')).toBe(0);
  });
});

describe('English', () => {
  const cases: [string, SpeciesId, (MoveId | string)[]][] = [
    ['cinder spit', 'cindrix', ['cinder_spit']],
    ['use cinder spit', 'cindrix', ['cinder_spit']],
    ['Cinder Spit then Shell Ram', 'cindrix', ['cinder_spit', 'shell_ram']],
    ['heat shell and then magma burst then shell ram', 'cindrix', ['heat_shell', 'magma_burst', 'shell_ram']],
    ['water jet, after that tidal crash', 'brinkle', ['water_jet', 'tidal_crash']],
    ['healing rain next bubble bump', 'brinkle', ['healing_rain', 'bubble_bump']],
    ['vine snare then thorn quake', 'vinram', ['vine_snare', 'thorn_quake']],
    ['horn charge', 'vinram', ['horn_charge']],
    ['leaf volley', 'vinram', ['leaf_volley']],
    ['spark dart then static field then thunder lance', 'joltmoth', ['spark_dart', 'static_field', 'thunder_lance']],
    ['wing flick', 'joltmoth', ['wing_flick']],
    ['dodge', 'cindrix', ['dodge']],
    ['dodge then cinder spit', 'cindrix', ['dodge', 'cinder_spit']],
    ['come back', 'cindrix', ['recall']],
    ['stop', 'cindrix', ['stop']],
    ['go joltmoth', 'cindrix', ['go:joltmoth']],
    ['Cindrix, use magma burst', 'cindrix', ['magma_burst']],
  ];
  for (const [text, sp, want] of cases) it(`"${text}"`, () => expect(moves(text, sp)).toEqual(want));
});

describe('Italian', () => {
  const cases: [string, SpeciesId, (MoveId | string)[]][] = [
    ['sputo di brace', 'cindrix', ['cinder_spit']],
    ['usa sputo di brace poi carica corazzata', 'cindrix', ['cinder_spit', 'shell_ram']],
    ['guscio rovente e poi esplosione di magma', 'cindrix', ['heat_shell', 'magma_burst']],
    ["getto d'acqua dopo schianto di marea", 'brinkle', ['water_jet', 'tidal_crash']],
    ['pioggia curativa quindi spinta di bolla', 'brinkle', ['healing_rain', 'bubble_bump']],
    ['laccio di liane poi terremoto di spine', 'vinram', ['vine_snare', 'thorn_quake']],
    ['carica di corna', 'vinram', ['horn_charge']],
    ['raffica di foglie', 'vinram', ['leaf_volley']],
    ['dardo scintilla poi campo statico poi lancia di tuono', 'joltmoth', ['spark_dart', 'static_field', 'thunder_lance']],
    ["colpo d'ala", 'joltmoth', ['wing_flick']],
    ['schiva', 'cindrix', ['dodge']],
    ['schiva e poi sputo', 'cindrix', ['dodge', 'cinder_spit']],
    ['rientra', 'cindrix', ['recall']],
    ['fermati', 'cindrix', ['stop']],
    ['vai joltmoth', 'cindrix', ['go:joltmoth']],
    ['usa esplosione di magma', 'cindrix', ['magma_burst']],
  ];
  for (const [text, sp, want] of cases) it(`"${text}"`, () => expect(moves(text, sp)).toEqual(want));
});

describe('keywords alone', () => {
  const cases: [string, SpeciesId, MoveId][] = [
    ['magma', 'cindrix', 'magma_burst'],
    ['jet', 'brinkle', 'water_jet'],
    ['lance', 'joltmoth', 'thunder_lance'],
    ['spine', 'vinram', 'thorn_quake'],
    ['brace', 'cindrix', 'cinder_spit'],
    ['tuono', 'joltmoth', 'thunder_lance'],
    ['marea', 'brinkle', 'tidal_crash'],
    ['foglie', 'vinram', 'leaf_volley'],
  ];
  for (const [text, sp, want] of cases) it(`"${text}"`, () => expect(moves(text, sp)).toEqual([want]));
});

describe('garbled / misheard input', () => {
  const cases: [string, SpeciesId, (MoveId | string)[]][] = [
    ['sinner spit', 'cindrix', ['cinder_spit']],
    ['cinders bit then shell rum', 'cindrix', ['cinder_spit', 'shell_ram']],
    ['magna bust', 'cindrix', ['magma_burst']],
    ['hit shell', 'cindrix', ['heat_shell']],
    ['water get', 'brinkle', ['water_jet']],
    ['title crash', 'brinkle', ['tidal_crash']],
    ['feeling rain', 'brinkle', ['healing_rain']],
    ['double bump', 'brinkle', ['bubble_bump']],
    ['born quake', 'vinram', ['thorn_quake']],
    ['leaf valley', 'vinram', ['leaf_volley']],
    ['vine share', 'vinram', ['vine_snare']],
    ['corn charge', 'vinram', ['horn_charge']],
    ['thunder dance', 'joltmoth', ['thunder_lance']],
    ['spark heart', 'joltmoth', ['spark_dart']],
    ['static feel', 'joltmoth', ['static_field']],
    ['ring flick', 'joltmoth', ['wing_flick']],
    ['dodgee', 'cindrix', ['dodge']],
    ['skiva', 'cindrix', ['dodge']],
    ['sputo di brache', 'cindrix', ['cinder_spit']],
    ['esplosione di magna', 'cindrix', ['magma_burst']],
    ['getto dacqua', 'brinkle', ['water_jet']],
    ['laccio di lianne', 'vinram', ['vine_snare']],
    ['terremoto di spina', 'vinram', ['thorn_quake']],
    ['lancia di tuonno', 'joltmoth', ['thunder_lance']],
    ['dardo scintila', 'joltmoth', ['spark_dart']],
    ['go jolt moth', 'cindrix', ['go:joltmoth']],
    ['vai brinkley', 'cindrix', ['go:brinkle']],
    ['cinder spit shell ram', 'cindrix', ['cinder_spit', 'shell_ram']],
  ];
  for (const [text, sp, want] of cases) it(`"${text}"`, () => expect(moves(text, sp)).toEqual(want));
});

describe('without context (all moves)', () => {
  it('still finds unambiguous names', () => {
    expect(moves('thunder lance')).toEqual(['thunder_lance']);
    expect(moves('tidal crash then healing rain')).toEqual(['tidal_crash', 'healing_rain']);
  });
});

describe('noise', () => {
  it('ignores unrelated speech', () => {
    expect(moves('what are we having for dinner', 'cindrix')).toEqual([]);
    expect(moves('the', 'cindrix')).toEqual([]);
    expect(moves('', 'cindrix')).toEqual([]);
  });
  it('reports unmatched words', () => {
    expect(parse('banana cinder spit', { activeSpecies: 'cindrix' }).unmatched).toContain('banana');
  });
  it('filters moves of other species when context is set', () => {
    expect(moves('water jet', 'cindrix')).not.toContain('water_jet');
  });
});

describe('forced switch picks', () => {
  it('first / second / primo / secondo', () => {
    expect(moves('first')).toEqual(['pick:0']);
    expect(moves('second')).toEqual(['pick:1']);
    expect(moves('primo')).toEqual(['pick:0']);
    expect(moves('il secondo')).toEqual(['pick:1']);
  });
  it('bare creature name', () => expect(moves('brinkle')).toEqual(['go:brinkle']));
});

describe('toIntents', () => {
  const p = (t: string, sp: SpeciesId) => parse(t, { activeSpecies: sp }).commands;
  it('batches consecutive actions into one queue intent', () => {
    expect(toIntents(p('cinder spit then shell ram then dodge', 'cindrix'), { activeSpecies: 'cindrix' })).toEqual([
      { type: 'queue', actions: [{ kind: 'move', move: 'cinder_spit' }, { kind: 'move', move: 'shell_ram' }, { kind: 'dodge' }] },
    ]);
  });
  it('stop splits the batch', () => {
    expect(toIntents(p('stop then cinder spit', 'cindrix'))).toEqual([
      { type: 'stop' },
      { type: 'queue', actions: [{ kind: 'move', move: 'cinder_spit' }] },
    ]);
  });
  it('come back → recall action', () => {
    expect(toIntents(p('rientra', 'cindrix'))).toEqual([{ type: 'queue', actions: [{ kind: 'recall' }] }]);
  });
  it('go <bench> → go intent; go <active> ignored', () => {
    expect(toIntents(p('go joltmoth', 'cindrix'), { activeSpecies: 'cindrix' })).toEqual([{ type: 'go', species: 'joltmoth' }]);
    expect(toIntents(p('go cindrix', 'cindrix'), { activeSpecies: 'cindrix' })).toEqual([]);
  });
  it('picks only count during a forced switch', () => {
    const cmds: Command[] = [{ kind: 'pick', slot: 1 }];
    expect(toIntents(cmds)).toEqual([]);
    expect(toIntents(cmds, { forcedSwitch: true })).toEqual([{ type: 'choose', slot: 1 }]);
  });
});

describe('chatter does not trigger commands', () => {
  const lines = ['oh my god', 'are you kidding me', 'I am going to win', 'dai dai dai', 'che fortuna', 'ma dai', 'no no no',
    'what was that', 'come on', 'perfetto', 'good game', 'non ci credo', 'vai vai vai', 'hello can you hear me', 'mamma mia', 'wow'];
  for (const l of lines) it(`"${l}"`, () => expect(parse(l, { activeSpecies: 'cindrix' }).commands).toEqual([]));
  it('repeats need a connector', () => {
    expect(moves('cinder spit then cinder spit', 'cindrix')).toEqual(['cinder_spit', 'cinder_spit']);
  });
});

describe('evolutions: new moves and names', () => {
  const cases: [string, SpeciesId, (MoveId | string)[]][] = [
    ['molten leap', 'pyroxen', ['molten_leap']],
    ['balzo fuso poi sputo di brace', 'pyroxen', ['molten_leap', 'cinder_spit']],
    ['volcanic ruin', 'calderox', ['volcanic_ruin']],
    ['rovina vulcanica', 'calderox', ['volcanic_ruin']],
    ['tide mirror', 'tsunafin', ['tide_mirror']],
    ['specchio di marea', 'abyssmaw', ['tide_mirror']],
    ['maelstrom', 'abyssmaw', ['maelstrom']],
    ['gorgo abissale', 'abyssmaw', ['maelstrom']],
    ['bramble stampede', 'thornhorn', ['bramble_stampede']],
    ['carica di rovi', 'elderoot', ['bramble_stampede']],
    ['ancient bloom', 'elderoot', ['ancient_bloom']],
    ['fioritura antica', 'elderoot', ['ancient_bloom']],
    ['chain storm then dodge', 'stormoth', ['chain_storm', 'dodge']],
    ['tempesta a catena', 'tempestra', ['chain_storm']],
    ['sky judgement', 'tempestra', ['sky_judgement']],
    ['giudizio celeste', 'tempestra', ['sky_judgement']],
    // evolved forms keep their earlier moves
    ['cinder spit', 'calderox', ['cinder_spit']],
    ['thunder lance', 'tempestra', ['thunder_lance']],
    // names of evolved creatures
    ['go pyroxen', 'tsunafin', ['go:pyroxen']],
    ['vai tempestra', 'calderox', ['go:tempestra']],
    ['go thorn horn', 'stormoth', ['go:thornhorn']],
  ];
  for (const [text, sp, want] of cases) it(`"${text}" (${sp})`, () => expect(moves(text, sp)).toEqual(want));
  it('stage-1 creatures do not know later moves', () => {
    expect(moves('molten leap', 'cindrix')).not.toContain('molten_leap');
    expect(moves('sky judgement', 'stormoth')).not.toContain('sky_judgement');
  });
  it('go <base name> while the evolved form is active is ignored', () => {
    expect(toIntents(parse('go cindrix', { activeSpecies: 'pyroxen' }).commands, { activeSpecies: 'pyroxen' })).toEqual([]);
  });
});
