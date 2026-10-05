// Developer panel for tuning verbal boosts (?prosody=1): live loudness/pitch and per-utterance scores.

import { MicProsody } from '../voice/mic';
import { PROSODY, type Utterance } from '../voice/prosody';

const LABEL = { snap: ['SNAP!', '#ffd23f'], hype: ['HYPE!', '#ff6a2b'], full: ['FULL POWER!', '#b46bff'] } as const;

export function mountProsodyDebug(mic = new MicProsody()) {
  const box = document.createElement('div');
  box.id = 'prosody-debug';
  box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;width:340px;max-width:calc(100vw - 16px);'
    + 'background:rgba(10,12,20,.88);color:#dde;font:12px/1.4 monospace;padding:8px;border-radius:8px;pointer-events:auto';
  const btn = document.createElement('button');
  btn.textContent = '🎤 Start voice analysis';
  const live = document.createElement('div');
  const bar = document.createElement('div');
  bar.style.cssText = 'height:6px;background:#334;margin:4px 0;border-radius:3px;overflow:hidden';
  const fill = document.createElement('div');
  fill.style.cssText = 'height:100%;width:0;background:#6c6';
  bar.append(fill);
  const log = document.createElement('div');
  box.append(btn, bar, live, log);
  document.body.append(box);

  const rows: string[] = [];
  const fmt = (x: number, d = 0) => (Number.isFinite(x) ? x.toFixed(d) : '–');
  mic.onUtterance = (u: Utterance) => {
    const s = u.scores;
    const tags = (Object.keys(LABEL) as (keyof typeof LABEL)[]).filter((k) => u.boosts[k])
      .map((k) => `<b style="color:${LABEL[k][1]}">${LABEL[k][0]}</b>`).join(' ');
    rows.unshift(`<div>${u.calibrated ? '' : '(calibrating) '}attack ${s.attackMs}ms · loud ${fmt(s.loudDb, 1)}dB · `
      + `pitch ${fmt(s.pitchSemis, 1)}st · held ${s.longestVoicedS.toFixed(2)}s ${tags}</div>`);
    rows.length = Math.min(rows.length, 8);
    log.innerHTML = rows.join('');
  };

  let raf = 0;
  const tick = () => {
    const a = mic.analyzer;
    if (a) {
      const { db, hz, speaking } = a.live;
      fill.style.width = `${Math.max(0, Math.min(100, (db + 70) * 1.6))}%`;
      fill.style.background = speaking ? '#6c6' : '#557';
      live.textContent = `${fmt(db)} dB · ${hz ? hz.toFixed(0) + ' Hz' : 'unvoiced'} · `
        + (a.calibrated ? 'calibrated' : `calibrating ${a.calibrationCount}/${PROSODY.calibrationUtterances}: say a few words normally`);
    }
    raf = requestAnimationFrame(tick);
  };

  btn.addEventListener('click', async () => {
    if (mic.running) {
      mic.stop();
      cancelAnimationFrame(raf);
      btn.textContent = '🎤 Start voice analysis';
      return;
    }
    try {
      await mic.start();
      btn.textContent = '⏹ Stop';
      tick();
    } catch (e) {
      live.textContent = `Mic error: ${(e as Error).message}`;
    }
  });
  return mic;
}
