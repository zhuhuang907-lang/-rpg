'use strict';
/**
 * 事件分三类，全都有因可循，不会凭空冒出怪事：
 * 1. 史事：剧本按史书排定的大事（含日期与出处）。「依史」模式下，条件成立就照史发生；
 *    条件不成立（比如你改变了局势）就不发生——历史因你而分岔。
 * 2. 天时：按地域与季节掷年景（旱、涝、蝗、丰），影响收成并可能致饥荒；最早在开局后的四月才判定。
 * 3. 人事：有史可考的人物在史载卒年病故；「推演」模式下无史载者按年龄自然老病。
 */
const { clamp, rel, ownedRegions, armiesOf, ageOf, fmtNum, MONTH_NAMES } = require('./helpers');
const { roll } = require('./rng');
const { addArmy, spawnFaction } = require('./spawn');
const { harvestShare } = require('./econ');

const ym = d => d.y * 12 + d.m;

/** 给剧本事件用的工具集：剧本只通过它改世界，便于审查 */
function makeHelpers(state, ctx, report) {
  const h = {
    state, ctx,
    date: state.date,
    isPlayer: fid => state.meta.player === fid,
    player: state.meta.player,
    mode: state.meta.mode,
    f: fid => state.factions[fid],
    alive: fid => !!(state.factions[fid] && state.factions[fid].alive),
    owner: rid => state.regions[rid].owner,
    region: rid => state.regions[rid],
    name: rid => ctx.rs(rid).name,
    leaderIs: (fid, name) => !!(state.factions[fid] && state.factions[fid].alive && state.factions[fid].leader.name === name),
    setLeader(fid, leader) {
      const f = state.factions[fid];
      f.leader = { ...leader };
      if (f.generals.some(g => g.name === leader.name)) {
        const g = f.generals.find(x => x.name === leader.name);
        g.isLeader = true;
      }
    },
    killGeneral(fid, name) {
      const f = state.factions[fid];
      if (!f) return;
      const g = f.generals.find(x => x.name === name);
      if (!g) return;
      g.alive = false;
      if (g.busy && state.armies[g.busy]) { state.armies[g.busy].general = '偏将'; state.armies[g.busy].name = '偏将部'; }
      g.busy = false;
    },
    addGeneral(fid, g) { const f = state.factions[fid]; if (f && !f.generals.some(x => x.name === g.name)) f.generals.push({ skill: 55, busy: false, alive: true, ...g }); },
    moveGeneral(from, to, name) {
      const F = state.factions[from], T = state.factions[to];
      if (!F || !T) return;
      const i = F.generals.findIndex(x => x.name === name);
      if (i < 0) return;
      const g = F.generals[i];
      if (g.busy && state.armies[g.busy]) { state.armies[g.busy].general = '偏将'; state.armies[g.busy].name = '偏将部'; }
      F.generals.splice(i, 1);
      T.generals.push({ ...g, busy: false });
    },
    hasGeneral: (fid, name) => !!(state.factions[fid] && state.factions[fid].generals.some(g => g.name === name && g.alive !== false)),
    setOwner(rid, fid, loyalty = 40) {
      const r = state.regions[rid];
      r.owner = fid; r.siege = null; r.capturedTurn = state.turn; r.loyalty = loyalty;
    },
    war(a, b) { const r = rel(state, a, b); r.war = true; r.ally = false; r.truce = 0; r.v = Math.min(r.v, -40); },
    peace(a, b, truce = 12) { const r = rel(state, a, b); r.war = false; r.truce = truce; },
    ally(a, b) { const r = rel(state, a, b); r.war = false; r.ally = true; r.v = Math.max(r.v, 40); },
    atWar: (a, b) => rel(state, a, b).war,
    relDelta(a, b, d) { const r = rel(state, a, b); r.v = clamp(r.v + d, -100, 100); },
    loyalty(rid, d, months = 6) { (state.regions[rid].mods = state.regions[rid].mods || []).push({ until: state.turn + months, loyalty: d, src: '史事' }); },
    loyaltyAll(fid, d, months = 6) { state.factions[fid].tempMods.push({ until: state.turn + months, loyalty: d, src: '史事' }); },
    support(fid, d) { const f = state.factions[fid]; if (f && f.court) f.court.support = clamp(f.court.support + d, 0, 100); },
    money(fid, d) { state.factions[fid].money = Math.max(0, state.factions[fid].money + d); },
    grain(fid, d) { state.factions[fid].grain = Math.max(0, state.factions[fid].grain + d); },
    armiesOf: fid => armiesOf(state, fid),
    regionsOf: fid => ownedRegions(state, fid),
    troopsNear(fid, rid) {
      // fid 在 rid 及其相邻地块的野战兵力
      const ids = new Set([rid, ...ctx.graph[rid].map(e => e.to)]);
      return armiesOf(state, fid).filter(a => ids.has(a.loc)).reduce((s, a) => s + a.troops, 0);
    },
    armyNear(fid, rid) {
      const ids = new Set([rid, ...ctx.graph[rid].map(e => e.to)]);
      return armiesOf(state, fid).filter(a => ids.has(a.loc)).sort((a, b) => b.troops - a.troops)[0] || null;
    },
    addArmy: opts => addArmy(state, opts),
    spawnFaction: opts => spawnFaction(state, opts),
    setIntents(fid, intents) { if (state.factions[fid]) state.factions[fid].intents = intents; },
    flag: (k, v = state.turn) => { state.flags[k] = v; },
    getFlag: k => state.flags[k],
    roll: tag => roll(state, 'ev|' + tag),
    say(text, opts = {}) { report.push({ cat: '史', vis: 'all', important: true, ...opts, text }); },
  };
  return h;
}

