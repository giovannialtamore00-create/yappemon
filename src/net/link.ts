// PeerJS wrapper: host a room (PeerJS id = cbattle-<code>) or join one, then exchange Msg objects
// over a reliable data channel with a heartbeat for fast disconnect detection.

import Peer, { type DataConnection, type PeerOptions } from 'peerjs';
import { PROTOCOL_VERSION, isMsg, makeRoomCode, peerIdFor, type Msg } from './protocol';

const PEER_OPTIONS: PeerOptions = {
  // Public PeerJS broker (default host). STUN only: most home networks connect fine;
  // strict/symmetric NATs may need TURN (see docs/playing.md "Known limitations").
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
  },
  debug: 1,
};

const PING_MS = 1000;
const TIMEOUT_MS = 6000;

export class Link {
  onMessage: (m: Msg) => void = () => {};
  onClose: (reason: string) => void = () => {};
  /** Round-trip time in ms (from heartbeats). */
  rtt = 0;
  private lastSeen = performance.now();
  private timer: number;
  private closed = false;

  /** `ownsPeer`: closing this link also tears down the PeerJS peer (false when one host peer serves several links). */
  constructor(private peer: Peer, private conn: DataConnection, private ownsPeer = true) {
    conn.on('data', (d) => {
      this.lastSeen = performance.now();
      if (!isMsg(d)) return;
      if (d.k === 'ping') return this.send({ k: 'pong', t: d.t });
      if (d.k === 'pong') { this.rtt = performance.now() - d.t; return; }
      if (d.k === 'quit') return this.shutdown('quit');
      this.onMessage(d);
    });
    conn.on('close', () => this.shutdown('closed'));
    conn.on('error', () => this.shutdown('error'));
    // The signalling server is only needed to connect; ignore it dropping afterwards.
    peer.on('disconnected', () => { if (!this.closed) try { peer.reconnect(); } catch { /* ignore */ } });
    this.timer = window.setInterval(() => {
      if (performance.now() - this.lastSeen > TIMEOUT_MS) return this.shutdown('timeout');
      this.send({ k: 'ping', t: performance.now() });
    }, PING_MS);
  }

  send(m: Msg) {
    if (this.closed || !this.conn.open) return;
    try { this.conn.send(m); } catch { /* channel closing */ }
  }

  /** Leave on purpose (tells the other side). */
  close() {
    this.send({ k: 'quit' });
    window.setTimeout(() => this.shutdown('local', false), 100);
  }

  private shutdown(reason: string, notify = true) {
    if (this.closed) return;
    this.closed = true;
    window.clearInterval(this.timer);
    try { this.conn.close(); } catch { /* ignore */ }
    if (this.ownsPeer) try { this.peer.destroy(); } catch { /* ignore */ }
    if (notify) this.onClose(reason);
  }
}

function errorText(err: unknown): string {
  const type = (err as { type?: string })?.type ?? '';
  switch (type) {
    case 'peer-unavailable': return 'room not found — check the code';
    case 'network': case 'server-error': case 'socket-error': case 'socket-closed': return 'cannot reach the matchmaking server (internet connection?)';
    case 'browser-incompatible': return 'this browser does not support WebRTC';
    case 'webrtc': return 'peer-to-peer connection failed (network/firewall)';
    default: return (err as Error)?.message ?? String(err);
  }
}

export interface Pending { cancel(): void }

/** Host a room. Calls onCode once the room id is registered, onLink when a friend connects. */
/**
 * Host a room. Calls onCode once the room id is registered, onLink for each friend that connects
 * (up to `maxLinks`; extra connections are refused). With maxLinks > 1 the host peer stays alive until cancel().
 */
export function hostRoom(cb: { onCode(code: string): void; onLink(link: Link): void; onError(msg: string): void }, maxLinks = 1): Pending {
  let peer: Peer | null = null;
  let cancelled = false;
  let links = 0;
  let attempts = 0;
  const open = () => {
    const code = makeRoomCode();
    peer = new Peer(peerIdFor(code), PEER_OPTIONS);
    const p = peer;
    p.on('open', () => { if (!cancelled) cb.onCode(code); });
    p.on('connection', (conn) => {
      if (cancelled || links >= maxLinks) { conn.on('open', () => conn.close()); return; }
      conn.on('open', () => {
        if (links >= maxLinks) return conn.close();
        links++;
        const link = new Link(p, conn, maxLinks === 1);
        link.send({ k: 'hello', v: PROTOCOL_VERSION });
        cb.onLink(link);
      });
    });
    p.on('error', (err) => {
      if (cancelled) return;
      if ((err as { type?: string }).type === 'unavailable-id' && attempts++ < 5) {
        p.destroy();
        open();
        return;
      }
      if (links === 0) cb.onError(errorText(err));
    });
  };
  open();
  return { cancel: () => { cancelled = true; if (links === 0 || maxLinks > 1) peer?.destroy(); } };
}

/** Join a room by code. */
export function joinRoom(code: string, cb: { onLink(link: Link): void; onError(msg: string): void }): Pending {
  let cancelled = false;
  let linked = false;
  const peer = new Peer(PEER_OPTIONS);
  const fail = (msg: string) => {
    if (cancelled || linked) return;
    cancelled = true;
    peer.destroy();
    cb.onError(msg);
  };
  const timeout = window.setTimeout(() => fail('timed out connecting — check the code and try again'), 15000);
  peer.on('open', () => {
    const conn = peer.connect(peerIdFor(code), { reliable: true, serialization: 'json' });
    conn.on('open', () => {
      if (cancelled) return conn.close();
      linked = true;
      window.clearTimeout(timeout);
      const link = new Link(peer, conn);
      link.send({ k: 'hello', v: PROTOCOL_VERSION });
      cb.onLink(link);
    });
    conn.on('error', (e) => fail(errorText(e)));
  });
  peer.on('error', (err) => fail(errorText(err)));
  return { cancel: () => { cancelled = true; window.clearTimeout(timeout); if (!linked) peer.destroy(); } };
}
