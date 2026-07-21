/* highlowController.js — 하이·로우 싱글 모드 상태 머신 + 키 라우팅 + 음성/닷패드 */

import * as HL from './highlow.js';
import { createFrame, clearBuf, rect, dashedHLine, drawGlyph, encodeRows } from '../dotpad/frame.js';
import { strToTextCells } from '../dotpad/braille-core.js';
import { getPrefs } from '../prefs.js';

function isKo() { const p = getPrefs(); return p.lang ? p.lang === 'ko' : !!p.brailleKo; }

function textLineHex(str) {
  const cells = strToTextCells(str);
  let hex = '';
  for (let i = 0; i < 20; i++) { const b = cells[i] || 0; const h = b.toString(16).toUpperCase(); hex += (h.length < 2 ? '0' : '') + h; }
  return hex;
}

function drawBigCard(buf, card) {
  const x = 20, y = 3, w = 20, h = 30;
  rect(buf, x, y, w, h);
  if (card.r === '10') { drawGlyph(buf, '1', x + 4, y + 8, 2, 3); drawGlyph(buf, '0', x + 11, y + 8, 2, 3); }
  else drawGlyph(buf, card.r, x + 6, y + 8, 3, 3);
}

export function createHighLow({ say, rng = Math.random, deckFactory = null } = {}) {
  const listeners = new Set();
  const st = {
    phase: 'guess',
    deck: [], current: null, next: null,
    score: 0, streak: 0, best: 0, last: null
  };

  function speak(t) { if (say) say(t); }
  function emit() { listeners.forEach((fn) => fn(st)); }
  function nameKo(c) { return HL.cardNameKo(c); }

  function refill() {
    if (st.deck.length < 2) st.deck = deckFactory ? deckFactory() : HL.freshDeck(rng);
  }

  function start() {
    st.deck = deckFactory ? deckFactory() : HL.freshDeck(rng);
    st.current = st.deck.pop();
    st.phase = 'guess'; st.score = 0; st.streak = 0; st.last = null;
    speak('하이 로우. 현재 카드 ' + nameKo(st.current) + '. 다음 카드가 더 높을까요 낮을까요? 에프원 하이, 에프투 로우, 에프포 상태 읽기.');
    emit();
  }

  function guess(g) {
    refill();
    const next = st.deck.pop();
    const out = HL.judge(st.current, next, g);
    st.next = next; st.last = out;
    const nk = nameKo(next);
    if (out === 'win') {
      st.streak++; st.score++;
      speak(nk + '. 정답! ' + st.streak + '연승. 점수 ' + st.score + '. 다음 카드 기준 ' + nk + '. 에프원 하이, 에프투 로우.');
      if (st.streak > st.best) st.best = st.streak;
    } else if (out === 'tie') {
      speak(nk + '. 같은 숫자, 무승부. 그대로 진행. 에프원 하이, 에프투 로우.');
    } else {
      speak(nk + '. 아쉬우네요. ' + st.streak + '연승에서 끕. 최종 점수 ' + st.score + '. 에프원 다시 시작.');
      st.streak = 0;
      st.phase = 'over';
      st.current = next; emit(); return;
    }
    st.current = next;
    emit();
  }

  function readStatus() {
    if (st.phase === 'over') speak('게임 종료. 최종 점수 ' + st.score + ', 최고 연승 ' + st.best + '. 에프원 다시 시작.');
    else speak('현재 카드 ' + nameKo(st.current) + '. ' + st.streak + '연승, 점수 ' + st.score + '. 에프원 하이, 에프투 로우.');
  }

  function onKey(k) {
    if (k === 'F4') return readStatus();
    if (st.phase === 'over') { if (k === 'F1') return start(); speak('에프원을 누르면 다시 시작합니다.'); return; }
    if (k === 'F1') return guess('high');
    if (k === 'F2') return guess('low');
    speak('에프원 하이, 에프투 로우, 에프포 상태 읽기.');
  }

  function statusText() {
    const ko = isKo();
    if (st.phase === 'over') return ko ? '끕 점수 ' + st.score : 'over score ' + st.score;
    const cur = st.current ? st.current.r : '';
    return ko ? cur + ' 연승 ' + st.streak : cur + ' streak ' + st.streak;
  }

  function frame() {
    const buf = createFrame();
    clearBuf(buf);
    if (st.current) drawBigCard(buf, st.current);
    dashedHLine(buf, 35);
    const g = Math.max(0, Math.min(58, st.streak * 4));
    if (g > 0) rect(buf, 1, 37, g, 3, { fill: true });
    return { buf, rows: encodeRows(buf), textHex: textLineHex(statusText()) };
  }

  return { state: st, start, onKey, readStatus, frame, status: statusText, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
}
