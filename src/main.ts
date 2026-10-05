import './style.css';
import { Sfx } from './audio/sfx';
import { Battle, type BattleAudio } from './game/battle';
import { LocalSession, type Session } from './game/session';
import { getLang, setLang, t } from './i18n';
import { Hud } from './render/hud';
import { createScene } from './render/scene';
import { Showcase } from './render/showcase';
import { SPECIES_IDS } from './sim/data';
import type { BaseSpeciesId, Lang } from './sim/types';
import { Screens, setUiClickHandler } from './ui/screens';
import { Speech, isSupportedBrowser } from './voice/speech';
import { hostRoom, joinRoom, type Link, type Pending } from './net/link';
import { normalizeCode } from './net/protocol';
import { ClientSession, HostSession, SpectatorHostSession, sanitizeTeam } from './net/sessions';

const LANG_KEY = 'yappemon.lang';

function loadLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'en' || v === 'it') return v;
  } catch { /* storage unavailable */ }
  return navigator.language?.startsWith('it') ? 'it' : 'en';
}

class App {
  private ctx = createScene(document.getElementById('scene') as HTMLCanvasElement);
  private hud = new Hud(document.getElementById('hud')!, document.getElementById('toasts')!);
  private screens = new Screens(document.getElementById('screens')!);
  private showcase = new Showcase(this.ctx.scene);
  private speech = new Speech();
  private sfx = new Sfx();
  private audio: BattleAudio = {
    event: (e, me, s) => this.sfx.event(e, me, s),
    fail: () => this.sfx.fail(),
    ui: () => this.sfx.ui(),
    evolve: () => this.sfx.evolve(),
    musicStart: () => this.sfx.musicStart(),
    musicStop: (fade) => this.sfx.musicStop(fade),
    musicSet: (round, danger) => this.sfx.musicSet(round, danger),
    musicDuck: (on) => this.sfx.musicDuck(on),
  };
  private battle: Battle | null = null;
  private link: Link | null = null;
  /** Both player links when hosting as a spectator. */
  private specLinks: Link[] = [];
  private pending: Pending | null = null;
  private last = performance.now();
  private time = 0;
  private micWarned = false;

  constructor() {
    setLang(loadLang());
    // Browsers only allow audio after a user gesture.
    const unlock = () => this.sfx.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    setUiClickHandler(() => this.sfx.ui());
    this.buildCorner();
    this.hud.onLeave = () => this.lobby();
    window.addEventListener('keydown', (e) => {
      if (e.key === '`' && this.battle) { e.preventDefault(); this.hud.toggleDebug(); }
    });
    this.speech.onStatus = (s) => {
      this.hud.setMic(s);
      if (s === 'denied' && !this.micWarned && this.battle) {
        this.micWarned = true;
        this.hud.toast(t('micDenied'), 'bad', 4000);
      }
    };
    this.speech.onInterim = (text) => this.battle?.command(text, false);
    this.speech.onFinal = (alts) => this.battle?.commandAlternatives(alts);
    this.lobby();
    requestAnimationFrame(this.loop);
    this.startBackgroundTicker();
    // Test hook (used by the headless smoke test); harmless in production.
    (window as unknown as { __yappemon: unknown }).__yappemon = {
      state: () => this.battle?.state() ?? null,
      say: (text: string) => this.battle?.command(text, true),
      app: this,
    };
  }

  /** Always-visible volume slider. */
  private buildCorner() {
    const c = document.createElement('div');
    c.className = 'corner';
    const label = document.createElement('span');
    label.textContent = '🔊';
    const r = document.createElement('input');
    r.type = 'range';
    r.min = '0';
    r.max = '1';
    r.step = '0.05';
    r.value = String(this.sfx.getVolume());
    r.title = t('volume');
    r.addEventListener('input', () => this.sfx.setVolume(Number(r.value)));
    const mlabel = document.createElement('span');
    mlabel.textContent = '🎵';
    const mr = document.createElement('input');
    mr.type = 'range';
    mr.min = '0';
    mr.max = '1';
    mr.step = '0.05';
    mr.value = String(this.sfx.getMusicVolume());
    mr.title = 'Music';
    mr.addEventListener('input', () => this.sfx.setMusicVolume(Number(mr.value)));
    c.append(label, r, mlabel, mr);
    document.getElementById('app')!.append(c);
  }

