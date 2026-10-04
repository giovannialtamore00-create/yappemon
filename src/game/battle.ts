// One match in progress: drives the session, view and HUD, turns voice/debug text into intents,
// and reports toasts/sounds for events from the local player's point of view.

import * as THREE from 'three';
import { FAIL_REASON, getLang, t } from '../i18n';
import { MOVES, SPECIES } from '../sim/data';
import { activeCreature } from '../sim/sim';
import type { PlayerIdx, SimEvent, SimState, SpeciesId } from '../sim/types';
import { parse, toIntents } from '../voice/parser';
import type { Hud } from '../render/hud';
import type { SceneCtx } from '../render/scene';
import { BattleView } from '../render/view';
import type { Screens } from '../ui/screens';
import type { Session } from './session';

/** Sound hooks; implemented by src/audio. */
export interface BattleAudio {
  event(e: SimEvent, me: PlayerIdx, s: SimState): void;
  fail(): void;
  ui(): void;
}

export class Battle {
  readonly view: BattleView;
  private switchUi: { close(): void } | null = null;
  private ended = false;
  private hintShown = false;

  constructor(
    private ctx: SceneCtx,
    private hud: Hud,
    private screens: Screens,
    readonly session: Session,
    teams: [SpeciesId[], SpeciesId[]],
    private audio: BattleAudio | null,
    private onEnd: (result: 'victory' | 'defeat' | 'draw') => void,
  ) {
    this.view = new BattleView(ctx, teams, session.me);
    this.view.onFloat = (f) => this.floatText(f.text, f.pos, f.color, f.big);
    ctx.cameraMode = 'battle';
    hud.relabel();
    hud.show(true);
    hud.clearToasts();
    hud.onDebugCommand = (text) => this.command(text, true);
  }

  get me(): PlayerIdx {
    return this.session.me;
  }

  state(): SimState | null {
    return this.session.view()?.curr ?? null;
  }

  /** Feed recognized (or typed) text through the parser. Only final text produces intents. */
  command(text: string, final: boolean) {
    if (!final) { this.hud.setTranscript(text); return; }
    this.commandAlternatives([text]);
  }

  /** Final recognizer result: use the first alternative that parses into something actionable. */
  commandAlternatives(alts: string[]) {
    const s = this.state();
    if (!s || s.result || !alts.length) return;
    const tr = s.trainers[this.me];
    const activeSpecies = activeCreature(tr).species;
    const forcedSwitch = tr.field === 'choosing';
    for (const text of alts) {
      const intents = toIntents(parse(text, { activeSpecies }).commands, { forcedSwitch, activeSpecies });
      if (intents.length) {
        this.hud.setTranscript(text, true, true);
        this.session.send(intents);
        return;
      }
    }
    this.hud.setTranscript(alts[0]!, true, false);
  }

  frame(dt: number) {
    const events = this.session.update(dt);
    const v = this.session.view();
    if (!v) return;
    if (events.length) {
      this.view.handle(events, v.curr);
      for (const e of events) this.onEvent(e, v.curr);
    }
    this.view.update(dt, v.prev, v.curr, v.alpha);
    this.hud.update(v.curr, this.me);
    if (!this.hintShown && v.curr.trainers[this.me].field === 'active') {
      this.hintShown = true;
      const first = SPECIES[activeCreature(v.curr.trainers[this.me]).species].moves[1];
      this.hud.setHint(t('sayHint', { move: MOVES[first].name[getLang()] }));
    }
  }

  private floatText(text: string, pos: THREE.Vector3, color: string, big?: boolean) {
    const p = pos.clone().project(this.ctx.camera);
    if (p.z > 1) return;
    const x = (p.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-p.y * 0.5 + 0.5) * window.innerHeight;
    this.hud.float(text, x, y, color, big);
  }

  private onEvent(e: SimEvent, s: SimState) {
    this.audio?.event(e, this.me, s);
    const mine = 'p' in e && e.p === this.me;
    const lang = getLang();
    switch (e.t) {
      case 'hit':
        if (e.eff === 'super') this.hud.toast(t('super'), 'super');
        else if (e.eff === 'weak') this.hud.toast(t('weak'), 'weak');
        if (e.interrupted && e.target === this.me) this.hud.toast(t('interruptedYou'), 'bad');
        break;
      case 'fail':
        if (mine) {
          this.hud.toast(`${t('moveFailed')} (${FAIL_REASON[lang][e.reason]})`, 'bad', 3200);
          this.audio?.fail();
        } else this.hud.toast(t('foeFailed'), 'good', 1600);
        break;
      case 'faint': {
        const name = SPECIES[s.trainers[e.p].team[e.slot]!.species].name;
        this.hud.toast(`${name} ${t('fainted')}`, mine ? 'bad' : 'good');
        break;
      }
      case 'sendout': {
        const name = SPECIES[s.trainers[e.p].team[e.slot]!.species].name;
        this.hud.toast(mine ? t('sentOut', { name }) : t('foeSentOut', { name }), 'info');
        if (mine) this.closeSwitch();
        break;
      }
      case 'switch_prompt':
        if (mine) this.openSwitch(s, e.seconds);
        break;
      case 'queue_full':
        if (mine) this.hud.toast(t('queueFull'), 'info');
        break;
      case 'invalid':
        if (mine) this.hud.toast(t(e.reason === 'unknown_move' ? 'unknownMove' : e.reason === 'cannot_recall' ? 'cannotRecall' : 'notNow'), 'info');
        break;
      case 'stopped':
        if (mine) this.hud.toast(t('stopped'), 'info', 1200);
        break;
      case 'match_end':
        if (!this.ended) {
          this.ended = true;
          const r = e.winner === 'draw' ? 'draw' : e.winner === this.me ? 'victory' : 'defeat';
          window.setTimeout(() => this.onEnd(r), 2200);
        }
        break;
      default:
        break;
    }
  }

  private openSwitch(s: SimState, seconds: number) {
    const tr = s.trainers[this.me];
    this.closeSwitch();
    this.switchUi = this.screens.switchPrompt({
      team: tr.team.map((c) => ({ species: c.species, fainted: c.fainted, hp: c.hp, maxHp: c.maxHp })),
      seconds,
      onPick: (slot) => this.session.send([{ type: 'choose', slot }]),
    });
  }

  private closeSwitch() {
    this.switchUi?.close();
    this.switchUi = null;
  }

  dispose() {
    this.closeSwitch();
    this.view.dispose();
    this.session.dispose();
    this.hud.show(false);
    this.hud.toggleDebug(false);
    this.ctx.cameraMode = 'orbit';
  }
}
