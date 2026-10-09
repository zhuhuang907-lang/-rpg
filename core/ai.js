'use strict';
/**
 * 电脑势力的决策：先保境，再图人。
 * - 有敌军压境、守备不足：调最近的野战军回援；钱够就募兵。
 * - 有余力且与人交战：挑兵力对比占优的目标进攻；剧本给出的「史实意图」优先（如袁绍南下白马）。
 * - 依史模式下，有的势力在某日期前按史书不动（袁绍「见事迟」）。
 * 所有命令都走 orders.js，和玩家同一套规则。
 */
const { clamp, atWar, allied, armiesAt, armiesOf, ownedRegions, aliveFactions } = require('./helpers');
const war = require('./war');
const orders = require('./orders');
const policies = require('./policies');
const { forecast } = require('./econ');
const { ym } = require('./events');

function regionDefense(state, ctx, rid, fid) {
  const r = state.regions[rid];
  const own = armiesAt(state, rid).filter(a => allied(state, a.faction, fid)).reduce((s, a) => s + war.armyPower(state, ctx, a), 0);
  const g = r.owner && allied(state, r.owner, fid) ? war.garrisonPower(state, ctx, r) * war.WALL_FACTOR[r.walls || 0] : 0;
  return own + g;
}

function threatTo(state, ctx, rid, fid) {
  const ids = [rid, ...ctx.graph[rid].filter(e => e.days <= 30).map(e => e.to)];
  let p = 0;
  for (const id of ids) for (const a of armiesAt(state, id)) if (atWar(state, a.faction, fid)) p += war.armyPower(state, ctx, a);
  return p;
}

function idleArmies(state, fid) {
  return armiesOf(state, fid).filter(a => !a.dest && !(state.regions[a.loc].siege && state.regions[a.loc].siege.by === fid) && a.troops >= 800);
}

function passive(state, f) {
  if (state.meta.mode !== 'history' || !f.traits || !f.traits.passiveUntil) return false;
  return ym(state.date) < ym(f.traits.passiveUntil);
}

