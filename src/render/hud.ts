// DOM HUD overlay: creature panels, queue chips, move reference, transcript, mic status, toasts, floating numbers.

import { ELEMENT_COLOR, ELEMENT_LABEL, getLang, t } from '../i18n';
import { ALERT_COST, DODGE_COST, MOVES, SPECIES, STAMINA_MAX, TICK_HZ } from '../sim/data';
import { MOVE_DESC } from '../movedesc';
import { usesLeft } from '../sim/sim';
import type { Boost, CreatureState, PlayerIdx, QAction, SimState, TrainerState } from '../sim/types';

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
  private cmds = h('div', 'cmds');
  private cmdLabel = h('div', 'queue-label');
  private cmdKey = '';
  private energy = h('div', 'energy-gauge');
  private energyFill = h('div', 'eg-fill');
  private energyVal = h('div', 'eg-val');
  private energyTicks = h('div', 'eg-ticks');
  private energyLabel = h('div', 'eg-label');
  private energyKey = '';
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
  /** Verbal boosts: calibration prompt (above the move-choice panel too) and the FULL POWER cooldown chip. */
  private calEl = h('div', 'voice-cal hidden');
  private calKey = '';
  private calTimer = 0;
  private fpChip = h('div', 'fp-chip hidden');
  private fpKey = '';
  /** Side list of special words (creature name now, encouragements later); a word lights green when it took effect. */
  private wordsBox = h('div', 'words-box');
  private wordsLabel = h('div', 'words-label');
  private nameWord = h('div', 'word');
  private nameTimer = 0;

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
    this.cmdLabel.textContent = t('commands');
    this.energyLabel.textContent = t('energy');
    this.wordsLabel.textContent = t('words');
    this.cmdKey = this.energyKey = '#stale';
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
    voice.append(this.mic, this.transcript, qlabel, this.queue, this.cmdLabel, this.cmds, this.fpChip);
    document.body.append(this.calEl);
    const track = h('div', 'eg-track');
    track.append(this.energyFill, this.energyTicks);
    this.energy.append(this.energyLabel, track, this.energyVal);
    root.append(this.energy);
    this.wordsLabel.textContent = t('words');
    this.wordsBox.append(this.wordsLabel, this.nameWord);
    root.append(this.wordsBox);
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
    this.updateCommands(mine);
    this.updateEnergy(mine);
    const name = SPECIES[mine.team[mine.active]!.species].name;
    if (this.nameWord.textContent !== name) this.nameWord.textContent = name;
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
    if (a.kind === 'dodge') return t(a.dir === -1 ? 'chipDodgeLeft' : a.dir === 1 ? 'chipDodgeRight' : 'chipDodge');
    if (a.kind === 'alert') return t('chipAlert');
    return t('chipBack');
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

  /** Big vertical energy (stamina) gauge on the left, with a tick at each move's cost. */
  private updateEnergy(tr: TrainerState) {
    const c = tr.team[tr.active]!;
    const pct = (c.stamina / STAMINA_MAX) * 100;
    this.energyFill.style.height = `${pct}%`;
    this.energyVal.textContent = String(Math.floor(c.stamina));
    this.energy.classList.toggle('low', c.stamina < DODGE_COST);
    this.energy.classList.toggle('paused', c.regenPause > 0);
    this.energy.classList.toggle('slowed', c.staticTicks > 0);
    const key = `${c.species}|${getLang()}|${c.moves.join()}`;
    if (key === this.energyKey) return;
    this.energyKey = key;
    this.energyTicks.innerHTML = '';
    const costs = [...new Set([DODGE_COST, ALERT_COST, ...c.moves.map((m) => MOVES[m].cost)])];
    for (const cost of costs) {
      const tick = h('div', 'eg-tick');
      tick.style.bottom = `${(cost / STAMINA_MAX) * 100}%`;
      tick.append(h('span', '', String(cost)));
      this.energyTicks.append(tick);
    }
  }

  /** Always-visible general commands, greyed out when they can't be used right now. */
  private updateCommands(tr: TrainerState) {
    const c = tr.team[tr.active]!;
    const bench = tr.team.findIndex((x, i) => i !== tr.active && !x.fainted);
    const benchName = bench >= 0 ? SPECIES[tr.team[bench]!.species].name : '';
    const busy = !!tr.action || tr.queue.length > 0;
    const armed = tr.dodgeReady > 0;
    const items: { label: string; ok: boolean; why?: string; cost?: number; info?: boolean; armed?: boolean }[] = [
      { label: t('cmdDodge'), cost: DODGE_COST, ok: c.rootTicks === 0 && c.stamina >= DODGE_COST, why: c.rootTicks > 0 ? t('whyRooted') : t('whyStamina'), armed },
      { label: t('cmdAlert'), cost: ALERT_COST, ok: c.stamina >= ALERT_COST || tr.alertTicks > 0, why: t('whyStamina'), armed: tr.alertTicks > 0 },
      { label: bench >= 0 ? `${t('cmdBack')} / ${t('cmdGo', { name: benchName })}` : t('cmdBack'), ok: bench >= 0, why: t('whyNoBench') },
      { label: t('cmdStop'), ok: busy, why: t('whyEmpty') },
      { label: t('cmdChain'), ok: true, info: true },
    ];
    const key = items.map((i) => `${i.label}:${i.ok}:${i.armed}`).join('|');
    if (key === this.cmdKey) return;
    this.cmdKey = key;
    this.cmds.innerHTML = '';
    for (const i of items) {
      const chip = h('span', `cmd${i.ok ? '' : ' off'}${i.info ? ' info' : ''}${i.armed ? ' armed' : ''}`, i.label);
      if (i.cost) chip.append(h('span', 'cmd-cost', `${i.cost}`));
      if (!i.ok && i.why) chip.title = i.why;
      else if (i.armed && i.label === t('cmdDodge')) chip.title = t('whyArmed');
      this.cmds.append(chip);
    }
  }

  /** Red pulse on the energy gauge (e.g. a move failed for lack of stamina). */
  flashEnergy() {
    this.energy.classList.remove('flash');
    void this.energy.offsetWidth;
    this.energy.classList.add('flash');
  }

  /** Bottom move bar: one card per move with name, type, stamina cost and what it does. */
  private updateMoves(tr: TrainerState) {
    const c = tr.team[tr.active]!;
    const def = SPECIES[c.species];
    const lang = getLang();
    const left = c.moves.map((m) => usesLeft(c, m));
    const affordable = c.moves.map((m, i) => c.stamina >= MOVES[m].cost && left[i]! > 0);
    const current = tr.action?.action.kind === 'move' ? tr.action.action.move : null;
    const queued = new Set(tr.queue.flatMap((a) => (a.kind === 'move' ? [a.move] : [])));
    const key = `${c.species}|${c.moves.join()}|${lang}|${affordable.join()}|${left.join()}|${c.stamina >= DODGE_COST}|${current}|${[...queued].join()}`;
    if (key === this.movesKey) return;
    this.movesKey = key;
    this.moves.innerHTML = '';
    c.moves.forEach((id, i) => {
      const m = MOVES[id];
      const cls = ['move-card', affordable[i] || id === current ? '' : 'poor', id === current ? 'current' : '', queued.has(id) ? 'queued' : ''].filter(Boolean).join(' ');
      const card = h('div', cls);
      card.style.setProperty('--el', ELEMENT_COLOR[m.element]);
      const meta = h('div', 'mc-meta');
      meta.append(h('span', 'mc-type', ELEMENT_LABEL[lang][m.element]));
      if (m.quick) meta.append(h('span', 'mc-quick', t('quickTag')));
      if (m.delivery !== 'self') {
        const acc = h('span', 'mc-acc', `${m.accuracy}%`);
        acc.title = t('accuracyTip', { n: m.accuracy });
        meta.append(acc);
      }
      const uses = h('span', `mc-uses${left[i]! <= 0 ? ' out' : ''}`, `${left[i]}/${m.uses}`);
      uses.title = t('usesTip', { n: left[i]!, max: m.uses! });
      meta.append(uses, h('span', 'mc-cost', String(m.cost)));
      const dmg = Math.round(m.power * def.dmgMult);
      const desc = h('div', 'mc-desc', MOVE_DESC[id][lang].replace('{d}', String(dmg)));
      card.append(h('div', 'mc-name', m.name[lang]), meta, desc);
      card.title = `${desc.textContent} (${lang === 'it' ? m.name.en : m.name.it})`;
      this.moves.append(card);
    });

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

  // ------------------------------------------------------------ verbal boosts

  /** `cal` null = mic not running (no boosts): both hidden. `fpTicks` = FULL POWER cooldown left. */
  setVoice(cal: { count: number; total: number } | null, fpTicks: number) {
    const done = !!cal && cal.count >= cal.total;
    const calKey = cal ? `${cal.count}/${cal.total}|${getLang()}` : '';
    if (calKey !== this.calKey) {
      const was = this.calKey;
      this.calKey = calKey;
      window.clearTimeout(this.calTimer);
      this.calEl.innerHTML = '';
      if (!cal) this.calEl.classList.add('hidden');
      else if (!done) {
        this.calEl.className = 'voice-cal';
        const dots = h('span', 'vc-dots');
        for (let i = 0; i < cal.total; i++) dots.append(h('span', i < cal.count ? 'on' : ''));
        this.calEl.append(h('span', '', `🎤 ${t('voiceCalibrating', { n: cal.total })}`), dots);
      } else if (was && !was.startsWith(`${cal.total}/`)) {
        // just finished: confirm for a moment
        this.calEl.className = 'voice-cal done';
        this.calEl.append(h('span', '', `✓ ${t('voiceCalibrated')}`));
        this.calTimer = window.setTimeout(() => this.calEl.classList.add('hidden'), 3000);
      } else this.calEl.classList.add('hidden');
    }
    const secs = Math.ceil(fpTicks / TICK_HZ);
    const fpKey = cal && done ? `${secs}|${getLang()}` : '';
    if (fpKey === this.fpKey) return;
    this.fpKey = fpKey;
    this.fpChip.className = `fp-chip${!fpKey ? ' hidden' : secs > 0 ? ' sleeping' : ''}`;
    this.fpChip.textContent = secs > 0 ? `💤 ${t('fullPowerName')} ZZZ… ${secs}s` : `⚡ ${t('fullPowerName')}`;
  }

  /** The creature name was said before a move that just started: light it green for a moment. */
  nameSaid() {
    this.nameWord.classList.add('said');
    window.clearTimeout(this.nameTimer);
    this.nameTimer = window.setTimeout(() => this.nameWord.classList.remove('said'), 1500);
  }

  /** Just-Dance-style word burst over a creature when a verbal boost lands. */
  boostFlash(kind: Boost, x: number, y: number) {
    const el = h('div', `boost-flash bf-${kind}`);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.append(h('div', 'bf-fx'), h('div', 'bf-word', t(kind === 'snap' ? 'boostSnap' : kind === 'hype' ? 'boostHype' : 'boostFull')));
    this.floats.append(el);
    window.setTimeout(() => el.remove(), kind === 'full' ? 1300 : 1000);
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
