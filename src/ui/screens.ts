// Click-driven menus: lobby, room code, team select, forced switch, end screen, disconnect.

import { ELEMENT_COLOR, ELEMENT_LABEL, getLang, t } from '../i18n';
import { MOVES, SPECIES, SPECIES_IDS } from '../sim/data';
import type { Lang, SpeciesId } from '../sim/types';

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

function button(label: string, onClick: () => void, cls = 'btn'): HTMLButtonElement {
  const b = h('button', cls, label);
  b.addEventListener('click', () => { onUiClick(); onClick(); });
  return b;
}

/** Hook for UI click sounds (set by main). */
export let onUiClick: () => void = () => {};
export const setUiClickHandler = (f: () => void) => { onUiClick = f; };

export class Screens {
  constructor(private root: HTMLElement) {}

  clear() {
    this.root.innerHTML = '';
  }

  private overlay(cls = ''): HTMLElement {
    this.clear();
    const o = h('div', `screen ${cls}`);
    this.root.append(o);
    return o;
  }

  // ------------------------------------------------------------ lobby

  lobby(o: {
    lang: Lang; voiceSupported: boolean;
    onLang(l: Lang): void; onPractice(): void; onHost(): void; onJoin(code: string): void;
  }) {
    const s = this.overlay('lobby');
    const card = h('div', 'card lobby-card');
    const logo = h('h1', 'logo', 'YAPPEMON');
    const tag = h('p', 'tagline', t('tagline'));
    const langRow = h('div', 'lang-row');
    langRow.append(h('span', 'label', t('language')));
    for (const [l, label] of [['en', 'English'], ['it', 'Italiano']] as const) {
      const b = button(label, () => o.onLang(l), `btn toggle${o.lang === l ? ' on' : ''}`);
      langRow.append(b);
    }
    const actions = h('div', 'lobby-actions');
    actions.append(button(t('practice'), o.onPractice, 'btn big primary'), button(t('host'), o.onHost, 'btn big'));
    const joinRow = h('div', 'join-row');
    const input = h('input', 'code-input') as HTMLInputElement;
    input.placeholder = t('joinCode');
    input.maxLength = 5;
    input.autocapitalize = 'characters';
    input.addEventListener('input', () => { input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    const join = () => {
      if (input.value.length !== 5) { input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); return; }
      o.onJoin(input.value);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
    joinRow.append(input, button(t('joinGo'), join, 'btn big'));
    card.append(logo, tag, langRow, actions, h('div', 'or', t('join')), joinRow);
    const how = h('details', 'howto');
    how.append(h('summary', '', t('howTo')), h('p', '', t('howToBody')));
    card.append(how);
    if (!o.voiceSupported) card.append(h('div', 'warn', t('browserWarn')));
    s.append(card);
  }

  hosting(code: string, onCancel: () => void) {
    const s = this.overlay();
    const card = h('div', 'card');
    card.append(h('div', 'label', t('yourCode')));
    const codeEl = h('div', 'room-code', code);
    const copy = button(t('copy'), () => {
      navigator.clipboard?.writeText(code).then(() => { copy.textContent = t('copied'); }).catch(() => {});
    });
    card.append(codeEl, copy, h('p', 'muted pulse', t('waitingFriend')), button(t('back'), onCancel, 'btn ghost'));
    s.append(card);
  }

  message(text: string, onBack?: () => void, cls = '') {
    const s = this.overlay();
    const card = h('div', `card ${cls}`);
    card.append(h('p', 'big-msg', text));
    if (onBack) card.append(button(t('toLobby'), onBack, 'btn'));
    s.append(card);
  }

  // ------------------------------------------------------------ team select

  teamSelect(o: { subtitle?: string; onHover(sp: SpeciesId | null): void; onReady(team: SpeciesId[]): void }) {
    const s = this.overlay('team');
    const lang = getLang();
    const head = h('div', 'team-head');
    head.append(h('h2', '', t('teamSelect')), h('p', 'muted', t('teamHint')));
    if (o.subtitle) head.append(h('p', 'muted', o.subtitle));
    const grid = h('div', 'team-grid');
    const picks: SpeciesId[] = [];
    const ready = button(t('ready'), () => { if (picks.length === 2) { ready.disabled = true; o.onReady([...picks]); } }, 'btn big primary');
    ready.disabled = true;
    const cards = new Map<SpeciesId, HTMLElement>();
    const refresh = () => {
      for (const [sp, c] of cards) {
        const i = picks.indexOf(sp);
        c.classList.toggle('picked', i >= 0);
        c.querySelector('.pick-num')!.textContent = i >= 0 ? String(i + 1) : '';
      }
      ready.disabled = picks.length !== 2;
    };
    for (const sp of SPECIES_IDS) {
      const d = SPECIES[sp];
      const c = h('div', 'creature-card');
      c.style.setProperty('--el', ELEMENT_COLOR[d.element]);
      const top = h('div', 'cc-top');
      const badge = h('span', 'badge', ELEMENT_LABEL[lang][d.element]);
      badge.style.background = ELEMENT_COLOR[d.element];
      top.append(h('span', 'cc-name', d.name), badge, h('span', 'pick-num'));
      const stats = h('div', 'cc-stats', `HP ${d.maxHp} · ${speedLabel(d.speed, lang)}`);
      const ml = h('ul', 'cc-moves');
      for (const m of d.moves) {
        const li = h('li');
        const dot = h('span', 'el-dot');
        dot.style.background = ELEMENT_COLOR[MOVES[m].element];
        li.append(dot, h('span', '', MOVES[m].name[lang]), h('span', 'move-cost', String(MOVES[m].cost)));
        ml.append(li);
      }
      c.append(top, stats, ml);
      c.addEventListener('mouseenter', () => o.onHover(sp));
      c.addEventListener('mouseleave', () => o.onHover(picks[picks.length - 1] ?? null));
      c.addEventListener('click', () => {
        onUiClick();
        const i = picks.indexOf(sp);
        if (i >= 0) picks.splice(i, 1);
        else if (picks.length < 2) picks.push(sp);
        else { picks.shift(); picks.push(sp); }
        refresh();
        o.onHover(sp);
      });
      cards.set(sp, c);
      grid.append(c);
    }
    s.append(head, grid, ready);
    return {
      setWaiting() {
        ready.textContent = t('waitingOpponent');
        ready.disabled = true;
        grid.classList.add('locked');
      },
    };
  }

  // ------------------------------------------------------------ forced switch

  switchPrompt(o: { team: { species: SpeciesId; fainted: boolean; hp: number; maxHp: number }[]; seconds: number; onPick(slot: 0 | 1): void }) {
    const s = this.overlay('switch');
    const card = h('div', 'card');
    card.append(h('h2', '', t('switchTitle')), h('p', 'muted', t('switchHint')));
    const row = h('div', 'switch-row');
    o.team.forEach((c, i) => {
      const b = button(`${i + 1}. ${SPECIES[c.species].name}  (${Math.ceil(c.hp)}/${c.maxHp})`, () => o.onPick(i as 0 | 1), 'btn big');
      b.disabled = c.fainted;
      row.append(b);
    });
    const timer = h('p', 'muted', t('autoIn', { s: o.seconds }));
    card.append(row, timer);
    s.append(card);
    let left = o.seconds;
    const iv = window.setInterval(() => {
      left = Math.max(0, left - 1);
      timer.textContent = t('autoIn', { s: left });
    }, 1000);
    return { close: () => { window.clearInterval(iv); if (s.isConnected) this.clear(); } };
  }

  // ------------------------------------------------------------ end screen

  end(o: { result: 'victory' | 'defeat' | 'draw'; onRematch(): void; onQuit(): void; rematchLabel?: string }) {
    const s = this.overlay(`end end-${o.result}`);
    const card = h('div', 'card');
    card.append(h('h1', 'end-title', t(o.result)));
    const status = h('p', 'muted');
    const rematch = button(o.rematchLabel ?? t('rematch'), () => { rematch.disabled = true; o.onRematch(); }, 'btn big primary');
    const row = h('div', 'end-row');
    row.append(rematch, button(t('quit'), o.onQuit, 'btn big ghost'));
    card.append(status, row);
    s.append(card);
    return { setStatus: (text: string) => { status.textContent = text; } };
  }
}

function speedLabel(s: 'slow' | 'medium' | 'fast', lang: Lang) {
  const en = { slow: 'Slow', medium: 'Medium speed', fast: 'Fast' };
  const it = { slow: 'Lento', medium: 'Velocità media', fast: 'Veloce' };
  return (lang === 'it' ? it : en)[s];
}
