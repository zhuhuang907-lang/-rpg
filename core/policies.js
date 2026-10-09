'use strict';
/**
 * 政令：每条政令都写明代价、见效时间和副作用，效果由同一个解释器执行。
 * 剧本可以追加本时代特有的政令（如曹魏屯田、北宋新法）。
 *
 * effect 写法：{ after: 几个月后生效, type, value, months(持续月数，缺省为永久), scope:'region'|'all' }
 */
const { clamp, ownedRegions, armiesOf, fmtNum } = require('./helpers');
const { addArmy } = require('./spawn');

const GENERIC = [
  {
    id: 'relief', name: '开仓赈济', scope: 'region',
    desc: '发官仓粮米赈济饥民，止住流亡。', basis: '历代荒政常法。',
    cost: { grainPerPop: 0.25 }, cooldown: 3,
    can: (s, ctx, f, r) => (r.famine > 0 || r.loyalty < 50) ? null : '当地既无饥荒、民心尚可，不必赈济。',
    effects: [{ after: 0, type: 'cureFamine' }, { after: 0, type: 'loyalty', value: 18, months: 6 }],
  },
  {
    id: 'irrigation', name: '兴修水利', scope: 'region',
    desc: '征发民夫开渠筑陂，一年后田亩增产；施工期间徭役扰民。', basis: '如芍陂、郑白渠之类。',
    cost: { moneyPerPop: 0.4 }, cooldown: 24,
    can: (s, ctx, f, r) => r.devel >= 1.35 ? '此地水利已兴，再修收效甚微。' : null,
    effects: [{ after: 0, type: 'loyalty', value: -6, months: 4 }, { after: 12, type: 'devel', value: 0.1 }],
  },
  {
    id: 'walls', name: '修缮城防', scope: 'region',
    desc: '增筑城垣、深挖壕堑，四个月后城防加一等。', basis: '守城以城坚粮足为本。',
    cost: { moneyFixed: 15 }, cooldown: 6,
    can: (s, ctx, f, r) => r.walls >= 3 ? '城防已是最高一等。' : r.siege ? '城正被围，来不及修。' : null,
    effects: [{ after: 0, type: 'loyalty', value: -4, months: 4 }, { after: 4, type: 'walls', value: 1 }],
  },
  {
    id: 'granary', name: '积储军粮', scope: 'region',
    desc: '从总仓拨粮入此城仓，被围时可多守数月。', basis: '「城坚粮足」。',
    cost: { grainPerGarrison: 6 }, cooldown: 2,
    can: (s, ctx, f, r) => r.store >= 12 ? '城中存粮已足一年。' : null,
    effects: [{ after: 0, type: 'store', value: 6 }],
  },
  {
    id: 'settle', name: '招抚流民', scope: 'region',
    desc: '给牛种、免赋役，招流亡归业。半年后户口回升。', basis: '乱世恢复户口的常法。',
    cost: { moneyPerPop: 0.15, grainPerPop: 0.1 }, cooldown: 12,
    can: (s, ctx, f, r) => r.loyalty < 35 ? '民心太低，流民不敢归来。' : null,
    effects: [{ after: 6, type: 'pop', value: 0.04 }, { after: 0, type: 'loyalty', value: 5, months: 6 }],
  },
  {
    id: 'purge', name: '整饬吏治', scope: 'faction',
    desc: '遣使巡察，黜退贪墨。各地民心回升，但开罪一批官吏，朝议稍减。', basis: '刺史、采访使之职。',
    cost: { incomeMonths: 0.5 }, cooldown: 12, support: -6,
    effects: [{ after: 1, type: 'loyalty', scope: 'all', value: 6, months: 12 }],
  },
  {
    id: 'levy', name: '加征军资', scope: 'faction',
    desc: '临时加派钱粮以济军需，立得三个月收入，民怨随之。', basis: '历代战时加派。',
    cost: {}, cooldown: 12, support: -4,
    effects: [{ after: 0, type: 'moneyIncomeMonths', value: 3 }, { after: 0, type: 'loyalty', scope: 'all', value: -12, months: 8 }],
  },
  {
    id: 'drill', name: '大阅练兵', scope: 'faction',
    desc: '拨钱操练各处守军，三个月后战力提升。', basis: '「兵不在多而在精」。',
    cost: { moneyPerSoldier: 0.6 }, cooldown: 6,
    effects: [{ after: 3, type: 'training', value: 0.1 }],
  },
];

function allPolicies(ctx) {
  return [...GENERIC, ...(ctx.scn.policies || [])];
}

