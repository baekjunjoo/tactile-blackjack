/* speech.js — TTS (superdot 방식 이식)
   기기 내 가장 자연스러운 한국어 음성 자동 선별 (Edge 신경망 > Google > 프리미엄 > 기본)
   + 문장 언어 자동감지(한/영/일). 발화 속도는 prefs.ttsRate.
   skipCurrent(): 발화 스킵 설정 시 진행 중 발화 즉시 중단 */

import { getPrefs } from './prefs.js';

let enabled = true;
export function setSpeechEnabled(v) { enabled = !!v; }
export function isSpeechEnabled() { return enabled; }

const byLang = {};   // 언어별 선택 음성 캐시 (도중 교체 방지)

function allVoices() {
  try { return globalThis.speechSynthesis.getVoices() || []; } catch (_) { return []; }
}

/* superdot 점수: Edge Natural/Neural > Google > 프리미엄/Siri > online > 기본 */
function score(v) {
  const n = (v.name || '').toLowerCase();
  let s = 0;
  if (/natural|neural/.test(n)) s += 80;
  if (/google/.test(n)) s += 60;
  if (/premium|enhanced|siri|yuna|sora|suhyun/.test(n)) s += 50;
  if (/online/.test(n)) s += 5;
  if (v.default) s += 1;
  return s;
}

function detectLang(text) {
  const s = String(text || '');
  if (/[가-힣ᄀ-ᇿ]/.test(s)) return 'ko';   // 한글
  if (/[぀-ヿ]/.test(s)) return 'ja';             // 가나
  if (/[A-Za-z]/.test(s)) return 'en';                    // 라틴
  return 'ko';
}

function listForLang(code) {
  return allVoices().filter((v) => {
    const l = (v.lang || '').toLowerCase(), n = (v.name || '').toLowerCase();
    if (code === 'en') return /^en/.test(l) || /english/.test(n);
    if (code === 'ja') return /^ja/.test(l) || /japanese/.test(n);
    return /^ko/.test(l) || /korean|한국/.test(n);
  });
}

function pickVoice(code) {
  const list = listForLang(code);
  const cached = byLang[code];
  if (cached) { for (const v of list) if (v.name === cached.name) return cached; }
  let best = null;
  for (const v of list) if (!best || score(v) > score(best)) best = v;
  byLang[code] = best;
  return best;   // 없으면 null → 브라우저 기본 음성
}

/* 음성 목록은 비동기로 로드될 수 있음 → 갱신 시 캐시 초기화 */
try {
  const ss = globalThis.speechSynthesis;
  if (ss && ss.addEventListener) ss.addEventListener('voiceschanged', () => { byLang.ko = null; byLang.en = null; byLang.ja = null; });
} catch (_) {}

export function speak(txt) {
  if (!enabled) return;
  try {
    const ss = globalThis.speechSynthesis;
    if (!ss) return;
    ss.cancel();                       // 이전 발화 중단(스크린리더 관례)
    const u = new SpeechSynthesisUtterance(txt);
    const code = detectLang(txt);
    u.lang = code === 'en' ? 'en-US' : (code === 'ja' ? 'ja-JP' : 'ko-KR');
    u.rate = getPrefs().ttsRate || 1.05;
    u.pitch = 1;
    u.volume = 1;
    const v = pickVoice(code);
    if (v) u.voice = v;
    ss.speak(u);
  } catch (_) { /* 비지원 환경 무시 */ }
}

/* 진행 중 발화 즉시 중단 (발화 스킵 설정이 켜졌을 때 키 입력 시 호출) */
export function skipCurrent() {
  if (!getPrefs().skipSpeech) return false;
  try {
    const ss = globalThis.speechSynthesis;
    if (ss && ss.speaking) { ss.cancel(); return true; }
  } catch (_) {}
  return false;
}
