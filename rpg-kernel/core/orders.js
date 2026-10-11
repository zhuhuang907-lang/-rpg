'use strict';
/**
 * 交代下去的事（玩家原话：「很多事情吩咐下去不执行，扯皮」「快进来就没有反馈」）。
 *
 * 模型每回合在 orders 里申报：本轮主角新交代给谁办什么、以及旧差事的进展；
 * 这里记进存档 state.orders，没办完的每回合都放进提示词，时间一过就必须写出结果，不许忘。
 */
const OPEN = /^(在办|已交代|待办|未办|推迟)$/;
const norm = s => String(s || '').replace(/\s+/g, '').trim();
const same = (a, b) => norm(a.who) === norm(b.who) && (norm(a.what).includes(norm(b.what).slice(0, 8)) || norm(b.what).includes(norm(a.what).slice(0, 8)));

/** 采纳时：把模型申报的差事记账 */
function record(state, draft) {
  const list = Array.isArray(draft && draft.orders) ? draft.orders.slice(0, 10) : [];
  if (!list.length) return [];
  const all = state.orders = Array.isArray(state.orders) ? state.orders : [];
  const turn = (state.turn || 0) + 1;   // 与界面回合号一致
  const done = [];
  for (const o of list) {
    const who = String((o && o.who) || '').trim().slice(0, 30);
    const what = String((o && o.what) || '').trim().slice(0, 80);
    if (!who || !what) continue;
    const status = String((o && o.status) || '在办').trim().slice(0, 6) || '在办';
    const result = String((o && o.result) || '').trim().slice(0, 160);
    const old = all.find(x => OPEN.test(x.status) && same(x, { who, what }));
    if (old) { old.status = status; if (result) old.result = result; old.updated = turn; done.push(old); }
    else { const n = { who, what, status, result, turn, updated: turn }; all.push(n); done.push(n); }
  }
  // 只留最近 40 件（没办完的优先留）
  if (all.length > 40) {
    const open = all.filter(x => OPEN.test(x.status));
    const closed = all.filter(x => !OPEN.test(x.status)).slice(-Math.max(0, 40 - open.length));
    state.orders = all.filter(x => open.includes(x) || closed.includes(x));
  }
  return done;
}

function openOrders(state) {
  return (Array.isArray(state.orders) ? state.orders : []).filter(x => OPEN.test(x.status));
}

/** 提示词：还没回音的差事 */
function renderOpen(state) {
  const open = openOrders(state).slice(-12);
  if (!open.length) return '';
  return '【主角交代下去、还没办完的事（到时候必须写出结果：办妥了什么、数目多少，或办砸在哪；不许遗忘，不许无故拖着）】\n'
    + open.map(x => `· 第${x.turn}轮交代 ${x.who}：${x.what}（${x.status}${x.result ? '，' + x.result : ''}）`).join('\n');
}

/** 个人面板 */
function profileRows(state) {
  const all = Array.isArray(state.orders) ? state.orders : [];
  const open = all.filter(x => OPEN.test(x.status));
  const closed = all.filter(x => !OPEN.test(x.status)).slice(-8).reverse();
  return open.slice().reverse().concat(closed).map(x => ({ k: `第${x.turn}轮 · ${x.status}`, v: `${x.who}：${x.what}${x.result ? ' —— ' + x.result : ''}` }));
}

module.exports = { record, renderOpen, openOrders, profileRows };