function costOf(state, ctx, f, r, p) {
  const c = p.cost || {};
  const e = ctx.scn.economy;
  const pop = r ? r.pop : ownedRegions(state, f.id).reduce((s, x) => s + x.pop, 0);
  const soldiers = ownedRegions(state, f.id).reduce((s, x) => s + x.garrison, 0) + armiesOf(state, f.id).reduce((s, a) => s + a.troops, 0);
  const inc = f.lastMonth ? f.lastMonth.moneyIn : 0;
  let money = 0, grain = 0;
  if (c.moneyPerPop) money += pop * c.moneyPerPop * e.moneyTaxPerCapita / 12;
  if (c.moneyFixed) money += c.moneyFixed * e.moneyTaxPerCapita / 12 * 1e5; // 单位：十万口一月的钱赋
  if (c.incomeMonths) money += inc * c.incomeMonths;
  if (c.moneyPerSoldier) money += soldiers * c.moneyPerSoldier * e.soldierPay;
  if (c.grainPerPop) grain += pop * c.grainPerPop * e.grainTaxPerCapita;
  if (c.grainPerGarrison && r) grain += Math.max(1000, r.garrison) * e.soldierGrain * c.grainPerGarrison;
  return { money: Math.round(money), grain: Math.round(grain) };
}

function check(state, ctx, fid, p, rid) {
  const f = state.factions[fid];
  if (p.factions && !p.factions.includes(fid)) return '此政令非本方所能行。';
  if (p.scope === 'region') {
    const r = state.regions[rid];
    if (!r || r.owner !== fid) return '须选一处自己的地方。';
    const cd = (r.cooldowns || {})[p.id];
    if (cd && cd > state.turn) return `此地刚行过此令，${cd - state.turn}个月后方可再行。`;
  } else {
    const cd = (f.cooldowns || {})[p.id];
    if (cd && cd > state.turn) return `此令刚行，${cd - state.turn}个月后方可再行。`;
    if (p.once && (f.enacted || []).includes(p.id)) return '此令已经颁行。';
  }
  if (p.after && (state.date.y * 12 + state.date.m) < (p.after.y * 12 + p.after.m)) return `时机未到（历史上约在${p.after.y}年${p.after.m}月前后才提出）。`;
  if (p.requires && !(f.enacted || []).includes(p.requires)) return '须先行前置政令。';
  if (p.minSupport && f.court && f.court.support < p.minSupport) return `朝议支持不足（需${p.minSupport}，现${Math.round(f.court.support)}）。`;
  if (p.can) { const why = p.can(state, ctx, f, rid ? state.regions[rid] : null); if (why) return why; }
  const c = costOf(state, ctx, f, rid ? state.regions[rid] : null, p);
  if (c.money > f.money) return `钱不足（需${fmtNum(c.money)}${ctx.scn.economy.moneyUnit}）。`;
  if (c.grain > f.grain) return `粮不足（需${fmtNum(c.grain)}${ctx.scn.economy.grainUnit}）。`;
  return null;
}

function applyEffect(state, ctx, fid, rid, eff, src) {
  const f = state.factions[fid];
  const targets = eff.scope === 'all' || !rid ? ownedRegions(state, fid) : [state.regions[rid]].filter(r => r && r.owner === fid);
  const until = eff.months ? state.turn + eff.months : state.turn + 9999;
  switch (eff.type) {
    case 'loyalty':
      if (eff.scope === 'all' || !rid) f.tempMods.push({ until, loyalty: eff.value, src });
      else for (const r of targets) (r.mods = r.mods || []).push({ until, loyalty: eff.value, src });
      break;
    case 'cureFamine': for (const r of targets) r.famine = 0; break;
    case 'devel': for (const r of targets) r.devel = clamp(r.devel + eff.value, 0.3, 1.5); break;
    case 'walls': for (const r of targets) r.walls = clamp(r.walls + eff.value, 0, 3); break;
    case 'store': for (const r of targets) r.store = clamp(r.store + eff.value, 0, 18); break;
    case 'pop': for (const r of targets) r.pop = Math.round(r.pop * (1 + eff.value)); break;
    case 'tuntian': for (const r of targets) r.tuntian = true; break;
    case 'training':
      for (const r of ownedRegions(state, fid)) r.garrisonTraining = clamp((r.garrisonTraining ?? 0.5) + eff.value, 0, 0.9);
      for (const a of armiesOf(state, fid)) a.training = clamp(a.training + eff.value, 0, 0.92);
      break;
    case 'troopsPct':
      for (const r of ownedRegions(state, fid)) r.garrison = Math.round(r.garrison * (1 + eff.value));
      break;
    case 'incomeMoneyPct': f.mods.incomeMoneyPct = (f.mods.incomeMoneyPct || 0) + eff.value; break;
    case 'incomeGrainPct': f.mods.incomeGrainPct = (f.mods.incomeGrainPct || 0) + eff.value; break;
    case 'upkeepPct': f.mods.upkeepPct = (f.mods.upkeepPct || 0) + eff.value; break;
    case 'fixedCostPct': f.fixedCost = Math.round((f.fixedCost || 0) * (1 + eff.value)); break;
    case 'support': if (f.court) f.court.support = clamp(f.court.support + eff.value, 0, 100); break;
    case 'moneyIncomeMonths': f.money += (f.lastMonth ? f.lastMonth.moneyIn : 0) * eff.value; break;
    case 'money': f.money += eff.value; break;
    case 'grain': f.grain += eff.value; break;
    case 'flag': state.flags[eff.value] = state.turn; break;
    case 'spawnArmy': {
      const at = eff.at && state.regions[eff.at] && state.regions[eff.at].owner === fid ? eff.at : f.capital;
      if (at) addArmy(state, { faction: fid, loc: at, troops: eff.troops, general: eff.general, name: eff.name, training: eff.training ?? 0.6, morale: 0.8 });
      if (eff.general && !f.generals.some(g => g.name === eff.general)) f.generals.push({ name: eff.general, skill: eff.skill || 60, note: eff.note || '', busy: false, alive: true });
      const army = Object.values(state.armies).find(a => a.faction === fid && a.general === eff.general);
      const g = f.generals.find(x => x.name === eff.general);
      if (g && army) g.busy = army.id;
      break;
    }
    default: throw new Error('未知的政令效果：' + eff.type);
  }
}

