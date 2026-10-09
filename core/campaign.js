'use strict';
/** 每月的行军与交战结算 */
const { clamp, atWar, allied, armiesAt, ownedRegions, fmtNum } = require('./helpers');
const { edgeBetween, ROUTE_TYPES } = require('./geo');
const war = require('./war');

const MONTH_DAYS = 30;

function hostileAt(state, rid, fid) {
  const r = state.regions[rid];
  if (r.owner && atWar(state, r.owner, fid)) return true;
  return armiesAt(state, rid).some(a => a.troops > 0 && atWar(state, a.faction, fid));
}

function moveArmies(state, ctx, report) {
  const list = Object.values(state.armies).filter(a => a.route && a.route.length).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  for (const a of list) {
    let budget = MONTH_DAYS;
    const start = a.loc;
    a.engagedFrom = null;
    while (budget > 0 && a.route.length) {
      const next = a.route[0];
      const e = edgeBetween(ctx.graph, a.loc, next);
      if (!e) { a.route = []; break; }
      const nr = state.regions[next];
      if (nr.owner && !allied(state, nr.owner, a.faction) && !atWar(state, nr.owner, a.faction)) {
        report.push({ cat: '军', fid: a.faction, vis: [a.faction], text: `${a.name}行至${ctx.rs(a.loc).name}，前方${ctx.rs(next).name}属${state.factions[nr.owner].name}，两家未曾开战，不能擅入，就地驻扎。` });
        a.route = []; a.legDone = 0; break;
      }
      const remaining = e.days - (a.legDone || 0);
      if (remaining > budget) { a.legDone = (a.legDone || 0) + budget; budget = 0; break; }
      budget -= remaining;
      a.legDone = 0;
      const from = a.loc;
      a.loc = next;
      a.route.shift();
      if (hostileAt(state, next, a.faction)) { a.engagedFrom = from; a.route = []; break; }
    }
    if (!a.route.length) a.dest = null;
    if (a.loc !== start || a.legDone) a.movedTurn = state.turn;
  }
}

function sideArmies(state, rid, pred) {
  return armiesAt(state, rid).filter(a => a.troops > 0 && pred(a));
}

function battleText(ctx, state, res) {
  const A = state.factions[res.attackerFaction], D = state.factions[res.defenderFaction];
  const place = ctx.rs(res.rid).name;
  const win = res.attackerWins ? A : D;
  const lose = res.attackerWins ? D : A;
  const routes = res.routed.map(x => x.to ? `退往${ctx.rs(x.to).name}` : `无路可退，余众溃散`).filter((v, i, s) => s.indexOf(v) === i).join('、');
  return `${place}之战：${A.name}（${res.attackerGenerals.join('、')}，约${fmtNum(res.before.A)}人）攻${D.name}（${res.defenderGenerals.join('、') || '守军'}，约${fmtNum(res.before.D)}人）。`
    + `${win.name}胜，${lose.name}${routes || '败走'}。${A.name}折损约${fmtNum(res.lossA)}，${D.name}折损约${fmtNum(res.lossD)}。`
    + `（战前胜算：攻方约${Math.round(res.p * 100)}%${res.notes.length ? '；' + res.notes.join('，') : ''}）`;
}