  /**
   * requestAnimationFrame stops in background tabs, which would freeze an online match for both
   * players (the host runs the sim). A worker timer is not paused, so it keeps the battle ticking.
   */
  private startBackgroundTicker() {
    try {
      const src = 'setInterval(() => postMessage(0), 50);';
      const worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      worker.onmessage = () => {
        if (!document.hidden || !this.battle || !this.link) return;
        const now = performance.now();
        const dt = Math.min(0.1, (now - this.last) / 1000);
        this.last = now;
        this.time += dt;
        this.battle.frame(dt);
      };
    } catch { /* workers unavailable: matches pause while hidden */ }
  }

  private loop = (now: number) => {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.battle?.frame(dt);
    this.showcase.update(dt, this.time);
    this.ctx.update(dt, this.time);
    this.ctx.render();
    requestAnimationFrame(this.loop);
  };

  private endBattle() {
    this.speech.stop();
    this.battle?.dispose();
    this.battle = null;
  }

  private beginBattle(session: Session, teams: [BaseSpeciesId[], BaseSpeciesId[]], onEnd: (r: 'victory' | 'defeat' | 'draw') => void) {
    this.screens.clear();
    this.showcase.hide();
    this.battle = new Battle(this.ctx, this.hud, this.screens, session, teams, this.audio, (r) => {
      this.hud.toggleDebug(false);
      onEnd(r);
    });
    this.hud.setMic(this.speech.status);
    if (this.battle.spectator) return;
    if (isSupportedBrowser()) this.speech.start(getLang());
    else this.hud.toast(t('browserWarn'), 'bad', 6000);
  }

  // ------------------------------------------------------------ online play

  private closeNet(notify: boolean) {
    const links = [...(this.link ? [this.link] : []), ...this.specLinks];
    this.link = null;
    this.specLinks = [];
    for (const link of links) {
      link.onClose = () => {};
      if (notify) link.close();
    }
    // Spectator hosts keep the room's peer open until here (after the quit messages are sent).
    const pending = this.pending;
    this.pending = null;
    if (pending) window.setTimeout(() => pending.cancel(), 200);
  }

  private disconnected() {
    this.closeNet(true); // tell any remaining player too (spectator rooms)
    this.endBattle();
    this.showcase.show('cindrix');
    this.screens.message(t('disconnected'), () => this.lobby());
  }

  private hostGame() {
    this.closeNet(true);
    this.screens.message(t('connecting'), () => this.lobby());
    this.pending = hostRoom({
      onCode: (code) => this.screens.hosting(code, () => this.lobby()),
      onLink: (link) => { this.pending = null; this.netTeamSelect(link, 'host'); },
      onError: (msg) => this.screens.message(t('peerError', { msg }), () => this.lobby()),
    });
  }

  /**
   * Host a room for two friends and watch: this browser runs the match (no creature, no mic);
   * the first joiner is Player 1, the second Player 2.
   */
  private hostSpectate() {
    this.closeNet(true);
    this.screens.message(t('connecting'), () => this.lobby());
    const links: Link[] = [];
    let ui: { setStatus(text: string): void } | null = null;
    this.pending = hostRoom({
      onCode: (code) => { ui = this.screens.hosting(code, () => this.lobby(), t('waitingPlayers', { n: 0 })); },
      onLink: (link) => {
        links.push(link);
        this.specLinks = links;
        link.onClose = () => this.disconnected();
        ui?.setStatus(links.length < 2 ? t('waitingPlayers', { n: links.length }) : t('playersPicking'));
        if (links.length === 2) this.spectatorTeams(links as [Link, Link], ui);
      },
      onError: (msg) => this.screens.message(t('peerError', { msg }), () => this.lobby()),
    }, 2);
  }