function enact(state, ctx, fid, policyId, rid) {
  const p = allPolicies(ctx).find(x => x.id === policyId);
  if (!p) return { ok: false, why: '没有这条政令。' };
  const why = check(state, ctx, fid, p, rid);
  if (why) return { ok: false, why };
  const f = state.factions[fid];
  const c = costOf(state, ctx, f, rid ? state.regions[rid] : null, p);
  f.money -= c.money; f.grain -= c.grain;
  if (p.support && f.court) f.court.support = clamp(f.court.support + p.support, 0, 100);
  if (p.scope === 'region') { const r = state.regions[rid]; r.cooldowns = r.cooldowns || {}; r.cooldowns[p.id] = state.turn + (p.cooldown || 1); }
  else { f.cooldowns[p.id] = state.turn + (p.cooldown || 1); }
  (f.enacted = f.enacted || []).push(p.id);
  for (const eff of p.effects || []) {
    if (eff.cond && !eff.cond(state, ctx, f)) continue;
    if (!eff.after) applyEffect(state, ctx, fid, rid, eff, p.name);
    else state.scheduled.push({ due: state.turn + eff.after, fid, rid: rid || null, policy: p.id, eff: { ...eff, cond: undefined } });
  }
  const where = rid ? ctx.rs(rid).name : f.name;
  const costTxt = [c.money ? `钱${fmtNum(c.money)}${ctx.scn.economy.moneyUnit}` : '', c.grain ? `粮${fmtNum(c.grain)}${ctx.scn.economy.grainUnit}` : ''].filter(Boolean).join('、');
  return { ok: true, text: `${where}行「${p.name}」${costTxt ? '，耗' + costTxt : ''}。${p.onEnactText ? p.onEnactText(state, ctx, f) : ''}` };
}

function runScheduled(state, ctx, report) {
  const due = state.scheduled.filter(x => x.due <= state.turn);
  state.scheduled = state.scheduled.filter(x => x.due > state.turn);
  for (const s of due) {
    const f = state.factions[s.fid];
    if (!f || !f.alive) continue;
    if (s.rid && state.regions[s.rid].owner !== s.fid) continue;
    applyEffect(state, ctx, s.fid, s.rid, s.eff, s.policy);
    const p = allPolicies(ctx).find(x => x.id === s.policy);
    if (p && s.eff.report !== false) {
      const txt = s.eff.text || EFFECT_TEXT[s.eff.type];
      if (txt) report.push({ cat: '政', fid: s.fid, vis: [s.fid], loc: s.rid, text: `${s.rid ? ctx.rs(s.rid).name : f.name}「${p.name}」${txt}` });
    }
  }
}

const EFFECT_TEXT = {
  devel: '工成，田亩增产。', walls: '工毕，城防加固一等。', pop: '见效，流民归业，户口回升。',
  training: '见效，士卒操练有成。', tuntian: '见效，屯田开始收谷。', incomeMoneyPct: '推行有效，岁入增加。',
  spawnArmy: '所请之兵已到。',
};

module.exports = { GENERIC, allPolicies, costOf, check, enact, runScheduled, applyEffect };
