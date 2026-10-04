import './style.css';
import { Sfx } from './audio/sfx';
import { Battle, type BattleAudio } from './game/battle';
import { LocalSession, type Session } from './game/session';
import { getLang, setLang, t } from './i18n';
import { Hud } from './render/hud';
import { createScene } from './render/scene';
import { Showcase } from './render/showcase';
import { SPECIES_IDS } from './sim/data';
import type { Lang, SpeciesId } from './sim/types';
import { Screens, setUiClickHandler } from './ui/screens';
import { Speech, isSupportedBrowser } from './voice/speech';
import { hostRoom, joinRoom, type Link, type Pending } from './net/link';
import { normalizeCode } from './net/protocol';
import { ClientSession, HostSession, sanitizeTeam } from './net/sessions';

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
  };
  private battle: Battle | null = null;
  private link: Link | null = null;
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
    c.append(label, r);
    document.getElementById('app')!.append(c);
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

  private beginBattle(session: Session, teams: [SpeciesId[], SpeciesId[]], onEnd: (r: 'victory' | 'defeat' | 'draw') => void) {
    this.screens.clear();
    this.showcase.hide();
    this.battle = new Battle(this.ctx, this.hud, this.screens, session, teams, this.audio, (r) => {
      this.hud.toggleDebug(false);
      onEnd(r);
    });
    this.hud.setMic(this.speech.status);
    if (isSupportedBrowser()) this.speech.start(getLang());
    else this.hud.toast(t('browserWarn'), 'bad', 6000);
  }

  // ------------------------------------------------------------ online play

  private closeNet(notify: boolean) {
    this.pending?.cancel();
    this.pending = null;
    const link = this.link;
    this.link = null;
    if (link) {
      link.onClose = () => {};
      if (notify) link.close();
    }
  }

  private disconnected() {
    this.link = null;
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
    let mine: SpeciesId[] | null = null;
    let theirs: SpeciesId[] | null = null;
    const ui = this.screens.teamSelect({
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
      const teams: [SpeciesId[], SpeciesId[]] = [mine, theirs];
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
        const session = new ClientSession(link);
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
  private rematch = { remote: () => {} };

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
      onJoin: (code) => this.joinGame(code),
    });
  }

  practiceTeamSelect() {
    this.closeNet(true);
    this.endBattle();
    this.screens.teamSelect({
      onHover: (sp) => this.showcase.show(sp),
      onReady: (team) => this.startPractice(team),
    });
  }

  startPractice(team: SpeciesId[]) {
    // URL options for testing: ?seed=123&botTeam=vinram,brinkle&bot=passive
    const q = new URLSearchParams(location.search);
    const forced = (q.get('botTeam') ?? '').split(',').filter((x): x is SpeciesId => (SPECIES_IDS as string[]).includes(x));
    const botTeam = forced.length === 2 ? forced : [...SPECIES_IDS].sort(() => Math.random() - 0.5).slice(0, 2);
    const seed = q.has('seed') ? Number(q.get('seed')) >>> 0 : undefined;
    const session = new LocalSession(team, botTeam, seed, q.get('bot') === 'passive');
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