function fireEvent(state, ctx, ev, report) {
  const h = makeHelpers(state, ctx, report);
  state.fired[ev.id] = state.turn;
  if (ev.choice) {
    const fid = ev.choice.faction;
    if (state.meta.player === fid) {
      state.choices.push({
        id: 'ev-' + ev.id, kind: 'event', eventId: ev.id, title: ev.title,
        text: typeof ev.choice.text === 'function' ? ev.choice.text(h) : ev.choice.text,
        source: ev.source || '', options: ev.choice.options.map(o => ({ id: o.id, label: o.label, desc: o.desc || '', historical: !!o.historical })),
      });
      return;
    }
    const pick = ev.choice.options.find(o => o.id === ev.choice.aiPick) || ev.choice.options[0];
    const text = pick.run(h);
    if (text) report.push({ cat: '史', vis: ev.vis || 'all', important: true, text, source: ev.source });
    return;
  }
  const text = ev.run(h);
  if (text) report.push({ cat: '史', vis: ev.vis || 'all', important: true, text, source: ev.source });
}

function historicalEvents(state, ctx, report) {
  const now = ym(state.date);
  for (const ev of ctx.scn.events || []) {
    if (state.fired[ev.id] != null) continue;
    if (ev.mode === 'history' && state.meta.mode !== 'history') continue;
    const at = ym(ev.at);
    if (now < at || now > at + (ev.window || 0)) continue;
    const h = makeHelpers(state, ctx, report);
    let ok = true;
    try { ok = ev.when ? !!ev.when(h) : true; } catch (e) { ok = false; }
    if (!ok) {
      // 窗口最后一个月仍不成立：历史在此分岔，记一笔
      if (now === at + (ev.window || 0)) {
        state.fired[ev.id] = -1;
        if (ev.divergeText) report.push({ cat: '史', vis: ev.vis || 'all', text: ev.divergeText(h), diverge: true });
      }
      continue;
    }
    fireEvent(state, ctx, ev, report);
  }
}

