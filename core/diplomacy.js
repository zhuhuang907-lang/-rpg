'use strict';
/**
 * 外交：宣战、遣使议和、结盟、劝降、馈赠。
 * 对方答不答应，看的是实力对比、彼此关系、是否另有强敌——概率在遣使前就能看到。
 */
const { clamp, rel, atWar, aliveFactions, totalTroops, totalPop, ownedRegions, fmtNum } = require('./helpers');
const { roll } = require('./rng');

const KINDS = {
  peace: '议和停战',
  alliance: '结盟',
  submit: '劝降',
  gift: '馈赠修好',
};

function power(state, fid) {
  const t = totalTroops(state, fid).total;
  return t + totalPop(state, fid) * 0.01;
}
const sigmoid = x => 1 / (1 + Math.exp(-x));

function commonEnemy(state, a, b) {
  return aliveFactions(state).some(f => f.id !== a && f.id !== b && atWar(state, a, f.id) && atWar(state, b, f.id));
}
function warsOf(state, fid) {
  return aliveFactions(state).filter(f => f.id !== fid && atWar(state, fid, f.id)).length;
}

function chance(state, from, to, kind) {
  const r = rel(state, from, to);
  const ratio = power(state, from) / Math.max(1, power(state, to));
  const F = state.factions[from], T = state.factions[to];
  let x, why = [];
  switch (kind) {
    case 'peace':
      if (!r.war) return { p: 0, why: ['两家本未交兵'] };
      x = -0.4 + clamp((ratio - 1) * 0.9, -1.5, 2) + r.v / 60 + (warsOf(state, to) > 1 ? 0.6 : 0);
      why.push(`实力对比 ${ratio.toFixed(2)} : 1`, `关系 ${Math.round(r.v)}`);
      if (warsOf(state, to) > 1) why.push('对方另有战事，乐于息兵');
      break;
    case 'alliance':
      if (r.war) return { p: 0, why: ['正在交战，须先议和'] };
      if (r.ally) return { p: 0, why: ['已是盟友'] };
      x = (r.v - 25) / 15 + (commonEnemy(state, from, to) ? 1.4 : 0) - (ratio < 0.3 ? 0.6 : 0);
      why.push(`关系 ${Math.round(r.v)}`);
      if (commonEnemy(state, from, to)) why.push('有共同的敌人');
      break;
    case 'submit':
      if (T.isPlayer) return { p: 0, why: ['对方由玩家执掌'] };
      x = (ratio - 5) / 1.5 + r.v / 50 + (T.minor ? 1 : -1.5) + (F.traits && F.traits.emperor ? 0.6 : 0);
      why.push(`实力对比 ${ratio.toFixed(1)} : 1（通常要五倍以上才肯降）`);
      if (T.minor) why.push('对方势小，易于招抚');
      if (F.traits && F.traits.emperor) why.push('奉天子名义招抚');
      break;
    case 'gift':
      return { p: 1, why: ['馈赠总会收下'] };
    default:
      return { p: 0, why: ['未知的使命'] };
  }
  if (F.traits && F.traits.emperor && kind !== 'submit') { x += 0.3; why.push('挟天子以令，名分在我'); }
  return { p: clamp(sigmoid(x), 0.02, 0.95), why };
}

function declareWar(state, ctx, from, to) {
  const r = rel(state, from, to);
  const F = state.factions[from], T = state.factions[to];
  if (!T || !T.alive) return { ok: false, why: '对方已不存在。' };
  if (r.war) return { ok: false, why: '已在交战。' };
  let penalty = 0;
  const notes = [];
  if (r.ally) { penalty += 10; r.ally = false; notes.push('背盟'); }
  if (r.truce > 0) { penalty += 12; r.truce = 0; notes.push('毁约'); }
  r.war = true;
  r.v = Math.min(r.v - 40, -30);
  if (F.court) F.court.support = clamp(F.court.support - penalty, 0, 100);
  return { ok: true, text: `${F.name}与${T.name}开战${notes.length ? '（' + notes.join('、') + '，朝野非议）' : ''}。` };
}

function sendEnvoy(state, ctx, from, to, kind, amount = 0) {
  const T = state.factions[to];
  if (!T || !T.alive || to === from) return { ok: false, why: '没有这个对象。' };
  if (!KINDS[kind]) return { ok: false, why: '未知的使命。' };
  if ((state.envoys || []).some(e => e.from === from && e.to === to)) return { ok: false, why: '本月已向对方遣使。' };
  if (kind === 'gift') {
    amount = Math.floor(Number(amount) || 0);
    const F = state.factions[from];
    if (amount <= 0 || amount > F.money) return { ok: false, why: '馈赠的钱数不对或府库不足。' };
    F.money -= amount;
  }
  const c = chance(state, from, to, kind);
  if (c.p <= 0) return { ok: false, why: c.why.join('；') };
  state.envoys = state.envoys || [];
  state.envoys.push({ from, to, kind, amount });
  return { ok: true, text: `遣使往${T.name}${KINDS[kind]}（估计成算约${Math.round(c.p * 100)}%），使者往返需时，月底回报。` };
}