  /** Wait for both players' teams, then start the match they play and we watch. */
  private spectatorTeams(links: [Link, Link], ui: { setStatus(text: string): void } | null) {
    const teams: (BaseSpeciesId[] | null)[] = [null, null];
    links.forEach((link, i) => {
      link.onMessage = (m) => {
        if (m.k !== 'ready') return;
        teams[i] = sanitizeTeam(m.team);
        if (!teams[0] || !teams[1]) return;
        const both: [BaseSpeciesId[], BaseSpeciesId[]] = [teams[0], teams[1]];
        const session = new SpectatorHostSession(both, links);
        links.forEach((l, j) => {
          l.send({ k: 'start', teams: both, you: j as 0 | 1 });
          l.onMessage = (msg) => {
            if (msg.k === 'intents') session.receiveIntents(j as 0 | 1, msg.list);
            else if (msg.k === 'rematch') this.rematch.remote(j);
          };
        });
        this.beginBattle(session, both, () => this.spectatorEnd(links));
      };
    });
    ui?.setStatus(t('playersPicking'));
  }

  private spectatorEnd(links: [Link, Link]) {
    const s = this.battle?.state();
    const w = s?.result?.winner;
    const ui = this.screens.end({
      result: w === 'draw' || w === undefined ? 'draw' : 'victory',
      title: w === 'draw' || w === undefined ? t('draw') : t('playerWins', { n: w + 1 }),
      onRematch: () => {
        // The spectator decides: both players go back to team select.
        for (const l of links) l.send({ k: 'rematch_go' });
        this.endBattle();
        this.showcase.show('cindrix');
        this.screens.message(t('playersPicking'), () => this.lobby());
        this.spectatorTeams(links, null);
      },
      onQuit: () => this.lobby(),
    });
    this.rematch.remote = (p?: number) => ui.setStatus(t('wantsRematch', { n: (p ?? 0) + 1 }));
  }

  private joinGame(code: string) {
    this.closeNet(true);
    const c = normalizeCode(code);
    if (c.length !== 5) return this.screens.message(t('badCode'), () => this.lobby());
    this.screens.message(t('connecting'), () => this.lobby());
    this.pending = joinRoom(c, {
      onLink: (link) => { this.pending = null; this.netTeamSelect(link, 'client'); },
      onError: (msg) => this.screens.message(t('peerError', { msg }), () => this.lobby()),
    });
  }

  /** Team select for an online match. The host collects both teams and starts the match. */
  private netTeamSelect(link: Link, role: 'host' | 'client') {
    this.endBattle();
    this.link = link;
    link.onClose = () => this.disconnected();
    let mine: BaseSpeciesId[] | null = null;
    let theirs: BaseSpeciesId[] | null = null;
    const ui = this.screens.teamSelect({
      subtitle: isSupportedBrowser() ? t('micAsk') : undefined,
      onHover: (sp) => this.showcase.show(sp),
      onReady: (team) => {
        mine = team;
        ui.setWaiting();
        if (role === 'client') link.send({ k: 'ready', team });
        else tryStart();
      },
    });
    const tryStart = () => {
      if (role !== 'host' || !mine || !theirs) return;
      const teams: [BaseSpeciesId[], BaseSpeciesId[]] = [mine, theirs];
      link.send({ k: 'start', teams });
      const session = new HostSession(teams, link);
      link.onMessage = (m) => {
        if (m.k === 'intents') session.receiveIntents(m.list);
        else if (m.k === 'rematch') this.rematch.remote();
      };
      this.beginBattle(session, teams, (r) => this.netEnd(r, link, role));
    };
    link.onMessage = (m) => {
      if (role === 'host' && m.k === 'ready') {
        theirs = sanitizeTeam(m.team);
        tryStart();
      } else if (role === 'client' && m.k === 'start') {
        const teams = m.teams;
        const session = new ClientSession(link, m.you ?? 1);
        link.onMessage = (msg) => {
          if (msg.k === 'snap') session.receiveSnapshot(msg.state, msg.events);
          else if (msg.k === 'rematch') this.rematch.remote();
          else if (msg.k === 'rematch_go') this.netTeamSelect(link, 'client');
        };
        this.beginBattle(session, teams, (r) => this.netEnd(r, link, role));
      }
    };
  }

