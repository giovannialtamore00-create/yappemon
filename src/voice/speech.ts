// Web Speech API wrapper: continuous recognition with auto-restart. Only final results drive
// the game; interim results are shown live in the HUD.

import type { Lang } from '../sim/types';

export type SpeechStatus = 'on' | 'off' | 'denied' | 'unsupported' | 'starting';

interface RecAlternative { transcript: string; confidence: number }
interface RecResult { isFinal: boolean; length: number; [i: number]: RecAlternative }
interface RecEvent { resultIndex: number; results: { length: number; [i: number]: RecResult } }
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Chrome and Edge (desktop or Android) are the browsers where recognition actually works. */
export function isSupportedBrowser(): boolean {
  if (!getCtor()) return false;
  const ua = navigator.userAgent;
  const brands = (navigator as unknown as { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands?.map((b) => b.brand) ?? [];
  if (brands.some((b) => /Brave|Opera/i.test(b)) || /OPR\/|Brave/i.test(ua)) return false;
  return brands.some((b) => /Google Chrome|Microsoft Edge|Chromium/i.test(b)) || /Chrome\/|Edg\//.test(ua);
}

export const SPEECH_LANG: Record<Lang, string> = { en: 'en-US', it: 'it-IT' };

export class Speech {
  readonly available = getCtor() !== null;
  private rec: Recognition | null = null;
  private wanted = false;
  private lang = 'en-US';
  private restartTimer = 0;
  private failures = 0;
  status: SpeechStatus = this.available ? 'off' : 'unsupported';

  onInterim: (text: string) => void = () => {};
  /** Final result with all recognizer alternatives, best first. */
  onFinal: (alternatives: string[]) => void = () => {};
  onStatus: (s: SpeechStatus) => void = () => {};

  start(lang: Lang) {
    if (!this.available) return this.setStatus('unsupported');
    this.lang = SPEECH_LANG[lang];
    this.wanted = true;
    this.failures = 0;
    this.spawn();
  }

  stop() {
    this.wanted = false;
    window.clearTimeout(this.restartTimer);
    const r = this.rec;
    this.rec = null;
    if (r) {
      r.onend = null;
      try { r.abort(); } catch { /* already stopped */ }
    }
    if (this.status !== 'denied' && this.status !== 'unsupported') this.setStatus('off');
  }

  private setStatus(s: SpeechStatus) {
    this.status = s;
    this.onStatus(s);
  }

  private spawn() {
    const Ctor = getCtor();
    if (!Ctor || !this.wanted) return;
    const r = new Ctor();
    r.lang = this.lang;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 4;
    r.onstart = () => { this.failures = 0; this.setStatus('on'); };
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        if (res.isFinal) {
          const alts: string[] = [];
          for (let a = 0; a < res.length; a++) if (res[a]?.transcript.trim()) alts.push(res[a]!.transcript.trim());
          if (alts.length) this.onFinal(alts);
        } else {
          interim += res[0]?.transcript ?? '';
        }
      }
      if (interim.trim()) this.onInterim(interim.trim());
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.wanted = false;
        this.setStatus('denied');
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        this.failures++;
      }
    };
    r.onend = () => {
      if (this.rec !== r) return;
      this.rec = null;
      if (!this.wanted) return this.setStatus(this.status === 'denied' ? 'denied' : 'off');
      // Chrome ends continuous sessions periodically; restart, backing off on repeated errors.
      this.setStatus('starting');
      const delay = Math.min(3000, 150 * 2 ** Math.min(this.failures, 4));
      this.restartTimer = window.setTimeout(() => this.spawn(), delay);
    };
    this.rec = r;
    this.setStatus('starting');
    try {
      r.start();
    } catch {
      this.failures++;
      this.restartTimer = window.setTimeout(() => this.spawn(), 500);
    }
  }
}
