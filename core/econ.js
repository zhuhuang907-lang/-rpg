'use strict';
/**
 * 钱粮与民生。原则：
 * - 赋税来自户口；户口会因饥荒、战乱、重赋而流失，也会因安定而缓慢恢复。
 * - 粮食在收获季入仓（北方夏麦秋粟，南方秋稻），平时只出不进。
 * - 兵要吃粮、要发饷；离开本土作战，运粮的人马沿途也要吃——「千里馈粮，士有饥色」。
 * - 民心（0~100）随赋役、饥荒、战事、政令缓慢变化；过低则户口流亡、乃至民变。
 */
const { clamp, ownedRegions, armiesOf, allied, armiesAt, atWar, fmtNum } = require('./helpers');
const { roll } = require('./rng');
const { supplyDistance } = require('./war');
const { spawnFaction } = require('./spawn');

const TAX = { low: { mult: 0.6, loyalty: 12, label: '轻' }, normal: { mult: 1, loyalty: 0, label: '常' }, heavy: { mult: 1.5, loyalty: -18, label: '重' } };

function loyaltyMult(r) { return clamp(r.loyalty / 60, 0.2, 1.1); }

function harvestShare(ctx, rid, m) {
  const r = ctx.rs(rid);
  const north = r.lat >= (ctx.scn.economy.southLat ?? 32.5);
  const table = north ? (ctx.scn.economy.harvestNorth || { 5: 0.35, 9: 0.65 }) : (ctx.scn.economy.harvestSouth || { 8: 1 });
  return table[m] || 0;
}

function regionMoneyIncome(state, ctx, r) {
  if (r.siege) return 0;
  const e = ctx.scn.economy;
  const f = state.factions[r.owner];
  const pct = 1 + ((f && f.mods.incomeMoneyPct) || 0) / 100;
  return r.pop * e.moneyTaxPerCapita / 12 * TAX[r.tax].mult * loyaltyMult(r) * pct;
}

function weatherFactor(state, ctx, rid) {
  const w = state.weather[ctx.zoneOf(rid)];
  return w && w.y === state.date.y ? w.factor : 1;
}

function regionHarvest(state, ctx, r, m) {
  const share = harvestShare(ctx, r.id, m);
  if (!share || r.siege) return 0;
  const e = ctx.scn.economy;
  const f = state.factions[r.owner];
  const pct = 1 + ((f && f.mods.incomeGrainPct) || 0) / 100;
  const war = (r.lastWarTurn != null && state.turn - r.lastWarTurn <= 3) ? 0.6 : 1;
  const tun = r.tuntian ? (e.tuntianMult || 2) : 1;
  return r.pop * e.grainTaxPerCapita * share * r.devel * TAX[r.tax].mult * loyaltyMult(r) * weatherFactor(state, ctx, r.id) * war * tun * pct;
}

/** 本月预估收支（给界面和谋士用，不改存档） */
function forecast(state, ctx, fid) {
  const f = state.factions[fid];
  const e = ctx.scn.economy;
  const regions = ownedRegions(state, fid);
  const money = regions.reduce((s, r) => s + regionMoneyIncome(state, ctx, r), 0);
  const garrison = regions.reduce((s, r) => s + r.garrison, 0);
  const armies = armiesOf(state, fid);
  const field = armies.reduce((s, a) => s + a.troops, 0);
  const upkeepPct = 1 + (f.mods.upkeepPct || 0) / 100;
  const pay = (garrison + field) * e.soldierPay * upkeepPct;
  let grainUse = garrison * e.soldierGrain;
  const campaigns = [];
  for (const a of armies) {
    const sd = supplyDistance(state, ctx, a);
    const hf = sd.haulFactor || 1.6;
    grainUse += a.troops * e.soldierGrain * hf;
    if (sd.days) campaigns.push({ id: a.id, haulFactor: hf });
  }
  // 距下次收获还有几个月、下次收获大约多少
  let nextHarvest = null;
  for (let k = 1; k <= 12; k++) {
    const m = ((state.date.m - 1 + k) % 12) + 1;
    const g = regions.reduce((s, r) => s + regionHarvest(state, ctx, r, m), 0);
    if (g > 0) { nextHarvest = { inMonths: k, month: m, grain: g }; break; }
  }
  const fixed = f.fixedCost || 0;
  return {
    moneyIn: money, moneyOut: pay + fixed, pay, fixed, grainUse, garrison, field,
    nextHarvest, runway: grainUse > 0 ? f.grain / grainUse : Infinity, campaigns,
  };
}

