// DOM HUD overlay: creature panels, queue chips, move reference, transcript, mic status, toasts, floating numbers.

import { ELEMENT_COLOR, ELEMENT_LABEL, getLang, t } from '../i18n';
import { DODGE_COST, MOVES, SPECIES, STAMINA_MAX } from '../sim/data';
import { MOVE_DESC } from '../movedesc';
import type { CreatureState, PlayerIdx, QAction, SimState, TrainerState } from '../sim/types';

export type MicStatus = 'on' | 'off' | 'denied' | 'unsupported' | 'starting';
export type ToastKind = 'info' | 'good' | 'bad' | 'super' | 'weak';

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

interface Panel {
  root: HTMLElement;
  name: HTMLElement;
  badge: HTMLElement;
  hpFill: HTMLElement;
  hpText: HTMLElement;
  stFill: HTMLElement;
  status: HTMLElement;
  dots: HTMLElement;
  act: HTMLElement;
  key: string;
}

function panel(side: 'me' | 'foe'): Panel {
  const root = h('div', `panel panel-${side}`);
  const top = h('div', 'panel-top');
  const name = h('span', 'panel-name');
  const badge = h('span', 'badge');
  const dots = h('span', 'team-dots');
  top.append(name, badge, dots);
  const hp = h('div', 'bar hp');
  const hpFill = h('div', 'fill');
  const hpText = h('span', 'bar-text');
  hp.append(hpFill, hpText);
  const st = h('div', 'bar st');
  const stFill = h('div', 'fill');
  st.append(stFill);
  const status = h('div', 'status-row');
  const act = h('div', 'act-row');
  root.append(top, hp, st, status, act);
  return { root, name, badge, hpFill, hpText, stFill, status, dots, act, key: '' };
}

export class Hud {
  private me: Panel;
  private foe: Panel;
  private queue = h('div', 'queue');
  private moves = h('div', 'moves');
  private transcript = h('div', 'transcript');
  private mic = h('div', 'mic');
  private floats = h('div', 'floats');
  private roundEl = h('div', 'round-info');
  private bannerEl = h('div', 'banner hidden');
  private bannerTimer = 0;
  private roundKey = '';
  private debug = h('input', 'debug-input') as HTMLInputElement;
  private toasts: HTMLElement;
  private movesKey = '';
  private queueKey = '';
  private transcriptTimer = 0;
  onDebugCommand: (text: string) => void = () => {};
  onLeave: () => void = () => {};
  private leaveBtn = h('button', 'btn leave-btn');
  private queueLabel = h('div', 'queue-label');

  /** Spectator: no voice box / move list; panels labelled Player 1 (bottom) and Player 2 (top). */
  setSpectator(on: boolean) {
    this.root.classList.toggle('spectator', on);
    this.me.root.dataset.label = on ? t('player', { n: 1 }) : '';
    this.foe.root.dataset.label = on ? t('player', { n: 2 }) : '';
  }

  /** Re-apply translated labels (the language can change between matches). */
  relabel() {
    this.leaveBtn.textContent = `✕ ${t('leave')}`;
    this.queueLabel.textContent = t('queue');
    this.debug.placeholder = t('debugHint');
    this.movesKey = this.queueKey = this.roundKey = '#stale';
    this.me.key = this.foe.key = '';
  }

