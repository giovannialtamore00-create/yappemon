import './style.css';
import { Battle } from './game/battle';
import { LocalSession } from './game/session';
import { getLang, setLang } from './i18n';
import { Hud } from './render/hud';
import { createScene } from './render/scene';
import { Showcase } from './render/showcase';
import { SPECIES_IDS } from './sim/data';
import type { Lang, SpeciesId } from './sim/types';
import { Screens } from './ui/screens';

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
  private battle: Battle | null = null;
  private last = performance.now();
  private time = 0;

  constructor() {
    setLang(loadLang());
    window.addEventListener('keydown', (e) => {
      if (e.key === '`' && this.battle) { e.preventDefault(); this.hud.toggleDebug(); }
    });
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
    this.battle?.dispose();
    this.battle = null;
  }

  lobby() {
    this.endBattle();
    this.showcase.show('cindrix');
    this.screens.lobby({
      lang: getLang(),
      voiceSupported: true,
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
    const pool = [...SPECIES_IDS].sort(() => Math.random() - 0.5);
    const botTeam = pool.slice(0, 2);
    this.screens.clear();
    this.showcase.hide();
    const session = new LocalSession(team, botTeam);
    this.battle = new Battle(this.ctx, this.hud, this.screens, session, [team, botTeam], null, (result) => {
      this.hud.toggleDebug(false);
      this.screens.end({
        result,
        onRematch: () => this.practiceTeamSelect(),
        onQuit: () => this.lobby(),
      });
    });
  }
}

new App();
