/* refactor.test.mjs — 리팩토링/버그픽스 회귀 테스트 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { makeChecker } = require('./lib/dotpad-mock.cjs');

import { createTable } from '../src/game/table.js';
import { settle } from '../src/game/blackjack.js';

const t = makeChecker();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const C = (r, s = 'S') => ({ r, s });
console.log('── 리팩토링 회귀 테스트 ──');

{
  const natural = settle({ bet: 20, player: [C('A'), C('K')], dealer: [C('10'), C('9')], playerNatural: true });
  t.ok('원 핸드 A+K = 블랙잭 1.5배 (payout 50)', natural.outcome === 'blackjack' && natural.payout === 50);
  const split = settle({ bet: 20, player: [C('A'), C('K')], dealer: [C('10'), C('9')], playerNatural: false });
  t.ok('스플릿 후 21 = 일반 승리 (payout 40)', split.outcome === 'win' && split.payout === 40);
  const bothNat = settle({ bet: 20, player: [C('A'), C('K')], dealer: [C('A', 'H'), C('Q', 'H')], playerNatural: true });
  t.ok('양쪽 내추럴 = 푸시', bothNat.outcome === 'push' && bothNat.payout === 20);
  const splitVsDealerBJ = settle({ bet: 20, player: [C('A'), C('K')], dealer: [C('A', 'H'), C('Q', 'H')], playerNatural: false });
  t.ok('스플릿 21 vs 딜러 내추럴 = 패배', splitVsDealerBJ.outcome === 'lose' && splitVsDealerBJ.payout === 0);
}

{
  const eng = createTable({
    announce: () => {},
    deckFactory: () => [C('5', 'C'), C('8', 'S'), C('7', 'S'), C('A', 'H'), C('9', 'S'), C('10', 'S')],
    dealerDelay: 10, turnTimeout: 0
  });
  eng.addPlayer('p1', '가'); eng.addPlayer('p2', '나');
  eng.action('p1', 'start');
  eng.action('p1', 'confirm'); eng.action('p2', 'confirm');
  t.ok('딜러 오픈 A → 보험 국면', eng.state.phase === 'insurance');
  eng.action('p1', 'pass');
  t.ok('한 명만 결정 → 아직 보험 국면 유지', eng.state.phase === 'insurance');
  eng.removePlayer('p2');
  t.ok('미결정자 이탈 → 보험 해소, 게임 진행', eng.state.phase === 'acting');
}

{
  const eng = createTable({
    announce: () => {},
    deckFactory: () => [C('7', 'H'), C('10', 'S'), C('5', 'C'), C('A', 'D'), C('9', 'H'), C('A', 'S')],
    dealerDelay: 10, turnTimeout: 0
  });
  eng.addPlayer('p1', '솔로');
  eng.action('p1', 'start');
  eng.action('p1', 'confirm');
  const p = eng.state.players[0];
  t.ok('초기 핸드 A,A', p.hands[0].length === 2 && p.hands[0].every((c) => c.r === 'A'));
  eng.action('p1', 'split');
  t.ok('스플릿 에이스: 각 핸드 2장', p.hands.length === 2 && p.hands[0].length === 2 && p.hands[1].length === 2);
  t.ok('스플릿 에이스: 즉시 종료(둘 다 완료)', p.handDone[0] === true && p.handDone[1] === true && p.done === true);
  eng.action('p1', 'hit');
  t.ok('스플릿 에이스 후 히트 불가', p.hands[0].length === 2 && p.hands[1].length === 2);
}

{
  let threw = null;
  const eng = createTable({
    announce: () => {},
    deckFactory: () => [C('6', 'C'), C('9', 'S'), C('5', 'H'), C('10', 'S')],
    dealerDelay: 5, turnTimeout: 0
  });
  eng.addPlayer('p1', '솔로');
  eng.action('p1', 'start');
  eng.action('p1', 'confirm');
  try { eng.action('p1', 'stand'); } catch (e) { threw = e; }
  await wait(120);
  t.ok('덱 소진에도 예외 없음', threw === null);
  t.ok('라운드 정상 종료(result)', eng.state.phase === 'result');
}

process.exit(t.summary());
