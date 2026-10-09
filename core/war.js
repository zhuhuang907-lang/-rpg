'use strict';
/**
 * 战争：兵力、训练、士气、主将、补给、地形、季节、城防共同决定胜负。
 * 不是「剧情需要谁赢谁就赢」——双方的数值摆在明处，开战前可以推演胜算。
 *
 * 胜负概率按兰彻斯特平方律的变体：p = Pa^k / (Pa^k + Pd^k)，k = 1.6。
 * 伤亡：古代会战大部分伤亡发生在溃退中，因此败方损失远大于胜方。
 */
const { clamp, rel, atWar, allied, ownedRegions, armiesAt, MONTH_NAMES } = require('./helpers');
const { roll } = require('./rng');
const { shortestPath, edgeBetween, ROUTE_TYPES } = require('./geo');

const K = 1.6;
const WALL_FACTOR = [1, 1.5, 2.2, 3.0];
const TERRAIN = {
  plain: { label: '平原', def: 1.0 },
  hills: { label: '丘陵', def: 1.15 },
  mountain: { label: '山地', def: 1.35 },
  marsh: { label: '水泽', def: 1.15 },
  river: { label: '水网', def: 1.1 },
  fort: { label: '要塞', def: 1.3 },
  steppe: { label: '草原', def: 0.95 },
  desert: { label: '戈壁', def: 1.0 },
};

function generalSkill(state, fid, name) {
  const f = state.factions[fid];
  const g = f && f.generals.find(x => x.name === name);
  return g ? g.skill : 45;
}

/** 季节与水土：北人冬季北方作战无碍，南人不耐；北人夏季南方易生疾疫（赤壁之役即是） */
function climateFactor(state, ctx, fid, rid) {
  const f = state.factions[fid];
  const r = ctx.rs(rid);
  const m = state.date.m;
  if (!f || !r) return 1;
  if ([11, 12, 1].includes(m) && r.lat > 35 && f.origin === 'south') return 0.85;
  if ([5, 6, 7, 8].includes(m) && r.lat < 31.5 && f.origin !== 'south') return 0.85;
  return 1;
}

function armyPower(state, ctx, a) {
  const q = 0.45 + 0.55 * a.training;
  const mo = 0.4 + 0.8 * clamp(a.morale, 0, 1);
  const gen = 0.8 + generalSkill(state, a.faction, a.general) / 250;
  const sup = 1 - 0.25 * clamp(a.hunger || 0, 0, 2);
  return a.troops * q * mo * gen * sup * climateFactor(state, ctx, a.faction, a.loc);
}

function garrisonPower(state, ctx, r) {
  const q = 0.45 + 0.55 * (r.garrisonTraining ?? 0.5);
  const mo = 0.4 + 0.8 * (r.siege ? clamp(0.6 - 0.1 * r.siege.months, 0.2, 0.6) : 0.6);
  return r.garrison * q * mo * 0.95 * climateFactor(state, ctx, r.owner, r.id);
}

function winProb(pa, pd) {
  if (pa <= 0) return 0;
  if (pd <= 0) return 1;
  return pa ** K / (pa ** K + pd ** K);
}

function lossRates(pw, pl) {
  const x = pl / Math.max(1, pw);
  return {
    winner: clamp(0.03 + 0.12 * x, 0.03, 0.3),
    loser: clamp(0.15 + 0.12 / Math.max(0.15, x), 0.18, 0.65),
  };
}

/** 进攻方的额外修正：渡河、渡江（缺水军）、攻关 */
function attackModifiers(state, ctx, fid, rid, fromRid) {
  let m = 1;
  const notes = [];
  const r = ctx.rs(rid);
  const t = TERRAIN[r.terrain] || TERRAIN.plain;
  if (t.def !== 1) { m /= t.def; notes.push(`守方据${t.label}（×${t.def}）`); }
  if (fromRid) {
    const e = edgeBetween(ctx.graph, fromRid, rid);
    if (e && e.type === 'ford') { m *= 0.85; notes.push('攻方须渡河（×0.85）'); }
    if (e && e.type === 'jiang') {
      const navy = state.factions[fid].navy ?? 0;
      const f = 0.5 + 0.5 * navy;
      m *= f; notes.push(`攻方渡江，水军${navy >= 0.7 ? '精' : navy >= 0.4 ? '尚可' : '薄弱'}（×${f.toFixed(2)}）`);
    }
    if (e && e.type === 'pass') { m *= 0.85; notes.push('仰攻关隘（×0.85）'); }
  }
  return { m, notes };
}

