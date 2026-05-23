/* ─── Voice narration via Web Speech Synthesis ───
 * Used by the executor (per-step narration) and by big confirm modals.
 *
 * Mute state lives in zustand (useAppStore.speechMuted) — this module is
 * the side-effecting glue layer that the rest of the app calls into. */

let voiceCache: SpeechSynthesisVoice | null = null;

/** Prefer Singapore-flavoured English, fallback through GB → US → first available. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  if (voiceCache) return voiceCache;

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const preferences = ['en-SG', 'en-GB', 'en-AU', 'en-US', 'en'];
  for (const lang of preferences) {
    const found = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
    if (found) {
      voiceCache = found;
      return found;
    }
  }
  voiceCache = voices[0] ?? null;
  return voiceCache;
}

/* Voices load asynchronously in Chrome — refresh cache when ready. */
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    voiceCache = null;
    pickVoice();
  };
  // try once immediately too (Safari has them ready synchronously)
  pickVoice();
}

let lastSpoken = '';

/** Speak a line. No-op if muted or unsupported. */
export function speak(text: string, opts: { muted: boolean; interrupt?: boolean } = { muted: false }) {
  if (opts.muted) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const clean = (text || '').trim();
  if (clean.length < 2) return;

  // Avoid double-speaking the same line (executor often re-triggers narration
  // on highlight changes etc).
  if (!opts.interrupt && clean === lastSpoken && window.speechSynthesis.speaking) return;

  if (opts.interrupt || window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }

  const utter = new SpeechSynthesisUtterance(clean);
  const voice = pickVoice();
  if (voice) utter.voice = voice;
  utter.rate = 0.92; // a touch slower for elderly listeners
  utter.pitch = 1.0;
  utter.volume = 1.0;
  utter.onend = () => {
    if (lastSpoken === clean) lastSpoken = '';
  };

  lastSpoken = clean;
  window.speechSynthesis.speak(utter);
}

/** Stop any ongoing speech immediately. */
export function stopSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    lastSpoken = '';
  }
}

/** Feature-detect availability — used by UI to hide the mute button if not supported. */
export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
