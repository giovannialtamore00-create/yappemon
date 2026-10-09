import { describe, expect, it } from 'vitest';
import { makeRoomCode, normalizeCode, peerIdFor } from '../src/net/protocol';
import { sanitizeIntents, sanitizeTeam } from '../src/net/sessions';

describe('room codes', () => {
  it('are 5 unambiguous characters', () => {
    for (let i = 0; i < 200; i++) expect(makeRoomCode()).toMatch(/^[A-HJKMNP-Z2-9]{5}$/);
  });
  it('map to the PeerJS id', () => expect(peerIdFor('ab3cd')).toBe('cbattle-AB3CD'));
  it('normalize user input', () => expect(normalizeCode(' ab-3cd9 ')).toBe('AB3CD'));
});

describe('remote input sanitizing', () => {
  it('accepts valid intents', () => {
    const ok = [
      { type: 'queue', actions: [{ kind: 'move', move: 'cinder_spit' }, { kind: 'dodge' }, { kind: 'recall' }] },
      { type: 'stop' }, { type: 'choose', slot: 1 }, { type: 'go', species: 'brinkle' },
    ];
    expect(sanitizeIntents(ok)).toEqual(ok);
  });
  it('keeps a valid voice boost on moves, drops an invalid one', () => {
    const boosted = [{ type: 'queue', actions: [{ kind: 'move', move: 'cinder_spit', boost: 'full' }, { kind: 'move', move: 'shell_ram', boost: 'snap' }] }];
    expect(sanitizeIntents(boosted)).toEqual(boosted);
    expect(sanitizeIntents([{ type: 'queue', actions: [{ kind: 'move', move: 'cinder_spit', boost: 'mega' }] }]))
      .toEqual([{ type: 'queue', actions: [{ kind: 'move', move: 'cinder_spit' }] }]);
  });
  it('keeps the creature-name flag only when it is exactly true', () => {
    const named = [{ type: 'queue', actions: [{ kind: 'move', move: 'cinder_spit', named: true, boost: 'snap' }] }];
    expect(sanitizeIntents(named)).toEqual([{ type: 'queue', actions: [{ kind: 'move', move: 'cinder_spit', boost: 'snap', named: true }] }]);
    expect(sanitizeIntents([{ type: 'queue', actions: [{ kind: 'move', move: 'cinder_spit', named: 'yes' }] }]))
      .toEqual([{ type: 'queue', actions: [{ kind: 'move', move: 'cinder_spit' }] }]);
  });
  it('keeps known encouragement words only', () => {
    expect(sanitizeIntents([{ type: 'cheer', word: 'courage' }, { type: 'cheer', word: 'hack' }, { type: 'cheer' }])).toEqual([{ type: 'cheer', word: 'courage' }]);
  });
  it('drops garbage', () => {
    expect(sanitizeIntents('nope')).toEqual([]);
    expect(sanitizeIntents([{ type: 'queue', actions: [{ kind: 'move', move: 'hack' }] }, { type: 'choose', slot: 5 }, null, 3])).toEqual([]);
    expect(sanitizeIntents([{ type: 'go', species: 'pikachu' }])).toEqual([]);
  });
  it('caps queue length', () => {
    const many = { type: 'queue', actions: Array(10).fill({ kind: 'dodge' }) };
    expect((sanitizeIntents([many])[0] as { actions: unknown[] }).actions).toHaveLength(4);
  });
  it('validates teams', () => {
    expect(sanitizeTeam(['cindrix', 'vinram'])).toEqual(['cindrix', 'vinram']);
    expect(sanitizeTeam(['cindrix', 'cindrix'])).toBeNull();
    expect(sanitizeTeam(['cindrix'])).toBeNull();
    expect(sanitizeTeam(['cindrix', 'zzz'])).toBeNull();
  });
});
