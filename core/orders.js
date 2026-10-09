'use strict';
/**
 * 所有「下令」都走这里：玩家和电脑势力用同一套规则、同一份校验。
 * 返回 { ok:true, text } 或 { ok:false, why }。
 */
const { clamp, atWar, allied, armiesAt, fmtNum } = require('./helpers');
const { addArmy } = require('./spawn');
const war = require('./war');

function fail(why) { return { ok: false, why }; }

function recruitCap(state, ctx, r) {
  const ratio = ctx.scn.economy.maxMilitaryRatio || 0.06;
  const here = r.garrison + armiesAt(state, r.id).filter(a => a.faction === r.owner).reduce((s, a) => s + a.troops, 0);
  return Math.max(0, Math.floor(r.pop * ratio - (r.levied || 0) - here * 0.5));
}

function recruit(state, ctx, fid, rid, n) {
  const r = state.regions[rid];
  const f = state.factions[fid];
  n = Math.floor(Number(n) || 0);
  if (!r || r.owner !== fid) return fail('只能在自己的地盘募兵。');
  if (r.siege) return fail('城被围困，无法募兵。');
  if (n < 100) return fail('至少募一百人。');
  const cap = recruitCap(state, ctx, r);
  if (n > cap) return fail(`${ctx.rs(rid).name}丁口有限，眼下至多可募约${fmtNum(cap)}人（再多则田地无人耕种）。`);
  const cost = n * ctx.scn.economy.recruitCost;
  if (f.money < cost) return fail(`募兵需钱约${fmtNum(cost)}${ctx.scn.economy.moneyUnit}，府库不足。`);
  f.money -= cost;
  r.recruiting = (r.recruiting || 0) + n;
  r.levied = (r.levied || 0) + n;
  r.pop -= n;
  r.mods = r.mods || [];
  r.mods.push({ until: state.turn + 3, loyalty: -Math.min(12, n / Math.max(1, r.pop) * 600), src: '征发' });
  return { ok: true, text: `于${ctx.rs(rid).name}募兵${fmtNum(n)}人，花费${fmtNum(cost)}${ctx.scn.economy.moneyUnit}，下月成军。` };
}

function idleGenerals(state, fid) {
  return state.factions[fid].generals.filter(g => g.alive !== false && !g.busy).sort((a, b) => b.skill - a.skill);
}

function formArmy(state, ctx, fid, rid, troops, general) {
  const r = state.regions[rid];
  const f = state.factions[fid];
  troops = Math.floor(Number(troops) || 0);
  if (!r || r.owner !== fid) return fail('只能从自己的城中调兵。');
  if (troops < 500) return fail('出征至少五百人。');
  if (troops > r.garrison) return fail(`${ctx.rs(rid).name}守兵只有约${fmtNum(r.garrison)}人。`);
  let g = general ? f.generals.find(x => x.name === general) : idleGenerals(state, fid)[0];
  if (general && !g) return fail('没有这位将领。');
  if (g && g.busy) return fail(`${g.name}已在统兵。`);
  if (g && g.alive === false) return fail(`${g.name}已不在人世。`);
  r.garrison -= troops;
  const a = addArmy(state, {
    faction: fid, loc: rid, troops, general: g ? g.name : '偏将', name: (g ? g.name : '偏将') + '部',
    training: r.garrisonTraining ?? 0.5, morale: 0.65,
  });
  return { ok: true, army: a, text: `${a.general}领兵${fmtNum(troops)}人于${ctx.rs(rid).name}成军。` };
}

function moveArmy(state, ctx, fid, armyId, target) {
  const a = state.armies[armyId];
  if (!a || a.faction !== fid) return fail('没有这支军队。');
  if (!state.regions[target]) return fail('没有这个地方。');
  if (target === a.loc) { a.route = []; a.dest = null; a.legDone = 0; return { ok: true, text: `${a.name}原地驻扎。` }; }
  const tr = state.regions[target];
  if (tr.owner && !allied(state, tr.owner, fid) && !atWar(state, tr.owner, fid)) {
    return fail(`${ctx.rs(target).name}属${state.factions[tr.owner].name}，两家并未交兵。要进兵须先在「外交」里宣战。`);
  }
  const plan = war.planRoute(state, ctx, a, target);
  if (!plan) return fail(`从${ctx.rs(a.loc).name}到${ctx.rs(target).name}没有可走的路（中途要经过别家的地盘或敌军所在之地）。`);
  a.route = plan.path.slice(1);
  a.dest = target;
  a.legDone = 0;
  const months = plan.days / 30;
  return { ok: true, plan, text: `${a.name}自${ctx.rs(a.loc).name}发兵往${ctx.rs(target).name}，路程约${plan.days}日（${months <= 1 ? '本月可到' : '约需' + Math.ceil(months) + '个月'}）。` };
}