/** 月度结算：收钱、发饷、吃粮、收获 */
function monthlyEconomy(state, ctx, report) {
  const e = ctx.scn.economy;
  const m = state.date.m;
  for (const f of Object.values(state.factions)) {
    if (!f.alive) continue;
    const fc = forecast(state, ctx, f.id);
    f.money += fc.moneyIn - fc.moneyOut;
    f.lastMonth = { moneyIn: Math.round(fc.moneyIn), moneyOut: Math.round(fc.moneyOut), grainIn: 0, grainOut: 0 };
    // 收获
    let harvest = 0;
    for (const r of ownedRegions(state, f.id)) {
      const h = regionHarvest(state, ctx, r, m);
      if (h > 0) { harvest += h; if (r.walls >= 1) r.store = Math.min(12, r.store + 6); }
    }
    if (harvest > 0) {
      f.grain += harvest;
      f.lastMonth.grainIn = Math.round(harvest);
      report.push({ cat: '政', fid: f.id, vis: [f.id], text: `${f.name}收${m === 5 ? '夏麦' : m === 8 ? '秋稻' : '秋粮'}，入仓约${fmtNum(harvest)}${e.grainUnit}。` });
    }
    // 吃粮：先守军，再野战军（按运耗）
    const garrisonNeed = fc.garrison * e.soldierGrain;
    let grainOut = 0;
    if (f.grain >= garrisonNeed) { f.grain -= garrisonNeed; grainOut += garrisonNeed; }
    else {
      const ratio = f.grain / Math.max(1, garrisonNeed);
      grainOut += f.grain; f.grain = 0;
      for (const r of ownedRegions(state, f.id)) {
        const lost = Math.round(r.garrison * 0.06 * (1 - ratio));
        r.garrison -= lost; r.loyalty = clamp(r.loyalty - 4, 0, 100);
      }
      report.push({ cat: '军', fid: f.id, vis: [f.id], important: true, text: `${f.name}仓廪告罄，守军缺粮，各地守卒逃散。` });
    }
    for (const a of armiesOf(state, f.id)) {
      const sd = supplyDistance(state, ctx, a);
      const need = a.troops * e.soldierGrain;
      let cost = need * (sd.haulFactor || 1);
      let forage = 0;
      if (sd.haulFactor == null) {
        // 孤军深入，与本土断绝：只能就地征掠
        cost = Infinity;
        const r = state.regions[a.loc];
        forage = Math.min(need, r.pop * ([6, 7, 8, 9, 10].includes(m) ? 0.4 : 0.15) * e.grainTaxPerCapita / 12);
        r.loyalty = clamp(r.loyalty - 6, 0, 100);
      }
      if (cost !== Infinity && f.grain >= cost) { f.grain -= cost; grainOut += cost; a.hunger = Math.max(0, (a.hunger || 0) - 0.5); continue; }
      let fedFrac;
      if (cost === Infinity) fedFrac = forage / need;
      else { fedFrac = f.grain / cost; grainOut += f.grain; f.grain = 0; }
      const unfed = clamp(1 - fedFrac, 0, 1);
      if (unfed > 0.05) {
        a.hunger = clamp((a.hunger || 0) + unfed, 0, 2);
        const lost = Math.round(a.troops * 0.07 * unfed);
        a.troops -= lost;
        a.morale = clamp(a.morale - 0.2 * unfed, 0.05, 1);
        report.push({ cat: '军', fid: f.id, vis: [f.id], loc: a.loc, important: unfed > 0.4, text: `${a.name}${sd.haulFactor == null ? '粮道断绝，就地征掠' : '军粮不继'}，${lost ? '士卒逃亡约' + fmtNum(lost) + '人' : '士气低落'}。` });
      }
    }
    f.lastMonth.grainOut = Math.round(grainOut);
    if (f.money < 0) {
      // 发不出饷：欠饷，士气与朝议都受损
      f.money = 0;
      for (const a of armiesOf(state, f.id)) a.morale = clamp(a.morale - 0.06, 0.05, 1);
      if (f.court) f.court.support = clamp(f.court.support - 3, 0, 100);
      report.push({ cat: '政', fid: f.id, vis: [f.id], important: true, text: `${f.name}府库空虚，军饷拖欠，军心浮动。` });
    }
  }
}