  constructor(private root: HTMLElement, toasts: HTMLElement) {
    this.toasts = toasts;
    root.innerHTML = '';
    this.me = panel('me');
    this.foe = panel('foe');
    const bottom = h('div', 'hud-bottom');
    const voice = h('div', 'voice-box');
    const qlabel = this.queueLabel;
    voice.append(this.mic, this.transcript, qlabel, this.queue);
    bottom.append(voice);
    this.debug.placeholder = t('debugHint');
    this.debug.style.display = 'none';
    this.debug.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && this.debug.value.trim()) {
        this.onDebugCommand(this.debug.value);
        this.debug.value = '';
      }
      if (e.key === '`') { e.preventDefault(); this.toggleDebug(); }
    });
    const leave = this.leaveBtn;
    leave.addEventListener('click', () => this.onLeave());
    root.append(this.foe.root, this.me.root, this.moves, bottom, this.floats, this.debug, leave, this.roundEl, this.bannerEl);
    this.setMic('off');
  }

  toggleDebug(force?: boolean) {
    const show = force ?? this.debug.style.display === 'none';
    this.debug.style.display = show ? 'block' : 'none';
    if (show) this.debug.focus();
  }

  get debugVisible() {
    return this.debug.style.display !== 'none';
  }

  show(on: boolean) {
    this.root.classList.toggle('hidden', !on);
  }

  // ------------------------------------------------------------ per frame

  /** Big centered announcement (round results, evolution, fight!). */
  banner(title: string, sub = '', ms = 2000) {
    this.bannerEl.innerHTML = '';
    this.bannerEl.append(h('div', 'banner-title', title));
    if (sub) this.bannerEl.append(h('div', 'banner-sub', sub));
    this.bannerEl.className = 'banner';
    void this.bannerEl.offsetWidth; // restart the CSS animation
    this.bannerEl.classList.add('show');
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.bannerEl.classList.add('hidden'), ms);
  }

  private updateRound(s: SimState, me: PlayerIdx) {
    const key = `${s.round}|${s.score.join()}|${getLang()}`;
    if (key === this.roundKey) return;
    this.roundKey = key;
    this.roundEl.innerHTML = '';
    const pips = (n: number, cls: string) => {
      const w = h('span', `pips ${cls}`);
      for (let i = 0; i < 2; i++) w.append(h('span', `pip${i < n ? ' on' : ''}`));
      return w;
    };
    this.roundEl.append(pips(s.score[me], 'mine'), h('span', 'round-label', `${t('round')} ${Math.min(3, s.round)}/3`), pips(s.score[me === 0 ? 1 : 0], 'theirs'));
  }

  update(s: SimState, me: PlayerIdx) {
    this.updateRound(s, me);
    const mine = s.trainers[me];
    const theirs = s.trainers[me === 0 ? 1 : 0];
    this.updatePanel(this.me, mine);
    this.updatePanel(this.foe, theirs);
    this.updateQueue(mine);
    this.updateMoves(mine);
  }

  private updatePanel(p: Panel, tr: TrainerState) {
    const c: CreatureState = tr.team[tr.active]!;
    const def = SPECIES[c.species];
    const key = `${c.species}|${getLang()}|${tr.team.map((x) => x.fainted).join()}`;
    if (key !== p.key) {
      p.key = key;
      p.name.textContent = def.name;
      p.badge.textContent = ELEMENT_LABEL[getLang()][def.element];
      p.badge.style.background = ELEMENT_COLOR[def.element];
      p.dots.innerHTML = '';
      tr.team.forEach((m) => p.dots.append(h('span', `dot${m.fainted ? ' out' : ''}`)));
    }
    const hp = Math.ceil(c.hp);
    const frac = c.hp / c.maxHp;
    p.hpFill.style.width = `${frac * 100}%`;
    p.hpFill.className = `fill ${frac > 0.5 ? 'ok' : frac > 0.2 ? 'mid' : 'low'}`;
    p.hpText.textContent = `${hp} / ${c.maxHp}`;
    p.stFill.style.width = `${(c.stamina / STAMINA_MAX) * 100}%`;
    const st: string[] = [];
    if (c.shieldTicks > 0) st.push('🛡');
    if (c.rootTicks > 0) st.push('🌿');
    if (c.staticTicks > 0) st.push('⚡');
    if (c.healTicks > 0) st.push('✚');
    const sk = st.join(' ');
    if (p.status.textContent !== sk) p.status.textContent = sk;
    p.root.classList.toggle('dim', tr.field !== 'active');
    // Telegraph the opponent's windup so the player can react (dodge!).
    let act = '';
    let heavy = false;
    if (p === this.foe && tr.action?.phase === 'windup' && tr.action.action.kind === 'move') {
      const m = MOVES[tr.action.action.move];
      act = t('foeWinding', { move: m.name[getLang()] });
      heavy = m.heavy;
    }
    if (p.act.textContent !== act) {
      p.act.textContent = act;
      p.act.className = `act-row${heavy ? ' heavy' : ''}`;
    }
  }

  private chipLabel(a: QAction): string {
    const lang = getLang();
    if (a.kind === 'move') return MOVES[a.move].name[lang];
    if (a.kind === 'dodge') return lang === 'it' ? 'Schiva' : 'Dodge';
    return lang === 'it' ? 'Rientra' : 'Come back';
  }

  private updateQueue(tr: TrainerState) {
    const items: { label: string; current: boolean; phase?: string }[] = [];
    if (tr.action) items.push({ label: this.chipLabel(tr.action.action), current: true, phase: tr.action.phase });
    for (const a of tr.queue) items.push({ label: this.chipLabel(a), current: false });
    const key = items.map((i) => `${i.label}:${i.current}:${i.phase}`).join('|');
    if (key === this.queueKey) return;
    this.queueKey = key;
    this.queue.innerHTML = '';
    if (!items.length) this.queue.append(h('span', 'chip empty', '—'));
    for (const i of items) {
      const chip = h('span', `chip${i.current ? ' current' : ''}${i.phase ? ' ' + i.phase : ''}`, i.label);
      this.queue.append(chip);
    }
  }

  /** Bottom move bar: one card per move with name, type, stamina cost and what it does. */
  private updateMoves(tr: TrainerState) {
    const c = tr.team[tr.active]!;
    const def = SPECIES[c.species];
    const lang = getLang();
    const affordable = def.moves.map((m) => c.stamina >= MOVES[m].cost);
    const current = tr.action?.action.kind === 'move' ? tr.action.action.move : null;
    const queued = new Set(tr.queue.flatMap((a) => (a.kind === 'move' ? [a.move] : [])));
    const key = `${c.species}|${lang}|${affordable.join()}|${c.stamina >= DODGE_COST}|${current}|${[...queued].join()}`;
    if (key === this.movesKey) return;
    this.movesKey = key;
    this.moves.innerHTML = '';
    def.moves.forEach((id, i) => {
      const m = MOVES[id];
      const cls = ['move-card', affordable[i] ? '' : 'poor', id === current ? 'current' : '', queued.has(id) ? 'queued' : ''].filter(Boolean).join(' ');
      const card = h('div', cls);
      card.style.setProperty('--el', ELEMENT_COLOR[m.element]);
      const meta = h('div', 'mc-meta');
      meta.append(h('span', 'mc-type', ELEMENT_LABEL[lang][m.element]), h('span', 'mc-cost', String(m.cost)));
      const dmg = Math.round(m.power * def.dmgMult);
      const desc = h('div', 'mc-desc', MOVE_DESC[id][lang].replace('{d}', String(dmg)));
      card.append(h('div', 'mc-name', m.name[lang]), meta, desc);
      card.title = `${desc.textContent} (${lang === 'it' ? m.name.en : m.name.it})`;
      this.moves.append(card);
    });
    const uni = h('div', `move-card universal${c.stamina >= DODGE_COST ? '' : ' poor'}`);
    uni.append(h('div', 'mc-desc', t('universal')));
    this.moves.append(uni);
  }

  // ------------------------------------------------------------ voice feedback

  setTranscript(text: string, final = false, matched = true) {
    this.transcript.textContent = text ? `“${text}”` : '';
    this.transcript.className = `transcript${final ? (matched ? ' final' : ' nomatch') : ''}`;
    window.clearTimeout(this.transcriptTimer);
    if (final) this.transcriptTimer = window.setTimeout(() => this.setTranscript(''), 2500);
  }

  setMic(s: MicStatus) {
    const label = { on: t('micOn'), off: t('micOff'), denied: t('micDenied'), unsupported: t('micUnsupported'), starting: '…' }[s];
    this.mic.className = `mic mic-${s}`;
    this.mic.innerHTML = '';
    this.mic.append(h('span', 'mic-dot'), h('span', 'mic-label', label));
  }

  setHint(text: string) {
    if (!this.transcript.textContent) {
      this.transcript.textContent = text;
      this.transcript.className = 'transcript hint';
    }
  }

  // ------------------------------------------------------------ toasts / floats

  toast(text: string, kind: ToastKind = 'info', ms = 2400) {
    const el = h('div', `toast toast-${kind}`, text);
    this.toasts.prepend(el);
    while (this.toasts.children.length > 5) this.toasts.lastElementChild!.remove();
    window.setTimeout(() => el.classList.add('out'), ms);
    window.setTimeout(() => el.remove(), ms + 400);
  }

  float(text: string, x: number, y: number, color: string, big = false) {
    const el = h('div', `float${big ? ' big' : ''}`, text);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    this.floats.append(el);
    window.setTimeout(() => el.remove(), 1100);
  }

  clearToasts() {
    this.toasts.innerHTML = '';
  }
}