function resolveCombat(state, ctx, report) {
  const rids = Object.keys(state.regions).sort();
  for (const rid of rids) {
    const r = state.regions[rid];
    const present = armiesAt(state, rid).filter(a => a.troops > 0);
    if (!present.length) { if (r.siege) r.siege = null; continue; }
    const owner = r.owner;
    const attackerFactions = [...new Set(present.map(a => a.faction))].filter(f => owner && atWar(state, f, owner));
    if (!attackerFactions.length) { if (r.siege && !present.some(a => a.faction === r.siege.by)) r.siege = null; continue; }
    attackerFactions.sort((x, y) => sideArmies(state, rid, a => a.faction === y).reduce((s, a) => s + a.troops, 0) - sideArmies(state, rid, a => a.faction === x).reduce((s, a) => s + a.troops, 0));
    for (const af of attackerFactions) {
      if (!atWar(state, af, r.owner)) continue;
      const attackers = sideArmies(state, rid, a => a.faction === af || (allied(state, a.faction, af) && atWar(state, a.faction, r.owner)));
      if (!attackers.length) continue;
      const defenders = sideArmies(state, rid, a => (a.faction === r.owner || allied(state, a.faction, r.owner)) && atWar(state, a.faction, af));
      const fromRid = attackers.find(a => a.engagedFrom)?.engagedFrom || null;
      if (defenders.length) {
        const res = war.fieldBattle(state, ctx, rid, attackers, defenders, `${rid}|${af}`, fromRid);
        const big = res.before.A + res.before.D >= 30000;
        report.push({ cat: '战', fid: af, vis: big ? 'all' : 'near', loc: rid, important: true, battle: res, text: battleText(ctx, state, res) });
        const wf = state.factions[res.attackerWins ? af : res.defenderFaction];
        const lf = state.factions[res.attackerWins ? res.defenderFaction : af];
        if (wf) { wf.stats.won++; if (wf.court) wf.court.support = clamp(wf.court.support + (big ? 6 : 2), 0, 100); }
        if (lf) { lf.stats.lost++; if (lf.court) lf.court.support = clamp(lf.court.support - (big ? 8 : 3), 0, 100); }
        if (!res.attackerWins) continue;
      }
      // 野战已胜或无野战：围城 / 入城
      const still = sideArmies(state, rid, a => a.faction === af);
      if (!still.length) continue;
      if (r.garrison <= 0) {
        const prev = r.owner;
        war.capture(state, ctx, rid, af, 'occupy');
        report.push({ cat: '战', fid: af, vis: 'near', loc: rid, important: true, text: `${state.factions[af].name}兵入${ctx.rs(rid).name}，${prev ? state.factions[prev].name + '已无守兵，' : ''}其地遂为${state.factions[af].name}所有。` });
        continue;
      }
      if (!r.siege || r.siege.by !== af) {
        r.siege = { by: af, months: 0 };
        report.push({ cat: '战', fid: af, vis: 'near', loc: rid, important: true, text: `${state.factions[af].name}兵临${ctx.rs(rid).name}城下，城中守兵约${fmtNum(r.garrison)}，${ctx.rs(rid).walls >= 2 ? '城坚' : '城小'}，存粮约可支${Math.max(0, Math.round(r.store))}月。` });
        if (!still.some(a => a.siegeMode === 'assault')) continue;
      }
      r.siege.months++;
      if (still.some(a => a.siegeMode === 'assault')) {
        const res = war.assault(state, ctx, rid, still, `${rid}|${af}|${r.siege.months}`);
        if (res.win) {
          const prev = r.owner;
          war.capture(state, ctx, rid, af, 'assault');
          report.push({ cat: '战', fid: af, vis: 'near', loc: rid, important: true, text: `${state.factions[af].name}强攻${ctx.rs(rid).name}，城破。攻方折损约${fmtNum(res.lossA)}，${state.factions[prev].name}守兵尽没。（城防×${res.wall}，攻城胜算约${Math.round(res.p * 100)}%）` });
        } else {
          report.push({ cat: '战', fid: af, vis: 'near', loc: rid, important: true, text: `${state.factions[af].name}强攻${ctx.rs(rid).name}不克，折损约${fmtNum(res.lossA)}；守方折损约${fmtNum(res.lossD)}，余众约${fmtNum(r.garrison)}。（城防×${res.wall}，攻城胜算约${Math.round(res.p * 100)}%）` });
        }
      } else {
        r.store -= 1;
        for (const a of still) { const d = Math.round(a.troops * 0.01); a.troops -= d; }
        r.garrison = Math.round(r.garrison * 0.99);
        if (r.store <= 0) {
          const prev = r.owner;
          const g = r.garrison;
          const months = r.siege.months;
          war.capture(state, ctx, rid, af, 'starve');
          report.push({ cat: '战', fid: af, vis: 'near', loc: rid, important: true, text: `${ctx.rs(rid).name}被围${months}月，城中粮尽，守兵约${fmtNum(g)}出降，${state.factions[af].name}得其地（原属${state.factions[prev].name}）。` });
        } else {
          report.push({ cat: '战', fid: af, vis: [af, r.owner], loc: rid, text: `${state.factions[af].name}围${ctx.rs(rid).name}已${r.siege.months}月，城中存粮约尚可支${Math.round(r.store)}月。` });
        }
      }
    }
  }
  // 清理覆没的军队，释放将领
  for (const a of Object.values(state.armies)) {
    if (a.troops < 50) {
      const f = state.factions[a.faction];
      if (f) { const g = f.generals.find(x => x.busy === a.id); if (g) g.busy = false; }
      delete state.armies[a.id];
    }
  }
}

/** 训练与士气恢复 */
function monthlyDrill(state, ctx) {
  for (const a of Object.values(state.armies)) {
    const r = state.regions[a.loc];
    const home = r.owner && allied(state, r.owner, a.faction);
    if (home && a.movedTurn !== state.turn) a.training = clamp(a.training + 0.025, 0, 0.85);
    if (home && !(a.hunger > 0.3)) a.morale = clamp(a.morale + (0.7 - a.morale) * 0.25, 0.05, 1);
    // 冬季野外作战的冻馁
    const st = ctx.rs(a.loc);
    if (!home && [11, 12, 1].includes(state.date.m) && st.lat > 34) {
      a.troops = Math.round(a.troops * 0.985);
      a.morale = clamp(a.morale - 0.03, 0.05, 1);
    }
    // 夏季南方暑湿疾疫（北方来的军队尤甚）
    if ([5, 6, 7, 8].includes(state.date.m) && st.lat < 31.5 && state.factions[a.faction].origin !== 'south' && !home) {
      a.troops = Math.round(a.troops * 0.97);
    }
  }
}

function factionEliminations(state, ctx, report) {
  for (const f of Object.values(state.factions)) {
    if (!f.alive) continue;
    if (ownedRegions(state, f.id).length) continue;
    f.alive = false;
    for (const a of Object.values(state.armies)) if (a.faction === f.id) delete state.armies[a.id];
    report.push({ cat: '史', fid: f.id, vis: 'all', important: true, text: `${f.name}已无寸土，${f.leader.name}${f.isPlayer ? '大势已去' : '势力覆亡'}。` });
  }
}

module.exports = { moveArmies, resolveCombat, monthlyDrill, factionEliminations, MONTH_DAYS, ROUTE_TYPES };