function absorb(state, ctx, winner, loser) {
  for (const r of ownedRegions(state, loser)) { r.owner = winner; r.capturedTurn = state.turn; r.loyalty = Math.min(r.loyalty, 50); }
  for (const a of Object.values(state.armies)) if (a.faction === loser) { a.faction = winner; a.morale = Math.min(a.morale, 0.5); }
  const W = state.factions[winner], L = state.factions[loser];
  for (const g of L.generals) if (g.alive !== false) W.generals.push({ ...g, busy: false, joinedTurn: state.turn });
  for (const a of Object.values(state.armies)) if (a.faction === winner) {
    const g = W.generals.find(x => x.name === a.general);
    if (g) g.busy = a.id;
  }
  W.money += L.money; W.grain += L.grain;
  L.alive = false;
}

function resolveEnvoys(state, ctx, report) {
  const list = state.envoys || [];
  state.envoys = [];
  for (const e of list) {
    const F = state.factions[e.from], T = state.factions[e.to];
    if (!F.alive || !T.alive) continue;
    const r = rel(state, e.from, e.to);
    const vis = [e.from, e.to];
    if (e.kind === 'gift') {
      const inc = Math.max(1, (T.lastMonth ? T.lastMonth.moneyIn : 1));
      const d = clamp(e.amount / inc * 8, 2, 30);
      r.v = clamp(r.v + d, -100, 100);
      report.push({ cat: '交', fid: e.from, vis, text: `${F.name}遣使赠${T.name}钱${fmtNum(e.amount)}${ctx.scn.economy.moneyUnit}，两家关系转好（+${Math.round(d)}）。` });
      continue;
    }
    const c = chance(state, e.from, e.to, e.kind);
    const ok = roll(state, `envoy|${e.from}|${e.to}|${e.kind}`) < c.p;
    if (!ok) {
      r.v = clamp(r.v - (e.kind === 'submit' ? 15 : 5), -100, 100);
      report.push({ cat: '交', fid: e.from, vis, text: `${F.name}遣使往${T.name}${KINDS[e.kind]}，${T.leader.name}不许。` });
      continue;
    }
    if (e.kind === 'peace') { r.war = false; r.truce = 12; r.v = clamp(r.v + 25, -100, 100); }
    if (e.kind === 'alliance') { r.ally = true; r.v = clamp(r.v + 20, -100, 100); }
    if (e.kind === 'submit') absorb(state, ctx, e.from, e.to);
    report.push({ cat: '交', fid: e.from, vis: e.kind === 'submit' ? 'all' : vis, important: true, text: e.kind === 'submit' ? `${T.leader.name}举众归附${F.name}，其地其兵尽归${F.name}。` : `${F.name}与${T.name}${e.kind === 'peace' ? '议和，约一年不相攻伐' : '结为盟好'}。` });
  }
  for (const r of Object.values(state.relations)) if (r.truce > 0) r.truce--;
}

/** 电脑势力的外交：打不过就求和；对玩家的提议做成「抉择」交给玩家 */
function aiDiplomacy(state, ctx, fid, report) {
  const F = state.factions[fid];
  for (const T of aliveFactions(state)) {
    if (T.id === fid) continue;
    const r = rel(state, fid, T.id);
    if (!r.war) continue;
    const ratio = power(state, fid) / Math.max(1, power(state, T.id));
    const recentLoss = F.stats.lost > F.stats.won;
    if (ratio > 0.45 || !recentLoss) continue;
    if (roll(state, `aipeace|${fid}|${T.id}`) > 0.25) continue;
    if (T.isPlayer) {
      if ((state.choices || []).some(c => c.kind === 'diplo' && c.from === fid)) continue;
      state.choices.push({
        id: `diplo-${fid}-${state.turn}`, kind: 'diplo', from: fid, title: `${F.name}遣使求和`,
        text: `${F.leader.name}遣使来，愿罢兵修好，约一年不相攻伐。眼下其兵力约为我方的${Math.round(ratio * 100)}%。`,
        options: [{ id: 'accept', label: '许和', desc: '两家停战一年；关系改善' }, { id: 'reject', label: '不许，继续进兵', desc: '关系恶化' }],
      });
    } else {
      state.envoys.push({ from: fid, to: T.id, kind: 'peace' });
    }
  }
}

function resolveDiploChoice(state, ctx, choice, optionId, report) {
  const r = rel(state, choice.from, state.meta.player);
  const F = state.factions[choice.from];
  if (optionId === 'accept') {
    r.war = false; r.truce = 12; r.v = clamp(r.v + 25, -100, 100);
    report.push({ cat: '交', fid: state.meta.player, vis: 'all', important: true, text: `许${F.name}之和，两家罢兵。` });
  } else {
    r.v = clamp(r.v - 10, -100, 100);
    report.push({ cat: '交', fid: state.meta.player, vis: [state.meta.player, choice.from], text: `拒${F.name}求和。` });
  }
}

module.exports = { KINDS, chance, declareWar, sendEnvoy, resolveEnvoys, aiDiplomacy, resolveDiploChoice, power, absorb };