/** 推演：给出双方战力与胜算，不改存档 */
function previewAttack(state, ctx, attackers, rid, opts = {}) {
  const r = state.regions[rid];
  const defenders = armiesAt(state, rid).filter(a => atWar(state, a.faction, attackers[0].faction));
  const fromRid = opts.fromRid || attackers[0].loc;
  const am = attackModifiers(state, ctx, attackers[0].faction, rid, fromRid === rid ? null : fromRid);
  const pa = attackers.reduce((s, a) => s + armyPower(state, ctx, { ...a, loc: rid }), 0) * am.m;
  const hostileOwner = r.owner && atWar(state, r.owner, attackers[0].faction);
  const pdField = defenders.reduce((s, a) => s + armyPower(state, ctx, a), 0);
  const pdGarrison = hostileOwner ? garrisonPower(state, ctx, r) : 0;
  const wall = WALL_FACTOR[r.walls || 0];
  const field = pdField > 0 ? winProb(pa, pdField + pdGarrison * 0.5) : null;
  const assault = pdGarrison > 0 ? winProb(pa, (pdField + pdGarrison) * wall * 1.2) : null;
  return {
    attackPower: Math.round(pa), fieldPower: Math.round(pdField), garrisonPower: Math.round(pdGarrison),
    wall, walls: r.walls || 0, notes: am.notes,
    pField: field, pAssault: assault,
    storeMonths: r.store,
  };
}

function retreatTarget(state, ctx, army) {
  // 败军退往最近的己方（或盟友）地盘
  const own = id => state.regions[id].owner && allied(state, state.regions[id].owner, army.faction);
  let best = null;
  for (const e of ctx.graph[army.loc] || []) {
    if (!own(e.to)) continue;
    if (armiesAt(state, e.to).some(a => atWar(state, a.faction, army.faction))) continue;
    if (!best || e.days < best.days) best = e;
  }
  return best ? best.to : null;
}

/** 一场会战。attackers/defenders 都是军队数组；garrison 参战时按半数计入野战 */
function fieldBattle(state, ctx, rid, attackers, defenders, tag, fromRid) {
  const r = state.regions[rid];
  const am = attackModifiers(state, ctx, attackers[0].faction, rid, fromRid);
  const pa = attackers.reduce((s, a) => s + armyPower(state, ctx, a), 0) * am.m;
  const garrisonJoins = r.owner && defenders.length && defenders[0].faction === r.owner && r.garrison > 0;
  const pg = garrisonJoins ? garrisonPower(state, ctx, r) * 0.5 : 0;
  const pd = defenders.reduce((s, a) => s + armyPower(state, ctx, a), 0) + pg;
  const p = winProb(pa, pd);
  const x = roll(state, 'battle|' + tag);
  const attackerWins = x < p;
  const [W, L] = attackerWins ? [attackers, defenders] : [defenders, attackers];
  const [pw, pl] = attackerWins ? [pa, pd] : [pd, pa];
  const lr = lossRates(pw, pl);
  const before = { A: sum(attackers), D: sum(defenders) + (garrisonJoins ? r.garrison : 0) };
  let lossW = 0, lossL = 0;
  for (const a of W) { const d = Math.round(a.troops * lr.winner); a.troops -= d; lossW += d; a.morale = clamp(a.morale + 0.1, 0, 1); a.training = clamp(a.training + 0.03, 0, 0.95); }
  for (const a of L) { const d = Math.round(a.troops * lr.loser); a.troops -= d; lossL += d; a.morale = clamp(a.morale - 0.25, 0.05, 1); }
  if (garrisonJoins) {
    const gl = Math.round(r.garrison * (attackerWins ? lr.loser * 0.6 : lr.winner * 0.5));
    r.garrison -= gl;
    if (attackerWins) lossL += gl; else lossW += gl;
  }
  // 败军撤退；无路可退则溃散/被俘
  const routed = [];
  for (const a of L) {
    const to = retreatTarget(state, ctx, a);
    if (to) { a.loc = to; a.route = []; a.dest = null; a.legDone = 0; routed.push({ id: a.id, to }); }
    else { routed.push({ id: a.id, to: null, lost: a.troops }); lossL += a.troops; a.troops = 0; }
  }
  for (const w of W) w.lastBattleTurn = state.turn;
  r.lastWarTurn = state.turn;
  r.pop = Math.max(0, Math.round(r.pop * 0.995));
  return {
    rid, attackerWins, p, pa: Math.round(pa), pd: Math.round(pd), before,
    lossA: attackerWins ? lossW : lossL, lossD: attackerWins ? lossL : lossW,
    notes: am.notes, routed,
    attackerFaction: attackers[0].faction, defenderFaction: defenders[0] ? defenders[0].faction : r.owner,
    attackerGenerals: attackers.map(a => a.general), defenderGenerals: defenders.map(a => a.general),
  };
}