function aiTurn(state, ctx, fid, report) {
  const f = state.factions[fid];
  if (!f.alive || f.isPlayer) return;
  const regions = ownedRegions(state, fid);
  if (!regions.length) return;
  const e = ctx.scn.economy;
  const fc = forecast(state, ctx, fid);

  // 1) 赋税：民心低则轻，粮荒且民心尚好则加
  for (const r of regions) {
    if (r.loyalty < 35) r.tax = 'low';
    else if (fc.runway < 3 && r.loyalty > 62) r.tax = 'heavy';
    else if (r.tax !== 'normal' && r.loyalty > 45 && fc.runway >= 4) r.tax = 'normal';
  }

  // 2) 赈济饥荒
  for (const r of regions) {
    if (r.famine > 0 && f.grain > fc.grainUse * 4) policies.enact(state, ctx, fid, 'relief', r.id);
  }

  // 3) 防御
  const threatened = regions.map(r => ({ r, t: threatTo(state, ctx, r.id, fid), d: regionDefense(state, ctx, r.id, fid) }))
    .filter(x => x.t > x.d * 0.9).sort((a, b) => (b.t - b.d) - (a.t - a.d));
  for (const x of threatened) {
    const cands = idleArmies(state, fid).map(a => ({ a, plan: war.planRoute(state, ctx, a, x.r.id) })).filter(c => c.plan && c.plan.days <= 30);
    cands.sort((p, q) => p.plan.days - q.plan.days);
    if (cands[0] && cands[0].a.loc !== x.r.id) orders.moveArmy(state, ctx, fid, cands[0].a.id, x.r.id);
  }

  // 4) 募兵：兵少于威胁或少于户口的一定比例
  const totalT = regions.reduce((s, r) => s + r.garrison, 0) + armiesOf(state, fid).reduce((s, a) => s + a.troops, 0);
  const pop = regions.reduce((s, r) => s + r.pop, 0);
  const want = Math.max(pop * 0.025, threatened.reduce((s, x) => s + x.t / 0.6, 0));
  if (totalT < want && fc.runway > 4 && f.money > e.recruitCost * 2000) {
    const sorted = regions.slice().sort((a, b) => orders.recruitCap(state, ctx, b) - orders.recruitCap(state, ctx, a));
    for (const r of sorted.slice(0, 2)) {
      const n = Math.min(orders.recruitCap(state, ctx, r), Math.floor(f.money * 0.4 / e.recruitCost), Math.round((want - totalT) / 2));
      if (n >= 500) orders.recruit(state, ctx, fid, r.id, n);
    }
  }

  // 5) 围城方式：兵力远胜则强攻
  for (const a of armiesOf(state, fid)) {
    const r = state.regions[a.loc];
    if (r.siege && r.siege.by === fid) {
      const atk = armiesAt(state, r.id).filter(x => x.faction === fid).reduce((s, x) => s + war.armyPower(state, ctx, x), 0);
      const def = war.garrisonPower(state, ctx, r) * war.WALL_FACTOR[r.walls || 0] * 1.2;
      a.siegeMode = atk > def * 2.2 && r.store > 2 ? 'assault' : 'blockade';
    }
  }

  if (passive(state, f)) return;
  const enemies = aliveFactions(state).filter(o => o.id !== fid && atWar(state, fid, o.id));
  if (!enemies.length) return;

  // 6) 从大城抽兵组建野战军
  if (idleArmies(state, fid).length < 2) {
    for (const r of regions.slice().sort((a, b) => b.garrison - a.garrison)) {
      const frontier = ctx.graph[r.id].some(ed => { const o = state.regions[ed.to].owner; return o && atWar(state, o, fid); });
      const keep = Math.max(2000, threatTo(state, ctx, r.id, fid) * 1.2 / Math.max(0.4, war.WALL_FACTOR[r.walls || 0]));
      if (frontier && r.garrison - keep > 6000) {
        orders.formArmy(state, ctx, fid, r.id, Math.round((r.garrison - keep) * 0.8));
        break;
      }
    }
  }

  // 7) 进攻：史实意图优先，其次挑最划算的目标
  const intents = (f.intents || []).filter(i => !i.from || ym(state.date) >= ym(i.from));
  const aggression = (f.traits && f.traits.aggression) ?? 0.5;
  for (const a of idleArmies(state, fid)) {
    if (state.regions[a.loc].owner !== fid && !allied(state, state.regions[a.loc].owner, fid)) continue;
    const pa = war.armyPower(state, ctx, a);
    let best = null;
    const consider = (rid, bonus, minRatio) => {
      const tr = state.regions[rid];
      if (!tr.owner || !atWar(state, tr.owner, fid)) return;
      const plan = war.planRoute(state, ctx, a, rid);
      if (!plan || plan.days > 75) return;
      const pv = war.previewAttack(state, ctx, [a], rid, { fromRid: plan.path[plan.path.length - 2] });
      const def = pv.fieldPower + pv.garrisonPower * (pv.wall * 0.6);
      const ratio = pa / Math.max(1, def);
      if (ratio < (minRatio ?? (1.8 - aggression * 0.6))) return;
      const score = ratio + bonus + ctx.rs(rid).pop / 4e6 + (state.factions[tr.owner].capital === rid ? 0.6 : 0) - plan.days / 60;
      if (!best || score > best.score) best = { rid, score };
    };
    for (const it of intents) if (it.kind === 'attack') consider(it.target, 3, it.minRatio);
    if (!best) {
      const near = new Set();
      for (const r of regions) for (const ed of ctx.graph[r.id]) near.add(ed.to);
      for (const rid of near) consider(rid, 0);
    }
    if (best) orders.moveArmy(state, ctx, fid, a.id, best.rid);
  }
}

module.exports = { aiTurn, threatTo, regionDefense };