function garrisonArmy(state, ctx, fid, armyId) {
  const a = state.armies[armyId];
  if (!a || a.faction !== fid) return fail('没有这支军队。');
  const r = state.regions[a.loc];
  if (r.owner !== fid) return fail('只能在自己的城里入驻。');
  const total = r.garrison + a.troops;
  r.garrisonTraining = ((r.garrisonTraining ?? 0.5) * r.garrison + a.training * a.troops) / Math.max(1, total);
  r.garrison = total;
  const g = state.factions[fid].generals.find(x => x.busy === a.id);
  if (g) g.busy = false;
  delete state.armies[a.id];
  return { ok: true, text: `${a.name}${fmtNum(a.troops)}人入${ctx.rs(r.id).name}城驻守。` };
}

function mergeArmies(state, ctx, fid, intoId, fromId) {
  const a = state.armies[intoId], b = state.armies[fromId];
  if (!a || !b || a.faction !== fid || b.faction !== fid) return fail('没有这支军队。');
  if (a.loc !== b.loc) return fail('两军不在一处，无法合兵。');
  const t = a.troops + b.troops;
  a.training = (a.training * a.troops + b.training * b.troops) / t;
  a.morale = (a.morale * a.troops + b.morale * b.troops) / t;
  a.troops = t;
  const g = state.factions[fid].generals.find(x => x.busy === b.id);
  if (g) g.busy = false;
  delete state.armies[b.id];
  return { ok: true, text: `两军合兵，${a.name}共${fmtNum(t)}人。` };
}

function setSiegeMode(state, ctx, fid, armyId, mode) {
  const a = state.armies[armyId];
  if (!a || a.faction !== fid) return fail('没有这支军队。');
  if (!['blockade', 'assault'].includes(mode)) return fail('未知的攻城方式。');
  a.siegeMode = mode;
  return { ok: true, text: `${a.name}改为${mode === 'assault' ? '强攻' : '围而不攻'}。` };
}

function setTax(state, ctx, fid, rid, level) {
  const r = state.regions[rid];
  if (!r || r.owner !== fid) return fail('只能定自己地盘的赋税。');
  if (!['low', 'normal', 'heavy'].includes(level)) return fail('未知的税等。');
  r.tax = level;
  return { ok: true, text: `${ctx.rs(rid).name}赋税改为${{ low: '轻', normal: '常', heavy: '重' }[level]}。` };
}

function changeGeneral(state, ctx, fid, armyId, name) {
  const a = state.armies[armyId];
  const f = state.factions[fid];
  if (!a || a.faction !== fid) return fail('没有这支军队。');
  const g = f.generals.find(x => x.name === name);
  if (!g || g.alive === false) return fail('没有这位将领。');
  if (g.busy && g.busy !== a.id) return fail(`${g.name}已在统领别军。`);
  const old = f.generals.find(x => x.busy === a.id);
  if (old) old.busy = false;
  g.busy = a.id;
  a.general = g.name;
  a.name = g.name + '部';
  return { ok: true, text: `改以${g.name}统领此军。` };
}

/** 月底：募来的兵入营 */
function settleRecruits(state) {
  for (const r of Object.values(state.regions)) {
    if (r.recruiting) {
      const n = r.recruiting;
      r.garrisonTraining = ((r.garrisonTraining ?? 0.5) * r.garrison + 0.2 * n) / Math.max(1, r.garrison + n);
      r.garrison += n;
      r.recruiting = 0;
    }
    if (r.levied) r.levied = Math.max(0, Math.round(r.levied * 0.97));
  }
}

module.exports = {
  recruit, recruitCap, formArmy, moveArmy, garrisonArmy, mergeArmies, setSiegeMode, setTax, changeGeneral,
  settleRecruits, idleGenerals,
};