function resolveEventChoice(state, ctx, choice, optionId, report) {
  const ev = (ctx.scn.events || []).find(e => e.id === choice.eventId);
  if (!ev) return;
  const opt = ev.choice.options.find(o => o.id === optionId) || ev.choice.options[0];
  const h = makeHelpers(state, ctx, report);
  const text = opt.run(h);
  if (text) report.push({ cat: '史', vis: ev.vis || 'all', important: true, text, source: ev.source });
}

/* ---------------- 天时 ---------------- */
const WEATHER = [
  { kind: '大旱', factor: 0.45, p: 0.04, text: '春夏不雨，赤地千里' },
  { kind: '旱', factor: 0.72, p: 0.09, text: '春夏少雨，禾稼受损' },
  { kind: '水', factor: 0.7, p: 0.08, river: true, text: '夏秋霖雨，河水泛溢' },
  { kind: '丰', factor: 1.18, p: 0.14, text: '雨旸时若，岁稔' },
];

function rollWeather(state, ctx, report) {
  if (state.date.m !== 4) return;
  const zones = [...new Set(ctx.scn.regions.map(r => r.zone))];
  const prev = state.weather || {};
  const next = {};
  for (const z of zones) {
    const scripted = (ctx.scn.disasters || []).find(d => d.y === state.date.y && d.zones.includes(z));
    let w;
    if (scripted && state.meta.mode === 'history') {
      w = { y: state.date.y, kind: scripted.kind, factor: scripted.factor, text: scripted.text, source: scripted.source };
    } else {
      const x = roll(state, 'weather|' + z);
      const hasRiver = ctx.scn.regions.some(r => r.zone === z && ['river', 'marsh'].includes(r.terrain));
      const pw = prev[z];
      let acc = 0;
      w = { y: state.date.y, kind: '平', factor: 1, text: '' };
      if (pw && pw.y === state.date.y - 1 && /旱/.test(pw.kind) && roll(state, 'locust|' + z) < 0.3) {
        w = { y: state.date.y, kind: '蝗', factor: 0.55, text: '去岁旱，今夏飞蝗蔽天' };
      } else {
        for (const k of WEATHER) {
          const p = k.river && !hasRiver ? k.p * 0.3 : k.p;
          acc += p;
          if (x < acc) { w = { y: state.date.y, kind: k.kind, factor: k.factor, text: k.text }; break; }
        }
      }
    }
    next[z] = w;
    if (w.kind !== '平') {
      const zoneName = (ctx.scn.zones && ctx.scn.zones[z]) || z;
      const owners = [...new Set(ctx.scn.regions.filter(r => r.zone === z).map(r => state.regions[r.id].owner).filter(Boolean))];
      report.push({ cat: '天时', vis: owners, zone: z, important: w.factor < 0.7, text: `${zoneName}${w.text}（${w.kind}）。${w.factor < 1 ? '今年收成恐只及常年' + Math.round(w.factor * 10) + '成。' : '今年可望丰收。'}${w.source ? '〔' + w.source + '〕' : ''}` });
    }
  }
  state.weather = next;
}

function famineCheck(state, ctx, report) {
  for (const r of Object.values(state.regions)) {
    if (!r.owner) continue;
    if (!harvestShare(ctx, r.id, state.date.m)) continue;
    const w = state.weather[ctx.zoneOf(r.id)];
    if (!w || w.y !== state.date.y || w.factor > 0.72) continue;
    if (r.famine > 0) continue;
    r.famine = w.factor < 0.6 ? 6 : 4;
    report.push({ cat: '民', fid: r.owner, vis: [r.owner], loc: r.id, important: true, text: `${ctx.rs(r.id).name}岁饥，民多流亡。若不开仓赈济，户口将减、民心将散。` });
  }
}