/** 户口与民心 */
function monthlyPeople(state, ctx, report) {
  for (const r of Object.values(state.regions)) {
    const f = state.factions[r.owner];
    if (!f) continue;
    const st = ctx.rs(r.id);
    // 临时修正过期
    r.mods = (r.mods || []).filter(x => x.until > state.turn);
    const fmods = (f.tempMods || []).filter(x => x.until > state.turn);
    let target = 55 + TAX[r.tax].loyalty;
    if (f.capital === r.id) target += 12;
    if (r.famine > 0) target -= 25;
    if (r.siege) target -= 20;
    if (r.capturedTurn != null && state.turn - r.capturedTurn < 8) target -= 15 * (1 - (state.turn - r.capturedTurn) / 8);
    if (st.affinity && st.affinity !== r.owner && state.factions[st.affinity] && state.factions[st.affinity].alive) target -= 12;
    if (st.affinity && st.affinity === r.owner) target += 6;
    target += Math.min(8, r.garrison / Math.max(1, r.pop) * 400);
    target += ((f.court ? f.court.support : 50) - 50) / 6;
    for (const x of r.mods) target += x.loyalty || 0;
    for (const x of fmods) target += x.loyalty || 0;
    target = clamp(target, 0, 100);
    r.loyalty = clamp(r.loyalty + (target - r.loyalty) * 0.18, 0, 100);
    r.loyaltyTarget = Math.round(target);

    // 户口
    let g = 0.0005;                                   // 太平年景约年增 0.6%
    if (r.loyalty < 40) g -= 0.001;
    if (r.tax === 'heavy') g -= 0.0015;               // 重赋则逃亡
    if (r.famine > 0) g -= 0.008;
    if (r.siege) g -= 0.004;
    if (f.grain <= 0) g -= 0.001;
    r.pop = Math.max(1000, Math.round(r.pop * (1 + g)));
    if (r.famine > 0) {
      r.famine -= 1;
      if (r.famine === 0) report.push({ cat: '民', fid: r.owner, vis: [r.owner], loc: r.id, text: `${st.name}饥荒渐解。` });
    }
    // 守军操练
    if (!r.siege) r.garrisonTraining = clamp((r.garrisonTraining ?? 0.5) + 0.01, 0, 0.7);
  }
  for (const f of Object.values(state.factions)) {
    f.tempMods = (f.tempMods || []).filter(x => x.until > state.turn);
    if (f.court) f.court.support = clamp(f.court.support + (f.court.drift ?? 0.5) * (f.court.support < 50 ? 1 : 0.3), 0, 100);
  }
}

/** 民变：民心过低时按概率发生；守军足够则当场平定，不足则成割据 */
function monthlyUnrest(state, ctx, report) {
  for (const r of Object.values(state.regions)) {
    if (!r.owner || r.loyalty >= 28) continue;
    const st = ctx.rs(r.id);
    const p = (28 - r.loyalty) / 120;
    if (roll(state, 'unrest|' + r.id) >= p) continue;
    const rebels = Math.round(r.pop * 0.01);
    const owner = state.factions[r.owner];
    const label = (ctx.scn.rebelLabel && ctx.scn.rebelLabel(st)) || `${st.name}乱民`;
    const cause = r.famine > 0 ? '饥荒' : r.tax === 'heavy' ? '赋役繁重' : r.capturedTurn != null && state.turn - r.capturedTurn < 8 ? '新附未安' : '民心离散';
    if (r.garrison * (0.45 + 0.55 * (r.garrisonTraining ?? 0.5)) > rebels * 0.6) {
      const lost = Math.round(Math.min(r.garrison * 0.08, rebels * 0.3));
      r.garrison -= lost;
      r.pop = Math.round(r.pop * 0.99);
      r.loyalty = clamp(r.loyalty + 6, 0, 100);
      report.push({ cat: '民', fid: r.owner, vis: [r.owner], loc: r.id, important: true, text: `${st.name}因${cause}，${label}聚众约${fmtNum(rebels)}人作乱，为${owner.name}守军所平，守卒亦折损${fmtNum(lost)}。` });
    } else {
      const prev = r.owner;
      const nf = spawnFaction(state, {
        id: 'rebel-' + r.id, name: label, regions: [r.id], hostileTo: [prev],
        leader: { name: '（首领姓名失载）', born: null, title: '' }, origin: ctx.state.factions[prev].origin,
      });
      r.garrison = rebels; r.garrisonTraining = 0.25; r.loyalty = 45; r.siege = null; r.capturedTurn = state.turn;
      // 驻在当地的原主军队被迫撤出
      for (const a of armiesAt(state, r.id)) if (a.faction === prev) a.morale = clamp(a.morale - 0.2, 0.05, 1);
      if (owner.capital === r.id) {
        const rest = ownedRegions(state, prev).sort((a, b) => b.pop - a.pop);
        owner.capital = rest[0] ? rest[0].id : null;
      }
      report.push({ cat: '民', fid: prev, vis: 'near', loc: r.id, important: true, text: `${st.name}因${cause}，${nf.name}聚众约${fmtNum(rebels)}人据城自守，${owner.name}失其地。` });
    }
  }
}

module.exports = { TAX, forecast, monthlyEconomy, monthlyPeople, monthlyUnrest, regionMoneyIncome, regionHarvest, harvestShare };
