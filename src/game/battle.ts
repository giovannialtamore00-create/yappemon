// One match in progress: drives the session, view and HUD, turns voice/debug text into intents,
// and reports toasts/sounds for events from the local player's point of view.

import * as THREE from 'three';
import { FAIL_REASON, getLang, t } from '../i18n';
import { MOVES, SPECIES } from '../sim/data';
import { activeCreature } from '../sim/sim';
import type { PlayerIdx, SimEvent, SimState, SpeciesId, BaseSpeciesId } from '../sim/types';
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
  /** The flash moment of the evolution sequence. */
  evolve(): void;
  /** Background battle music. */
  musicStart(): void;
  musicStop(fade?: number): void;
  musicSet(round: number, danger: number): void;
  musicDuck(on: boolean): void;
}

export class Battle {
  view: BattleView;
  private switchUi: { close(): void } | null = null;
  private ended = false;
  private hintShown = false;
  /** Watching only (spectator-hosted room): no commands, side camera, neutral messages. */
  readonly spectator: boolean;

  constructor(
    private ctx: SceneCtx,
    private hud: Hud,
    private screens: Screens,
    readonly session: Session,
    teams: [BaseSpeciesId[], BaseSpeciesId[]],
    private audio: BattleAudio | null,
    private onEnd: (result: 'victory' | 'defeat' | 'draw') => void,
  ) {
    this.spectator = !!(session as { spectator?: boolean }).spectator;
    this.view = this.makeView(teams);
    ctx.cameraMode = this.spectator ? 'spectate' : 'battle';
    hud.relabel();
    hud.setSpectator(this.spectator);
    hud.show(true);
    hud.clearToasts();
    hud.onDebugCommand = (text) => this.command(text, true);
    audio?.musicStart();
  }

  /** A fresh 3D view for the creatures of the current round (stage changes each round). */
  private makeView(teams: [SpeciesId[], SpeciesId[]]): BattleView {
    const v = new BattleView(this.ctx, teams, this.session.me);
    v.onFloat = (f) => this.floatText(f.text, f.pos, f.color, f.big);
    v.onEvolveBurst = () => this.audio?.evolve();
    if (this.spectator) this.ctx.setPov(null);
    return v;
  }

  get me(): PlayerIdx {
    return this.session.me;
  }

  state(): SimState | null {
    return this.session.view()?.curr ?? null;
  }

  /** Feed recognized (or typed) text through the parser. Only final text produces intents. */
  command(text: string, final: boolean) {
    if (typeof text !== 'string' || this.spectator) return;
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
      // A new round brings evolved creatures: swap in a new view and let it handle the rest.
      const rs = events.findIndex((e) => e.t === 'round_start');
      if (rs >= 0) {
        this.view.handle(events.slice(0, rs), v.curr);
        this.view.dispose();
        this.view = this.makeView([v.curr.trainers[0].team.map((c) => c.species), v.curr.trainers[1].team.map((c) => c.species)]);
        this.view.handle(events.slice(rs), v.curr);
      } else this.view.handle(events, v.curr);
      for (const e of events) this.onEvent(e, v.curr);
    }
    this.view.update(dt, v.prev, v.curr, v.alpha);
    this.hud.update(v.curr, this.me);
    // Music follows the round (key change) and the player's danger (low HP → faster).
    const mine = v.curr.trainers[this.me];
    const c = mine.team[mine.active]!;
    const frac = this.spectator ? 1 : c.hp / c.maxHp;
    this.audio?.musicSet(v.curr.round, mine.field === 'active' ? Math.min(1, Math.max(0, (0.35 - frac) / 0.2)) : 0);
    if (!this.spectator && !this.hintShown && v.curr.trainers[this.me].field === 'active') {
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
    const mine = !this.spectator && 'p' in e && e.p === this.me;
    const lang = getLang();
    const who = (p: number) => t('player', { n: p + 1 });
    switch (e.t) {
      case 'round_end': {
        this.closeSwitch();
        if (e.next) this.audio?.musicDuck(true);
        const res = e.winner === 'draw' ? t('draw') : this.spectator ? t('playerWins', { n: e.winner + 1 }) : e.winner === this.me ? t('roundWon') : t('roundLost');
        const sub = `${t('score')} ${e.score[this.me]} – ${e.score[this.me === 0 ? 1 : 0]}` + (e.next ? ` · ${t('evolving')}` : '');
        this.hud.banner(`${t('round')} ${e.round}: ${res}`, sub, e.next ? 4200 : 2000);
        break;
      }
      case 'round_start': {
        this.audio?.musicDuck(false);
        this.hud.banner(`${t('round')} ${e.round}`, t('fight'), 1600);
        const names = s.trainers[this.me].team.map((c) => SPECIES[c.species].name).join(' & ');
        if (!this.spectator) this.hud.toast(t('evolvedInto', { names }), 'good', 3000);
        break;
      }
      case 'reflect':
        if (!this.spectator && e.target === this.me) this.hud.toast(t('reflectedYou'), 'bad');
        break;
      case 'combo_broken':
        if (mine) this.hud.toast(t('comboBroken'), 'bad', 2400);
        break;
      case 'hit':
        if (e.eff === 'super') this.hud.toast(t('super'), 'super');
        else if (e.eff === 'weak') this.hud.toast(t('weak'), 'weak');
        if (!this.spectator && e.interrupted && e.target === this.me) this.hud.toast(t('interruptedYou'), 'bad');
        break;
      case 'fail':
        if (mine) {
          this.hud.toast(`${t('moveFailed')} (${FAIL_REASON[lang][e.reason]})`, 'bad', 3200);
          if (e.reason === 'stamina') this.hud.flashEnergy();
          this.audio?.fail();
        } else this.hud.toast(this.spectator ? t('failedP', { who: who(e.p) }) : t('foeFailed'), this.spectator ? 'info' : 'good', 1600);
        break;
      case 'faint': {
        const name = SPECIES[s.trainers[e.p].team[e.slot]!.species].name;
        this.hud.toast(`${name} ${t('fainted')}`, this.spectator ? 'info' : mine ? 'bad' : 'good');
        break;
      }
      case 'sendout': {
        const name = SPECIES[s.trainers[e.p].team[e.slot]!.species].name;
        this.hud.toast(this.spectator ? t('foeSentOutP', { who: who(e.p), name }) : mine ? t('sentOut', { name }) : t('foeSentOut', { name }), 'info');
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
        this.audio?.musicStop(0.15);
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
    this.audio?.musicStop();
    this.hud.setSpectator(false);
    this.hud.toggleDebug(false);
    this.ctx.cameraMode = 'orbit';
  }
}