  /** Set by netEnd while the end screen is up; called when the opponent asks for a rematch. */
  private rematch: { remote: (p?: number) => void } = { remote: () => {} };

  private netEnd(result: 'victory' | 'defeat' | 'draw', link: Link, role: 'host' | 'client') {
    this.speech.stop();
    let localWants = false;
    let remoteWants = false;
    const go = () => {
      link.send({ k: 'rematch_go' });
      this.netTeamSelect(link, 'host');
    };
    const ui = this.screens.end({
      result,
      onRematch: () => {
        localWants = true;
        link.send({ k: 'rematch' });
        ui.setStatus(t('rematchWaiting'));
        if (role === 'host' && remoteWants) go();
      },
      onQuit: () => { this.closeNet(true); this.lobby(); },
    });
    this.rematch.remote = () => {
      remoteWants = true;
      if (role === 'host' && localWants) go();
      else ui.setStatus(t('opponentWantsRematch'));
    };
  }

  lobby() {
    this.closeNet(true);
    this.endBattle();
    this.showcase.show('cindrix');
    this.screens.lobby({
      lang: getLang(),
      voiceSupported: isSupportedBrowser(),
      onLang: (l) => {
        setLang(l);
        try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
        this.lobby();
      },
      onPractice: () => this.practiceTeamSelect(),
      onHost: () => this.hostGame(),
      onHostSpectate: () => this.hostSpectate(),
      onJoin: (code) => this.joinGame(code),
    });
  }

  practiceTeamSelect() {
    this.closeNet(true);
    this.endBattle();
    this.screens.teamSelect({
      subtitle: isSupportedBrowser() ? t('micAsk') : undefined,
      onHover: (sp) => this.showcase.show(sp),
      onReady: (team) => this.startPractice(team),
    });
  }

  startPractice(team: BaseSpeciesId[]) {
    // URL options for testing: ?seed=123&botTeam=vinram,brinkle&bot=passive&loadout=0
    const q = new URLSearchParams(location.search);
    const forced = (q.get('botTeam') ?? '').split(',').filter((x): x is BaseSpeciesId => (SPECIES_IDS as string[]).includes(x));
    const botTeam = forced.length === 2 ? forced : [...SPECIES_IDS].sort(() => Math.random() - 0.5).slice(0, 2);
    const seed = q.has('seed') ? Number(q.get('seed')) >>> 0 : undefined;
    // ?loadout=<seconds> sets the move-choice time (0 skips the panel), for automated tests.
    const loadout = q.has('loadout') ? Math.max(0, Number(q.get('loadout')) || 0) : undefined;
    const session = new LocalSession(team, botTeam, seed, q.get('bot') === 'passive', loadout);
    this.beginBattle(session, [team, botTeam], (result) => {
      this.speech.stop();
      this.screens.end({
        result,
        onRematch: () => this.practiceTeamSelect(),
        onQuit: () => this.lobby(),
      });
    });
  }
}

new App();
// ?prosody=1: developer panel for tuning verbal boosts.
if (new URLSearchParams(location.search).has('prosody')) void import('./ui/prosodydebug').then((m) => m.mountProsodyDebug());