/** 战后与围城后的疾疫 */
function epidemicCheck(state, ctx, report) {
  if (![5, 6, 7, 8].includes(state.date.m)) return;
  for (const r of Object.values(state.regions)) {
    const st = ctx.rs(r.id);
    if (st.lat > 34) continue;
    const heavy = (r.siege && r.siege.months >= 2) || (r.lastWarTurn != null && state.turn - r.lastWarTurn <= 1);
    if (!heavy) continue;
    if (roll(state, 'plague|' + r.id) > 0.18) continue;
    r.pop = Math.round(r.pop * 0.97);
    let lost = 0;
    for (const a of Object.values(state.armies)) if (a.loc === r.id) { const d = Math.round(a.troops * 0.1); a.troops -= d; lost += d; }
    report.push({ cat: '天时', vis: 'near', loc: r.id, important: true, text: `${st.name}暑湿，大军久屯，疾疫流行，军中死者约${fmtNum(lost)}，百姓亦多病殁。` });
  }
}

/* ---------------- 人事：卒年 ---------------- */
function deaths(state, ctx, report) {
  const now = ym(state.date);
  const h = makeHelpers(state, ctx, report);
  for (const d of ctx.scn.deaths || []) {
    if (state.fired['death-' + d.name] != null) continue;
    if (ym(d) !== now) continue;
    if (d.mode === 'history' && state.meta.mode !== 'history') continue;
    state.fired['death-' + d.name] = state.turn;
    // 找到此人：可能是君主，也可能是将领
    let found = false;
    for (const f of Object.values(state.factions)) {
      if (!f.alive) continue;
      if (f.leader.name === d.name) {
        found = true;
        const succ = typeof d.successor === 'function' ? d.successor(h) : d.successor;
        if (succ) {
          h.setLeader(f.id, succ);
          h.support(f.id, -10);
          h.loyaltyAll(f.id, -5, 6);
          report.push({ cat: '史', vis: 'all', important: true, text: `${d.text || `${d.name}卒`}。${succ.name}继领其众${succ.title ? '，' + succ.title : ''}。`, source: d.source });
          if (d.after) d.after(h);
        } else {
          report.push({ cat: '史', vis: 'all', important: true, text: `${d.text || d.name + '卒'}。`, source: d.source });
        }
        h.killGeneral(f.id, d.name);
      } else if (f.generals.some(g => g.name === d.name && g.alive !== false)) {
        found = true;
        h.killGeneral(f.id, d.name);
        report.push({ cat: '史', vis: d.vis || [f.id], text: `${d.text || d.name + '病卒'}。`, source: d.source });
      }
      for (const adv of f.advisors || []) {
        if (adv.name === d.name && adv.alive !== false) {
          adv.alive = false; found = true;
          report.push({ cat: '史', vis: d.vis || [f.id], text: `${d.text || d.name + '卒'}。`, source: d.source });
        }
      }
    }
    if (!found) state.fired['death-' + d.name] = -1;
  }
  // 推演模式：无史载卒年的人按年龄自然老病
  if (state.meta.mode === 'free' && state.date.m === 1) {
    for (const f of Object.values(state.factions)) {
      if (!f.alive) continue;
      const age = ageOf(f.leader, state.date.y);
      if (age == null || age < 45) continue;
      const p = age < 55 ? 0.02 : age < 65 ? 0.05 : age < 75 ? 0.1 : 0.18;
      if (roll(state, 'age|' + f.leader.name) > p) continue;
      const heir = f.generals.filter(g => g.alive !== false && g.heir).sort((a, b) => (a.heir || 9) - (b.heir || 9))[0];
      const old = f.leader.name;
      if (heir) {
        h.setLeader(f.id, { name: heir.name, born: heir.born ?? null, title: f.leader.title });
        report.push({ cat: '史', vis: 'all', important: true, text: `${old}以${age}岁病卒，${heir.name}嗣位。` });
      } else {
        report.push({ cat: '史', vis: 'all', important: true, text: `${old}以${age}岁病卒，部众推举新主。` });
        f.leader = { name: f.name + '新主', born: null, title: f.leader.title };
      }
      h.support(f.id, -10);
    }
  }
}

module.exports = { makeHelpers, historicalEvents, resolveEventChoice, rollWeather, famineCheck, epidemicCheck, deaths, ym };
