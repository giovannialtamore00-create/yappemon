// Wire protocol between host and client. JSON over a reliable PeerJS DataConnection.

import type { Intent, SimEvent, SimState, BaseSpeciesId } from '../sim/types';

export const PROTOCOL_VERSION = 1;
export const PEER_PREFIX = 'cbattle-';
/** No 0/O, 1/I/L to avoid confusion when reading codes aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function makeRoomCode(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return s;
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
}

export const peerIdFor = (code: string) => `${PEER_PREFIX}${code.toUpperCase()}`;

export type Msg =
  // both directions
  | { k: 'hello'; v: number }
  | { k: 'ping'; t: number }
  | { k: 'pong'; t: number }
  | { k: 'quit' }
  | { k: 'rematch' }
  // client → host
  | { k: 'ready'; team: BaseSpeciesId[] }
  | { k: 'intents'; list: Intent[] }
  // host → client
  /** `you`: which player the receiver controls (spectator-hosted rooms have two clients). */
  | { k: 'start'; teams: [BaseSpeciesId[], BaseSpeciesId[]]; you?: 0 | 1 }
  | { k: 'snap'; state: SimState; events: SimEvent[] }
  | { k: 'rematch_go' };

export function isMsg(x: unknown): x is Msg {
  return typeof x === 'object' && x !== null && typeof (x as { k?: unknown }).k === 'string';
}
