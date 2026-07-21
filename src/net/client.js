/* client.js — RoomClient: 호스트/게스트 공용 방 클라이언트
   v3: 재접속 유예(60초), 호스트 승계, announce kind 전달 / to: null|id|{except:id} */

import { createTable } from '../game/table.js';
import { RECONNECT_GRACE_MS } from '../config.js';

export function createRoomClient({ transport, me, isHost, say = () => {}, engineOpts = {}, graceMs = RECONNECT_GRACE_MS }) {
  let engine = null;
  let lastState = undefined;
  let hostSeen = isHost;
  let closed = false;
  let hostLossTimer = null;
  let lastHasHost = isHost;
  const HOST_LOSS_GRACE_MS = 5000;
  const pendingRemoval = new Map();

  function handleState(st) { lastState = st; if (client.onStateChange) client.onStateChange(st); }

  function matchTo(to) {
    if (to == null) return true;
    if (typeof to === 'string') return to === me.id;
    if (to.except) return me.id !== to.except;
    return true;
  }
  function handleAnnounce({ text, to, kind }) { if (matchTo(to)) say(text, kind); }

  function makeEngine() {
    engine = createTable({
      ...engineOpts,
      announce: (text, to, kind) => {
        transport.send('announce', { text, to: to || null, kind: kind || null });
        handleAnnounce({ text, to, kind });
      },
      onState: (st) => {
        transport.send('state', st);
        handleState(st);
      }
    });
    transport.on('action', ({ id, act, val }) => engine && engine.action(id, act, val));
    transport.on('hello', ({ id, nick }) => {
      if (!engine) return;
      cancelRemoval(id);
      engine.addPlayer(id, nick);
      transport.send('state', engine.publicState());
    });
    transport.on('bye', ({ id }) => {
      if (!engine) return;
      cancelRemoval(id);
      engine.removePlayer(id);
    });
  }

  function cancelRemoval(id) {
    const pend = pendingRemoval.get(id);
    if (pend) { clearTimeout(pend.timer); pendingRemoval.delete(id); }
  }

  if (isHost) {
    makeEngine();
  } else {
    transport.on('state', handleState);
    transport.on('announce', handleAnnounce);
    transport.on('closed', () => { closed = true; say('호스트가 방을 닫았습니다.'); handleState(null); });
    transport.on('handover', ({ toId, players, round, opts }) => {
      if (toId !== me.id || engine) return;
      makeEngine();
      engine.seed({ players, round, opts });
      transport.updateMeta && transport.updateMeta({ id: me.id, nick: me.nick, host: true });
      say('호스트가 되었습니다. 새 라운드를 시작합니다.');
      engine.notify('호스트가 ' + me.nick + ' 님으로 변경되었습니다. 진행 중이던 판의 베팅은 반환되고 새 라운드를 시작합니다.');
      engine.startBetting();
    });
  }

  transport.onPresence((list) => {
    const ids = new Set(list.map((m) => m.id));
    if (isHost && engine) {
      [...pendingRemoval.keys()].forEach((id) => {
        if (ids.has(id)) {
          const nick = pendingRemoval.get(id).nick;
          cancelRemoval(id);
          engine.notify(nick + ' 님이 다시 연결되었습니다.');
          transport.send('state', engine.publicState());
        }
      });
      engine.state.players.concat(engine.state.spectators).forEach((p) => {
        if (!ids.has(p.id) && p.id !== me.id && !pendingRemoval.has(p.id)) {
          engine.notify(p.nick + ' 님의 연결이 끊겼습니다. ' + Math.round(graceMs / 1000) + '초 안에 복귀하면 자리가 유지됩니다.');
          const timer = setTimeout(() => {
            pendingRemoval.delete(p.id);
            engine.removePlayer(p.id);
          }, graceMs);
          pendingRemoval.set(p.id, { timer, nick: p.nick });
        }
      });
    } else if (!isHost && !engine) {
      const hasHost = list.some((m) => m.host);
      lastHasHost = hasHost;
      if (hasHost) {
        hostSeen = true;
        if (hostLossTimer) { clearTimeout(hostLossTimer); hostLossTimer = null; }
      } else if (hostSeen && !closed && !hostLossTimer) {
        hostLossTimer = setTimeout(() => {
          hostLossTimer = null;
          if (!engine && !closed && !lastHasHost) {
            closed = true; say('호스트 연결이 끊겼습니다. 방이 종료됩니다.'); handleState(null);
          }
        }, HOST_LOSS_GRACE_MS);
      }
    }
  });

  async function join() {
    await transport.join({ id: me.id, nick: me.nick, host: !!isHost });
    if (isHost) engine.addPlayer(me.id, me.nick);
    else transport.send('hello', { id: me.id, nick: me.nick });
  }

  const client = {
    join,
    onStateChange: null,
    sendAction(act, val) {
      if (engine) engine.action(me.id, act, val);
      else transport.send('action', { id: me.id, act, val });
    },
    get state() { return lastState; },
    get isHostNow() { return !!engine; },
    leave() {
      if (engine) {
        const others = engine.state.players.filter((p) => p.id !== me.id);
        if (others.length) {
          const inPlay = ['insurance', 'acting', 'dealer'].includes(engine.state.phase);
          const refund = (p) => inPlay ? (p.handBets || []).reduce((a, b) => a + b, 0) + (p.insBet || 0) : 0;
          transport.send('handover', {
            toId: others[0].id,
            players: others.map((p) => ({ id: p.id, nick: p.nick, chips: p.chips + refund(p) })),
            round: engine.state.round,
            opts: engine.state.opts
          });
        } else {
          transport.send('closed', {});
        }
        pendingRemoval.forEach((v) => clearTimeout(v.timer));
      } else {
        transport.send('bye', { id: me.id });
      }
      if (hostLossTimer) { clearTimeout(hostLossTimer); hostLossTimer = null; }
      transport.leave();
    }
  };
  return client;
}
