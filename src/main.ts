import './style.css';
import { Battle } from './game/battle';
import { LocalSession, type Session } from './game/session';
import { getLang, setLang, t } from './i18n';
import { Hud } from './render/hud';
import { createScene } from './render/scene';
import { Showcase } from './render/showcase';
import { SPECIES_IDS } from './sim/data';
import type { Lang, SpeciesId } from './sim/types';
import { Screens } from './ui/screens';
import { Speech, isSupportedBrowser } from './voice/speech';

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
  private battle: Battle | null = null;
  private last = performance.now();
  private time = 0;
  private micWarned = false;

  constructor() {
    setLang(loadLang());
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
    this.battle = new Battle(this.ctx, this.hud, this.screens, session, teams, null, (r) => {
      this.hud.toggleDebug(false);
      onEnd(r);
    });
    this.hud.setMic(this.speech.status);
    if (isSupportedBrowser()) this.speech.start(getLang());
    else this.hud.toast(t('browserWarn'), 'bad', 6000);
  }

  lobby() {
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
      onHost: () => {},
      onJoin: () => {},
    });
  }

  practiceTeamSelect() {
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
