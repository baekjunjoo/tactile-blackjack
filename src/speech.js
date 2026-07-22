/* speech.js — TTS (superdot 방식 이식 + 임베드 안정화)
   기기 내 가장 자연스러운 한국어 음성 자동 선별.
   ★ iframe(교차출처) 임베드에서는 원격(네트워크) 음성이 자동재생 정책으로
   조용히 실패하므로, 반드시 로컬(localService) 음성을 우선한다.
   + 문장 언어 자동감지(한/영/일). 발화 속도는 prefs.ttsRate.
   + 발화 오류(네트워크 음성 실패) 시 기본 음성으로 재시도.
   + 첫 사용자 제스처에서 speechSynthesis 언락(임베드 무음 방지).
   skipCurrent(): 발화 스킵 설정 시 진행 중 발화 즉시 중단 */

import { getPrefs } from './prefs.js';

let enabled = true;
export function setSpeechEnabled(v) { enabled = !!v; }
export function isSpeechEnabled() { return enabled; }

const byLang = {};   // 언어별 선택 음성 캐시 (도중 교체 방지)

function allVoices() {
  try { return globalThis.speechSynthesis.getVoices() || []; } catch (_) { return []; }
}

/* 점수: 로컬 음성을 압도적으로 우선(+120) → 임베드에서도 항상 재생됨.
   그 위에 superdot 품질 가중치(Edge Natural/Neural > 프리미엄/Siri > Google > online). */
function score(v) {
  const n = (v.name || '').toLowerCase();
  let s = 0;
  if (v.localService) s += 120;                         // ★ 로컬 우선(임베드 무음 방지)
  if (/natural|neural/.test(n)) s += 80;
  if (/premium|enhanced|siri|yuna|sora|suhyun|heami|injoon/.test(n)) s += 50;
  if (/google/.test(n)) s += 40;                        // 원격이면 로컬보다 뒤로
  if (/online/.test(n)) s += 5;
  if (v.default) s += 1;
  return s;
}

function detectLang(text) {
  const s = String(text || '');
  if (/[가-힣ᄀ-ᇿ㄰-㆏]/.test(s)) return 'ko';   // 한글(호환자모 포함)
  if (/[぀-ヿ]/.test(s)) return 'ja';                               // 가나
  if (/[A-Za-z]/.test(s)) return 'en';                                      // 라틴
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

/* 첫 사용자 제스처에서 speechSynthesis 언락(교차출처 iframe 무음 방지) */
let primed = false;
function prime() {
  if (primed) return;
  primed = true;
  try {
    const ss = globalThis.speechSynthesis;
    if (!ss) return;
    ss.resume();
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    ss.speak(u);
  } catch (_) {}
}
try {
  if (globalThis.addEventListener) {
    const onFirst = () => { prime(); };
    globalThis.addEventListener('pointerdown', onFirst, { once: true, capture: true });
    globalThis.addEventListener('keydown', onFirst, { once: true, capture: true });
  }
} catch (_) {}

function utter(txt, forceDefault) {
  const ss = globalThis.speechSynthesis;
  const u = new SpeechSynthesisUtterance(txt);
  const code = detectLang(txt);
  u.lang = code === 'en' ? 'en-US' : (code === 'ja' ? 'ja-JP' : 'ko-KR');
  u.rate = getPrefs().ttsRate || 1.05;
  u.pitch = 1;
  u.volume = 1;
  if (!forceDefault) {
    const v = pickVoice(code);
    if (v) u.voice = v;
    // 원격 음성이 임베드에서 실패하면 기본 음성으로 1회 재시도
    u.onerror = (e) => {
      const err = e && e.error;
      if (err === 'interrupted' || err === 'canceled') return;
      try { ss.cancel(); ss.speak(utter(txt, true)); } catch (_) {}
    };
  }
  return u;
}

export function speak(txt) {
  if (!enabled) return;
  try {
    const ss = globalThis.speechSynthesis;
    if (!ss) return;
    ss.cancel();                       // 이전 발화 중단(스크린리더 관례)
    ss.resume();                       // 임베드/백그라운드에서 멈춘 큐 복구(Chrome)
    ss.speak(utter(txt, false));
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
