// Click-driven menus: lobby, room code, team select, forced switch, end screen, disconnect.

import { ELEMENT_COLOR, ELEMENT_LABEL, getLang, t, typeBadge } from '../i18n';
import { LOADOUT_SIZE, MOVES, SPECIES, SPECIES_IDS, evolutionLine } from '../sim/data';
import type { BaseSpeciesId, Lang, MoveId, SpeciesId } from '../sim/types';
import { MOVE_DESC } from '../movedesc';
import { NAME_MAX, cleanWord, myCreature, myMove } from '../names';
import type { TeamNames } from '../names';

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
    onLang(l: Lang): void; onPractice(): void; onHost(): void; onHostSpectate(): void; onJoin(code: string): void;
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
    actions.append(button(t('practice'), o.onPractice, 'btn big primary'), button(t('host'), o.onHost, 'btn big'), button(t('hostSpectate'), o.onHostSpectate, 'btn big'));
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

  hosting(code: string, onCancel: () => void, status = t('waitingFriend')) {
    const s = this.overlay();
    const card = h('div', 'card');
    card.append(h('div', 'label', t('yourCode')));
    const codeEl = h('div', 'room-code', code);
    const copy = button(t('copy'), () => {
      navigator.clipboard?.writeText(code).then(() => { copy.textContent = t('copied'); }).catch(() => {});
    });
    const st = h('p', 'muted pulse', status);
    card.append(codeEl, copy, st, button(t('back'), onCancel, 'btn ghost'));
    s.append(card);
    return { setStatus: (text: string) => { st.textContent = text; } };
  }

  /** Before a match: name the creatures and the first word of their moves. Empty field = original name. */
  rename(o: { team: BaseSpeciesId[]; onDone(n: TeamNames): void }) {
    const s = this.overlay('rename');
    const lang = getLang();
    const card = h('div', 'card rename-card');
    card.append(h('h2', '', t('renameTitle')), h('p', 'muted', t('renameHint', { n: NAME_MAX })));
    const field = (placeholder: string) => {
      const i = h('input', 'name-input');
      i.type = 'text';
      i.maxLength = NAME_MAX;
      i.placeholder = placeholder;
      i.autocomplete = 'off';
      return i;
    };
    const creatures: [BaseSpeciesId, HTMLInputElement][] = [];
    const moves: [MoveId, HTMLInputElement][] = [];
    card.append(h('h3', '', t('renameCreatures')));
    const crow = h('div', 'rename-row');
    for (const sp of o.team) {
      const i = field(SPECIES[sp].name);
      creatures.push([sp, i]);
      crow.append(i);
    }
    card.append(crow, h('h3', '', t('renameMoves')));
    const seen = new Set<MoveId>();
    for (const sp of o.team) {
      const col = h('div', 'rename-moves');
      for (const m of SPECIES[sp].moves) {
        if (seen.has(m)) continue;
        seen.add(m);
        const full = MOVES[m].name[lang];
        const i = field(full.split(' ')[0]!);
        moves.push([m, i]);
        const row = h('label', 'rename-move');
        row.append(i, h('span', 'muted', full.split(' ').slice(1).join(' ')));
        col.append(row);
      }
      card.append(col);
    }
    const err = h('p', 'rename-err');
    const done = button(t('renameOk'), () => {
      const out: TeamNames = { creatures: {}, moves: {} };
      const taken = new Set<string>();
      for (const sp of SPECIES_IDS) taken.add(SPECIES[sp].name.toLowerCase());
      const used = new Set<string>();
      for (const [sp, i] of creatures) {
        const w = cleanWord(i.value);
        if (!w) continue;
        const k = w.toLowerCase();
        const own = SPECIES[sp].name.toLowerCase();
        if (used.has(k) || (taken.has(k) && k !== own)) { err.textContent = t('renameClash'); return; }
        used.add(k);
        out.creatures[sp] = w;
      }
      for (const [m, i] of moves) {
        const w = cleanWord(i.value);
        if (w) out.moves[m] = w;
      }
      o.onDone(out);
    }, 'btn big primary');
    const keep = button(t('renameKeep'), () => o.onDone({ creatures: {}, moves: {} }), 'btn ghost');
    const row = h('div', 'end-row');
    row.append(done, keep);
    card.append(err, row);
    s.append(card);
    creatures[0]?.[1].focus();
  }

  /** Before a match: read a few words in a normal voice so verbal boosts know the player's usual voice. */
  voiceCheck(o: { words: string[]; total: number; onSkip(): void }) {
    const s = this.overlay();
    const card = h('div', 'card voice-check');
    card.append(h('h2', '', `🎤 ${t('voiceCheckTitle')}`), h('p', 'muted', t('voiceCheckText', { n: o.total })));
    const words = h('div', 'vcheck-words');
    for (const w of o.words) words.append(h('span', 'vcheck-word', w));
    const dots = h('div', 'vc-dots vcheck-dots');
    const dotEls = Array.from({ length: o.total }, () => dots.appendChild(h('span')));
    const heard = h('p', 'vcheck-heard muted', ' ');
    const status = h('p', 'vcheck-status', t('voiceCheckStarting'));
    const skip = button(t('voiceCheckSkip'), o.onSkip, 'btn ghost');
    card.append(words, dots, heard, status, skip);
    s.append(card);
    return {
      setProgress: (n: number) => {
        dotEls.forEach((d, i) => d.classList.toggle('on', i < n));
        status.textContent = n >= o.total ? `✓ ${t('voiceCalibrated')}` : t('voiceCheckListening');
        status.classList.toggle('done', n >= o.total);
      },
      setHeard: (text: string) => { heard.textContent = text ? `“${text}”` : ' '; },
      setStatus: (text: string) => { status.textContent = text; },
    };
  }

  message(text: string, onBack?: () => void, cls = '') {
    const s = this.overlay();
    const card = h('div', `card ${cls}`);
    card.append(h('p', 'big-msg', text));
    if (onBack) card.append(button(t('toLobby'), onBack, 'btn'));
    s.append(card);
  }

  // ------------------------------------------------------------ team select

  teamSelect(o: { subtitle?: string; onHover(sp: BaseSpeciesId | null): void; onReady(team: BaseSpeciesId[]): void }) {
    const s = this.overlay('team');
    const lang = getLang();
    const head = h('div', 'team-head');
    head.append(h('h2', '', t('teamSelect')), h('p', 'muted', t('teamHint')), h('p', 'muted', t('bestOf3')));
    if (o.subtitle) head.append(h('p', 'muted', o.subtitle));
    const grid = h('div', 'team-grid');
    const picks: BaseSpeciesId[] = [];
    const ready = button(t('ready'), () => { if (picks.length === 2) { ready.disabled = true; o.onReady([...picks]); } }, 'btn big primary');
    ready.disabled = true;
    const cards = new Map<BaseSpeciesId, HTMLElement>();
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
      const tb = typeBadge(d, lang);
      const badge = h('span', 'badge', tb.text);
      badge.style.background = tb.bg;
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
      const line = evolutionLine(sp).slice(1);
      const evo = h('div', 'cc-evo', t('evolvesTo', { chain: line.map((x) => SPECIES[x].name).join(' → ') }));
      const extra = h('ul', 'cc-moves cc-new');
      for (const x of line) {
        for (const id of SPECIES[x].moves.filter((mv) => MOVES[mv].species === x)) {
          const m = MOVES[id];
          const li = h('li');
          const dot = h('span', 'el-dot');
          dot.style.background = ELEMENT_COLOR[m.element];
          li.append(dot, h('span', '', `+ ${m.name[lang]}`), h('span', 'move-cost', String(m.cost)));
          extra.append(li);
        }
      }
      c.append(top, stats, ml, evo, extra);
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
      const b = button(`${i + 1}. ${myCreature(c.species)}  (${Math.ceil(c.hp)}/${c.maxHp})`, () => o.onPick(i as 0 | 1), 'btn big');
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

  // ------------------------------------------------------------ loadout (move choice before a round)

  /**
   * Pick LOADOUT_SIZE moves per creature from everything it has learned. Click a move in one list, then a move
   * in the other list to swap them. Every change is reported with `onChange` (the sim keeps the last valid one).
   */
  loadout(o: {
    round: number; seconds: number; team: { species: SpeciesId; moves: MoveId[] }[];
    onChange(slot: number, moves: MoveId[]): void; onReady(): void;
  }) {
    const lang = getLang();
    const s = this.overlay('loadout');
    const card = h('div', 'card loadout-card');
    card.append(h('h2', '', t('loadoutTitle', { n: o.round })), h('p', 'muted', t('loadoutHint')));
    const cols = h('div', 'lo-cols');
    const picks = o.team.map((c) => [...c.moves]);
    let sel: { slot: number; move: MoveId } | null = null;
    let locked = false;

    const tile = (sp: SpeciesId, id: MoveId, onClick: () => void, selected: boolean) => {
      const m = MOVES[id];
      const def = SPECIES[sp];
      const b = h('button', `lo-move${selected ? ' sel' : ''}`);
      b.style.setProperty('--el', ELEMENT_COLOR[m.element]);
      const top = h('div', 'lo-top');
      top.append(h('span', 'lo-name', myMove(id, lang)));
      if (m.species === sp && def.stage > 1) top.append(h('span', 'lo-new', t('newTag')));
      const meta = h('div', 'mc-meta');
      meta.append(h('span', 'mc-type', ELEMENT_LABEL[lang][m.element]));
      if (m.quick) meta.append(h('span', 'mc-quick', t('quickTag')));
      if (m.delivery !== 'self') meta.append(h('span', 'mc-acc', `${m.accuracy}%`));
      meta.append(h('span', 'mc-cost', String(m.cost)));
      b.append(top, meta, h('div', 'lo-desc', MOVE_DESC[id][lang].replace('{d}', String(Math.round(m.power * def.dmgMult)))));
      b.title = m.name[lang === 'it' ? 'en' : 'it'];
      b.disabled = locked;
      b.addEventListener('click', () => { onUiClick(); onClick(); });
      return b;
    };

    const render = () => {
      cols.innerHTML = '';
      o.team.forEach((c, slot) => {
        const def = SPECIES[c.species];
        const col = h('div', 'lo-col');
        const head = h('div', 'lo-head');
        const tag = h('span', 'mc-type', typeBadge(def, lang).text);
        tag.style.setProperty('--el', ELEMENT_COLOR[def.element]);
        head.append(h('span', 'lo-creature', myCreature(c.species)), tag);
        const chosen = h('div', 'lo-grid');
        const pool = h('div', 'lo-grid pool');
        const rest = def.moves.filter((m) => !picks[slot]!.includes(m));
        const pick = (move: MoveId, inLoadout: boolean) => {
          if (sel && sel.slot === slot && sel.move !== move) {
            const selIn = picks[slot]!.includes(sel.move);
            if (selIn !== inLoadout) {
              // Swap: the pool move takes the loadout move's place.
              const out = inLoadout ? move : sel.move;
              const inn = inLoadout ? sel.move : move;
              picks[slot]![picks[slot]!.indexOf(out)] = inn;
              sel = null;
              o.onChange(slot, [...picks[slot]!]);
              return render();
            }
          }
          sel = sel && sel.slot === slot && sel.move === move ? null : { slot, move };
          render();
        };
        for (const m of picks[slot]!) chosen.append(tile(c.species, m, () => pick(m, true), sel?.slot === slot && sel.move === m));
        for (const m of rest) pool.append(tile(c.species, m, () => pick(m, false), sel?.slot === slot && sel.move === m));
        col.append(head, h('div', 'lo-label', `${t('loadoutChosen')} (${LOADOUT_SIZE})`), chosen, h('div', 'lo-label', t('loadoutPool')));
        col.append(rest.length ? pool : h('p', 'muted lo-empty', t('loadoutPoolEmpty')));
        if (sel?.slot === slot) col.append(h('p', 'lo-swap', t('loadoutSwap')));
        cols.append(col);
      });
    };
    render();

    const timer = h('p', 'muted', t('startsIn', { s: Math.ceil(o.seconds) }));
    const ready = button(t('readyBtn'), () => setReady(), 'btn big primary');
    const row = h('div', 'end-row');
    row.append(ready);
    card.append(cols, row, h('p', 'muted lo-say', t('sayReady')), timer);
    s.append(card);
    const setReady = () => {
      if (locked) return;
      locked = true;
      sel = null;
      ready.disabled = true;
      ready.textContent = t('readyWaiting');
      render();
      o.onReady();
    };
    let left = Math.ceil(o.seconds);
    const iv = window.setInterval(() => {
      left = Math.max(0, left - 1);
      timer.textContent = t('startsIn', { s: left });
    }, 1000);
    return {
      /** Voice "ready" goes through here too. */
      ready: setReady,
      close: () => { window.clearInterval(iv); if (s.isConnected) this.clear(); },
    };
  }

  // ------------------------------------------------------------ end screen

  end(o: { result: 'victory' | 'defeat' | 'draw'; onRematch(): void; onQuit(): void; rematchLabel?: string; title?: string }) {
    const s = this.overlay(`end end-${o.result}`);
    const card = h('div', 'card');
    card.append(h('h1', 'end-title', o.title ?? t(o.result)));
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