/** 攻城：强攻一次 */
function assault(state, ctx, rid, attackers, tag) {
  const r = state.regions[rid];
  const wall = WALL_FACTOR[r.walls || 0];
  const pa = attackers.reduce((s, a) => s + armyPower(state, ctx, a), 0);
  const pd = garrisonPower(state, ctx, r) * wall * 1.2;
  const p = winProb(pa, pd);
  const x = roll(state, 'assault|' + tag);
  const win = x < p;
  // 攻城一方伤亡远重于野战
  const rateA = win ? clamp(0.06 + 0.15 * pd / Math.max(1, pa), 0.06, 0.35) : clamp(0.12 + 0.2 * pd / Math.max(1, pa), 0.12, 0.45);
  let lossA = 0;
  for (const a of attackers) { const d = Math.round(a.troops * rateA); a.troops -= d; lossA += d; a.morale = clamp(a.morale + (win ? 0.08 : -0.12), 0.05, 1); }
  const lossD = win ? r.garrison : Math.round(r.garrison * clamp(0.05 + 0.1 * pa / Math.max(1, pd), 0.05, 0.3));
  r.garrison -= lossD;
  r.lastWarTurn = state.turn;
  return { win, p, lossA, lossD, wall };
}

/** 占领一地 */
function capture(state, ctx, rid, fid, how) {
  const r = state.regions[rid];
  const prev = r.owner;
  r.owner = fid;
  r.garrison = 0;
  r.siege = null;
  r.store = 1;
  r.capturedTurn = state.turn;
  r.loyalty = Math.min(r.loyalty, (ctx.rs(rid).affinity === fid) ? 55 : 30);
  r.tax = 'normal';
  const pf = prev && state.factions[prev];
  if (pf && pf.capital === rid) {
    const rest = ownedRegions(state, prev).sort((a, b) => b.pop - a.pop);
    pf.capital = rest[0] ? rest[0].id : null;
    if (pf.court) pf.court.support = clamp(pf.court.support - 15, 0, 100);
  }
  return { prev, how };
}

/** 计算一支军队到目标地的行军路线（只能借道自己或盟友的地盘） */
function planRoute(state, ctx, army, target) {
  const passable = id => {
    const o = state.regions[id].owner;
    if (!o || !allied(state, o, army.faction)) return false;
    return !armiesAt(state, id).some(x => atWar(state, x.faction, army.faction));
  };
  return shortestPath(ctx.graph, army.loc, target, passable);
}

function supplyDistance(state, ctx, army) {
  // 离最近的己方地盘有多远（日数），以及沿途运耗系数
  const r = state.regions[army.loc];
  if (r.owner && allied(state, r.owner, army.faction)) return { days: 0, haulFactor: 1.05 };
  let best = null;
  for (const e of ctx.graph[army.loc] || []) {
    const o = state.regions[e.to].owner;
    if (!o || !allied(state, o, army.faction)) continue;
    const hf = 1 + e.days / ROUTE_TYPES[e.type].haul;
    if (!best || hf < best.haulFactor) best = { days: e.days, haulFactor: hf, via: e.to };
  }
  return best || { days: null, haulFactor: null };
}

function sum(arr) { return arr.reduce((s, a) => s + a.troops, 0); }

function monthLabel(state) { return MONTH_NAMES[state.date.m]; }

module.exports = {
  WALL_FACTOR, TERRAIN, armyPower, garrisonPower, winProb, previewAttack, fieldBattle, assault,
  capture, planRoute, supplyDistance, retreatTarget, generalSkill, monthLabel, attackModifiers,
};
