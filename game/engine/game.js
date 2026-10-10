'use strict';
/**
 * 一局游戏的全部流程：开场三拍 → 回合（看局势 / 案头 / 问人 / 拿主意 / 结算 / 新事）→ 收场。
 * 两种世界：现成剧本（data/scenarios/，离线可玩）与开局检索生成的世界（任意朝代、自定义身份）。
 * 数值只由办法结算并夹在上下限之内（账目真实）；大模型只负责写；生成的文字都要过时代把关。
 * 没有回合上限：主线快查到头时自动往后续查；过年长一岁，生老病死照规则走。
 */
const crypto = require('crypto');
const cal = require('./calendar');
const scenario = require('./scenario');
const World = require('./world');
const guard = require('./guard');
const history = require('./history');
const research = require('./research');
const search = require('./search');
const rules = require('./rules');
const llm = require('./llm');
const P = require('./prompts');

const CONSULTS_PER_TURN = 2;
const DOCKET_MAX = 5;
const RECAP_EVERY = 10;

// —————————————————— 工具 ——————————————————
function rng(seed) {
  let h = crypto.createHash('sha256').update(String(seed)).digest();
  let i = 0;
  return () => {
    if (i >= h.length - 4) { h = crypto.createHash('sha256').update(h).digest(); i = 0; }
    const v = h.readUInt32BE(i); i += 4;
    return v / 0x100000000;
  };
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function qian(n) {
  n = Math.round(n);
  const g = Math.floor(n / 1000), w = n % 1000;
  if (!g) return `${w}文`;
  return w ? `${g}贯${w}文` : `${g}贯`;
}
function word(stat, v) {
  if (!stat.scale) return '';
  const k = clamp(Math.floor(v / (100 / stat.scale.length)), 0, stat.scale.length - 1);
  return stat.scale[k];
}
function persona(s, w) { return { ...w.identity, ...(s.persona || {}) }; }
function unitOf(s, w) { const u = persona(s, w).unit; return u === 'season' ? 'season' : u === 'month' ? 'month' : 'xun'; }
function F(s, w, date, unit) { return cal.fmt(date || s.date, unit || unitOf(s, w), w.eras); }

// —————————————————— 新开局 ——————————————————
function blank(w, extra) {
  const idn = w.identity;
  const s = {
    id: crypto.randomBytes(6).toString('hex'), v: 2,
    created: Date.now(), updated: Date.now(), deliverClass: idn.deliverClass,
    date: { ...idn.start }, startDate: { ...idn.start }, turn: 0, phase: 'opening', beat: 0,
    age: idn.age, birthYear: idn.start.y - idn.age + 1, persona: {},
    stats: Object.fromEntries(idn.stats.map(x => [x.key, x.value])),
    statNotes: Object.fromEntries(idn.stats.filter(x => x.note).map(x => [x.key, x.note])),
    groups: Object.fromEntries(idn.groups.map(x => [x.key, x.value])),
    regions: JSON.parse(JSON.stringify(idn.regions || [])),
    deltas: {}, flags: {}, fired: {}, queue: [], hooks: [], alerted: {},
    people: Object.fromEntries(idn.people.map(p => [p.id, { memory: [], favor: 50 }])), extraPeople: [],
    met: [], docket: [], generated: {}, consultsLeft: 0, consults: [], notebook: [],
    decision: { text: '', polished: '', executor: idn.executorDefault, picks: [] },
    lastResult: null, mainline: {}, historyLog: [], gm: { issues: [] }, story: [], recaps: [],
    goals: (idn.goals || []).slice(0, 3).map((t, i) => ({ id: 'g' + (i + 1), text: t, progress: 0, done: false })),
    career: [], lookups: [], ending: null,
    research: { used: 0, max: search.conf().budget },
    ext: { mainline: [], guard: { terms: [], banned: [] }, eras: [], sources: [] },
    ...extra,
  };
  s.dateLabel = F(s, w, s.date, 'day');
  s.career.push({ date: s.dateLabel, text: `${idn.title}，${s.age}岁`, kind: 'start' });
  return s;
}

function newGame(scnId, identityId, mode = 'history') {
  const base = scenario.load(scnId);
  if (!base.identities[identityId]) throw new Error('没有这个身份：' + identityId);
  const s0 = { scenario: scnId, identity: identityId };
  const w = World.get(s0);
  const s = blank(w, { ...s0, mode });
  history.step(s, w, null, s.date);
  pushBeat(s, w, 0);
  return s;
}

/** 由开局检索得到的世界开一局 */
function newGameFromWorld(world, research0, mode = 'history') {
  const s0 = { scenario: null, identity: 'self', world, mode };
  const w = World.get(s0);
  const s = blank(w, s0);
  if (research0) s.research.used = research0.used;
  history.step(s, w, null, s.date);
  pushBeat(s, w, 0);
  return s;
}

function pushBeat(s, w, i) {
  const b = w.identity.opening[i];
  for (const id of b.meet || []) if (!s.met.includes(id)) s.met.push(id);
  s.beat = i;
  addStory(s, w, { kind: 'beat', beat: i, text: b.text });
}

function addStory(s, w, entry, { generated = false } = {}) {
  const issues = guard.check(entry.text, s.date, w.guard);
  if (issues.length) s.gm.issues.push({ turn: s.turn, date: F(s, w, s.date, 'day'), where: entry.kind, generated, issues, text: String(entry.text).slice(0, 80) });
  s.story.push({ turn: s.turn, date: s.phase === 'opening' ? F(s, w, s.date, 'day') : F(s, w), ...entry });
  if (s.story.length > 500) s.story.splice(0, s.story.length - 500);
}

/** 大模型生成 + 时代把关：不过关重写一次，仍不过关就用本地文字 */
async function generate(s, w, prompt, fallback, opts = {}) {
  if (!llm.enabled()) return { text: fallback, generated: false };
  for (let k = 0; k < 2; k++) {
    try {
      const extra = k ? `\n\n上一稿有这些问题，必须避免：${opts.lastIssues.map(x => x.term + '（' + x.why + '）').join('；')}` : '';
      const out = await llm.chat(prompt.system, prompt.user + extra, opts);
      if (opts.json) return { data: out, generated: true };
      const text = guard.scrub(out);
      const issues = guard.check(text, s.date, w.guard);
      if (!issues.length) return { text, generated: true };
      opts.lastIssues = issues;
      s.gm.issues.push({ turn: s.turn, where: '生成被拦', issues, text: text.slice(0, 80) });
    } catch (e) {
      s.gm.issues.push({ turn: s.turn, where: '大模型调用失败', issues: [{ kind: '接口', term: '', why: e.message }] });
      break;
    }
  }
  return { text: fallback, generated: false };
}

// —————————————————— 开场 ——————————————————
async function actBeat(s, w, { index, text }) {
  const idn = w.identity;
  const b = idn.opening[s.beat];
  if (s.phase !== 'opening' || !b.actions) throw new Error('现在不在开场的可行动阶段');
  const next = idn.opening[s.beat + 1];
  let label, bridge;
  if (index != null && b.actions[index]) {
    label = b.actions[index].label;
    bridge = b.actions[index].bridge;
  } else {
    label = String(text || '').slice(0, 200);
    if (!label) throw new Error('要做什么？');
    bridge = (await generate(s, w, P.bridge(s, w, label, next.text), b.actions[0].bridge)).text;
  }
  addStory(s, w, { kind: 'player', text: label });
  addStory(s, w, { kind: 'bridge', text: bridge });
  pushBeat(s, w, s.beat + 1);
  if (!idn.opening[s.beat].actions) await startTurn(s, w, null);
}

// —————————————————— 卡片 ——————————————————
function cardOf(s, w, item) {
  const idn = w.identity;
  const r = item.ref;
  if (r.kind === 'event') return (idn.events || []).find(e => e.id === r.id);
  if (r.kind === 'group') return (idn.groupEvents || []).find(e => e.id === r.id);
  if (r.kind === 'daily') return w.daily && w.daily[s.deliverClass === 'court' ? 'court' : 'commoner'].find(e => e.id === r.id);
  if (r.kind === 'pool') return w.daily && w.daily[s.deliverClass === 'court' ? 'courtPool' : 'commonerPool'].find(e => e.id === r.id);
  if (r.kind === 'gen') return s.generated[item.uid];
  if (r.kind === 'hook0') return w.hook;
  if (r.kind === 'weather') {
    const wc = w.weather.cards[s.deliverClass === 'court' ? 'court' : 'commoner'][r.id];
    return { ...wc, title: r.id, deadline: 0, arriveRegion: wc.region, approaches: [{ id: 'noted', label: '知道了，照常过日子', kw: [], eff: {}, report: '' }], ignore: { eff: {} }, arriveEff: wc.eff };
  }
  if (r.kind === 'mainline') {
    const m = w.mainline.find(x => x.id === r.id);
    if (!m) return null;
    const d = m.deliver[s.deliverClass];
    if (s.deliverClass === 'court' && m.choice && d.approaches && d.approaches.length) {
      return { title: d.title || m.title, from: d.from, form: d.form, text: d.text, deadline: 1, mainline: m.id, approaches: d.approaches, arriveRegion: d.region, ignore: { eff: { prestige: -1 }, report: '留中不下。', mainlineSet: 'shelved' } };
    }
    if (s.deliverClass === 'court' && m.choice) {
      const ppl = idn.people.filter(p => p.present !== false);
      const [p1, p2, p3] = [ppl[0], ppl[1], ppl[2]];
      return {
        title: m.title, from: d.from, form: d.form, text: d.text, deadline: 1, mainline: m.id, arriveRegion: d.region,
        approaches: [
          { id: 'follow', label: '准奏，照此施行', kw: ['准', '行', '照此', '施行', '可'], by: p1 ? { [p1.id]: '"此事可行，愿断然行之，勿为浮议所摇。"' } : {}, eff: { treasury: 3, admin: 1, 'g.censors': -5, 'g.council': -2 }, goal: s.goals[0] ? { [s.goals[0].id]: 8 } : undefined, report: '有司奉旨施行。', rumor: '已有人在写弹章。', mainlineSet: 'followed' },
          { id: 'reject', label: '不准', kw: ['不准', '驳', '罢', '不行'], by: p2 ? { [p2.id]: '"此事更张太骤，恐扰百姓，愿审之。"' } : {}, eff: { 'g.censors': 4, prestige: -1 }, report: '降还。', rumor: '', mainlineSet: 'rejected' },
          { id: 'defer', label: '交有司详议，再定', kw: ['详议', '再议', '商议', '缓'], by: p3 ? { [p3.id]: '"事体重大，宜令同议，徐观其便。"' } : {}, eff: {}, report: '诏有司详议。', rumor: '', carry: true },
        ],
        ignore: { eff: { prestige: -1 }, report: '留中不下。', mainlineSet: 'shelved' },
      };
    }
    return {
      title: d.title || m.title, from: d.from, form: d.form, text: d.text, deadline: 0, mainline: m.id,
      approaches: d.approaches && d.approaches.length ? d.approaches : [{ id: 'noted', label: '知道了', kw: [], eff: {}, report: '' }],
      ignore: { eff: {} }, arriveRegion: d.region,
    };
  }
  return null;
}

function addItem(s, w, ref, card, extra = {}) {
  if (!card) return;
  if (s.docket.some(d => d.ref.kind === ref.kind && d.ref.id === ref.id)) return;
  const uid = extra.uid || `${ref.kind}:${ref.id}@${s.turn}`;
  const text = typeof card.text === 'function' ? card.text(s) : card.text;
  s.docket.push({
    uid, ref, type: card.type || (ref.kind === 'mainline' ? '史事' : ref.kind === 'weather' ? '天时' : ref.kind === 'daily' ? '日常' : '人事'),
    title: card.title, from: card.from, form: card.form, text,
    deadline: card.deadline != null ? card.deadline : 1, arrived: s.turn, generated: !!extra.generated,
  });
  if (card.arriveEff) applyEff(s, w, card.arriveEff, card.title, []);
  if (card.onFire) card.onFire(s);
  applyRegion(s, card.arriveRegion);
  addStory(s, w, { kind: 'docket', title: card.title, text }, { generated: !!extra.generated });
}

// —————————————————— 回合开始：排案头 ——————————————————
async function startTurn(s, w, prevDate) {
  const idn = persona(s, w);
  s.phase = 'turn';
  s.turn += 1;
  s.consultsLeft = CONSULTS_PER_TURN;
  s.consults = [];
  s.decision = { text: '', polished: '', executor: idn.executorDefault || '自己', picks: [] };
  s.dateLabel = F(s, w, s.date, 'day');
  const rand = rng(s.id + '|turn|' + s.turn);

  // 往后续查：离已查到的范围不足一年
  if (llm.enabled() && w.horizon && cal.ord(s.date) + 365 >= cal.ord({ y: w.horizon.y, m: w.horizon.m || 12, d: 1 })) {
    try {
      const n = await research.extend(s, w, null, s.research);
      w = World.get(s);
      s.historyLog.unshift({ turn: s.turn, date: F(s, w), julian: cal.julian(s.date), checked: [], extend: `往后续查到 ${cal.yearLabel(w.horizon.y)}，新增史事 ${n} 条`, issues: [] });
    } catch (e) { s.gm.issues.push({ turn: s.turn, where: '续查失败', issues: [{ kind: '接口', term: '', why: e.message }] }); }
  }

  // 过年：长一岁、生老病死
  const tick = rules.yearTick(s, prevDate, rand);
  if (tick.ending) return finish(s, w, tick.ending);
  const hd = rules.historicalDeath(s, w.identity.death);
  if (hd) return finish(s, w, hd);

  s.docket = s.docket.filter(d => d.carry);
  for (const d of s.docket) d.carry = false;

  // 开局钩子（生成世界的第一件事）
  if (s.turn === 1 && w.hook) addItem(s, w, { kind: 'hook0', id: 'H0' }, w.hook);

  // 排队的回响（现成剧本的事件卡）
  const now = s.queue.filter(q => q.at <= s.turn);
  s.queue = s.queue.filter(q => q.at > s.turn);
  for (const q of now) {
    if (s.fired[q.id]) continue;
    s.fired[q.id] = s.turn;
    addItem(s, w, { kind: 'event', id: q.id }, (w.identity.events || []).find(e => e.id === q.id));
  }
  // 条件触发的本局事件
  for (const e of w.identity.events || []) {
    if (s.fired[e.id] || typeof e.when !== 'function') continue;
    let ok = false;
    try { ok = e.when(s); } catch { ok = false; }
    if (ok) { s.fired[e.id] = s.turn; addItem(s, w, { kind: 'event', id: e.id }, e); }
  }
  // 史事
  const { due, log } = history.step(s, w, prevDate, s.date);
  for (const m of due) addItem(s, w, { kind: 'mainline', id: m.id }, cardOf(s, w, { ref: { kind: 'mainline', id: m.id } }));
  // 人群过线
  const alerts = [];
  for (const g of w.identity.groupEvents || []) {
    if (s.fired[g.id]) continue;
    if (s.groups[g.group] < g.below) { s.fired[g.id] = s.turn; addItem(s, w, { kind: 'group', id: g.id }, g); }
  }
  for (const g of idn.groups) {
    if (s.groups[g.key] < 25 && !(s.alerted[g.key] && s.turn - s.alerted[g.key] < 6)) { s.alerted[g.key] = s.turn; alerts.push(`${g.label}满意度已到"怨"`); }
  }
  // 天时（现成剧本）
  if (w.weather && (idn.unit === 'season' || !prevDate || cal.SEASON(prevDate.m) !== cal.SEASON(s.date.m))) {
    const r = rand();
    let acc = 0;
    for (const x of w.weather.table[cal.SEASON(s.date.m)] || []) {
      acc += x.p;
      if (r < acc) { addItem(s, w, { kind: 'weather', id: x.kind }, cardOf(s, w, { ref: { kind: 'weather', id: x.kind } })); break; }
    }
  }
  // 节令（现成剧本）
  if (w.daily) {
    const xun = Math.floor((s.date.d - 1) / 10);
    for (const d of w.daily[s.deliverClass === 'court' ? 'court' : 'commoner'] || []) {
      const key = d.id + '@' + s.date.y;
      if (s.fired[key] || d.month !== s.date.m || s.date.leap) continue;
      if (d.xun != null && idn.unit === 'xun' && d.xun !== xun) continue;
      s.fired[key] = s.turn;
      addItem(s, w, { kind: 'daily', id: d.id }, d);
    }
  }
  // 到期的伏笔
  const hooksDue = s.hooks.filter(h => h.at <= s.turn);
  s.hooks = s.hooks.filter(h => h.at > s.turn);
  const sick = tick.events.includes('illness');
  if (llm.enabled()) {
    // 大模型写本回合的来报：补到四份；有伏笔、人群告急、生病时至少写一份
    const count = Math.min(3, Math.max(hooksDue.length || alerts.length || sick ? 1 : 0, 4 - s.docket.length));
    if (count > 0) await genDocket(s, w, count, { hooks: hooksDue, alerts, illness: sick });
  } else {
    if (sick) localGen(s, w, rules.illnessCard(s, w), 'ill');
    for (const h of hooksDue) localGen(s, w, { title: '旧事', from: '', form: '', type: '回响', text: h.text, deadline: 0, approaches: [{ id: 'noted', label: '知道了', eff: {} }], ignore: { eff: {} } }, 'hk');
  }
  // 家常池（现成剧本）
  const poolKey = s.deliverClass === 'court' ? 'courtPool' : 'commonerPool';
  if (s.docket.length < 2 && w.daily && w.daily[poolKey]) {
    const fresh = w.daily[poolKey].filter(x => !(s.fired[x.id] && s.turn - s.fired[x.id] < 20));
    if (fresh.length) {
      const x = fresh[Math.floor(rand() * fresh.length)];
      s.fired[x.id] = s.turn;
      addItem(s, w, { kind: 'pool', id: x.id }, { ...x, deadline: 0 });
    }
  }
  if (!s.docket.length) {
    localGen(s, w, {
      title: '无事', from: '', form: '', deadline: 0, type: '日常',
      text: idn.idm === 'emperor' ? '这一季没有急务。有司例行奏事，诸路平安。' : '这一阵没什么事。你可以找人说说话，或者自己拿个主意做点什么。',
      approaches: [], ignore: { eff: {} },
    }, 'quiet');
  }
  if (s.docket.length > DOCKET_MAX) {
    for (const d of s.docket.splice(DOCKET_MAX)) if (d.ref.kind === 'event') { s.queue.push({ id: d.ref.id, at: s.turn + 1 }); delete s.fired[d.ref.id]; }
  }

  if (s.turn % RECAP_EVERY === 0) await makeRecap(s, w);

  s.historyLog.unshift({
    turn: s.turn, date: F(s, w), julian: cal.julian(s.date), checked: log,
    issues: s.gm.issues.filter(i => i.turn === s.turn).map(i => ({ where: i.where, issues: i.issues })),
  });
  if (s.historyLog.length > 80) s.historyLog.length = 80;
}

function localGen(s, w, card, tag) {
  const uid = `gen:${tag}${s.turn}-${Object.keys(s.generated).length}@${s.turn}`;
  s.generated[uid] = card;
  addItem(s, w, { kind: 'gen', id: uid }, card, { uid });
}

async function genDocket(s, w, count, ctx) {
  const idn = persona(s, w);
  const r = await generate(s, w, P.turnDocket(s, w, count, { ...ctx, existing: s.docket.map(d => d.title) }), null, { json: true, maxTokens: 4000, timeoutMs: 120000 });
  const data = r.data || {};
  for (const [i, p] of (Array.isArray(data.newPeople) ? data.newPeople : []).slice(0, 2).entries()) {
    const id = String(p.id || '').toLowerCase().replace(/[^a-z0-9_]/g, '') || 'np' + s.turn + i;
    if (w.identity.people.some(x => x.id === id) || s.extraPeople.some(x => x.id === id)) continue;
    const np = { id, name: String(p.name || '').slice(0, 10), age: Number(p.age) || null, role: String(p.role || ''), stance: String(p.stance || ''), temper: String(p.temper || ''), sample: String(p.sample || ''), want: String(p.want || ''), betray: String(p.betray || ''), present: true, origin: '' };
    if (!np.name || guard.check([np.name, np.role, np.sample].join(' '), s.date, w.guard).length) continue;
    s.extraPeople.push(np);
    s.people[id] = { memory: [], favor: 50 };
  }
  const keys = new Set([...idn.stats.map(x => x.key), ...idn.groups.map(x => 'g.' + x.key)]);
  const pids = new Set([...w.identity.people.map(p => p.id), ...s.extraPeople.map(p => p.id)]);
  const cleanEff = (e, lim) => Object.fromEntries(Object.entries(e || {}).filter(([k, v]) => keys.has(k) && Number.isFinite(Number(v))).map(([k, v]) => [k, clamp(Number(v), -lim, lim)]));
  for (const [i, it] of (Array.isArray(data.items) ? data.items : []).slice(0, count).entries()) {
    const approaches = (Array.isArray(it.approaches) ? it.approaches : []).slice(0, 3).map((a, k) => ({
      id: String(a.id || 'a' + k).replace(/[^\w]/g, '') || 'a' + k, label: String(a.label || '').slice(0, 40), kw: [],
      by: Object.fromEntries(Object.entries(a.by || {}).filter(([pid]) => pids.has(pid)).map(([pid, t]) => [pid, String(t)])),
      eff: cleanEff(a.eff, 12), report: String(a.report || ''), rumor: String(a.rumor || ''),
      odds: rules.ODDS[a.odds] ? a.odds : undefined, oddsStat: keys.has(a.oddsStat) ? a.oddsStat : undefined,
      fail: a.fail ? { eff: cleanEff(a.fail.eff, 12), report: String(a.fail.report || '') } : undefined,
      then: (Array.isArray(a.then) ? a.then : []).filter(t => t && t.hook).slice(0, 2).map(t => ({ hook: String(t.hook).slice(0, 120), after: clamp(Number(t.after) || 2, 1, 6) })),
      goal: a.goal && typeof a.goal === 'object' ? Object.fromEntries(Object.entries(a.goal).filter(([g]) => s.goals.some(x => x.id === g)).map(([g, v]) => [g, clamp(Number(v) || 0, -30, 40)])) : undefined,
      become: a.become && a.become.title ? { title: String(a.become.title).slice(0, 30), place: a.become.place ? String(a.become.place) : undefined } : undefined,
      region: a.region && typeof a.region === 'object' ? a.region : undefined,
    })).filter(a => a.label);
    const whole = [it.title, it.text, ...approaches.flatMap(a => [a.label, a.report, a.rumor, a.fail && a.fail.report, ...Object.values(a.by)])].filter(Boolean).join('\n');
    const issues = guard.check(whole, s.date, w.guard);
    if (issues.length || !it.title || !it.text) { s.gm.issues.push({ turn: s.turn, where: '生成来报被拦', issues, text: String(it.title || '') }); continue; }
    const uid = `gen:${s.turn}-${i}@${s.turn}`;
    s.generated[uid] = { title: String(it.title).slice(0, 20), from: String(it.from || ''), form: String(it.form || ''), text: String(it.text), approaches, ignore: { eff: {} }, type: ['人事', '回响', '人群', '天时', '日常'].includes(it.type) ? it.type : '人事', deadline: clamp(Number(it.deadline) || 0, 0, 2), truth: String(it.truth || '') };
    addItem(s, w, { kind: 'gen', id: uid }, s.generated[uid], { uid, generated: true });
  }
  // 大模型没写到的伏笔与病，本地兜底，保证"后果一定回来"
  const echoes = s.docket.filter(d => d.arrived === s.turn && d.generated && d.type === '回响').length;
  for (const h of ctx.hooks.slice(echoes)) localGen(s, w, { title: '旧事', from: '', form: '', type: '回响', text: h.text, deadline: 0, approaches: [{ id: 'noted', label: '知道了', eff: {} }], ignore: { eff: {} } }, 'hk');
  if (ctx.illness && !s.docket.some(d => d.arrived === s.turn && /病|咳|热|痛/.test(d.title + d.text))) localGen(s, w, rules.illnessCard(s, w), 'ill');
}

async function makeRecap(s, w) {
  const since = (s.recaps[s.recaps.length - 1] || { turn: 0 }).turn;
  const entries = s.story.filter(e => e.turn > since && ['decision', 'result', 'docket'].includes(e.kind)).slice(-40);
  const fb = entries.filter(e => e.kind === 'decision' || e.kind === 'docket').slice(-6).map(e => (e.title ? e.title + '：' : '') + String(e.text).slice(0, 30)).join('；');
  const r = llm.enabled() ? await generate(s, w, P.recap(s, w, entries), fb) : { text: fb };
  s.recaps.push({ turn: s.turn, date: F(s, w), text: r.text });
}

// —————————————————— 问人 ——————————————————
function allPeople(s, w) { return w.identity.people.concat(s.extraPeople || []); }

function present(s, w) {
  const extra = typeof w.identity.presence === 'function' ? w.identity.presence(s) : {};
  const extraIds = new Set((s.extraPeople || []).map(p => p.id));
  return allPeople(s, w).filter(p => (extra[p.id] != null ? extra[p.id] : p.present !== false) && (s.met.includes(p.id) || extra[p.id] || extraIds.has(p.id)));
}

async function actConsult(s, w, { person, question }) {
  if (s.phase !== 'turn') throw new Error('还没到可以问人的时候');
  if (s.consultsLeft <= 0) throw new Error('这一回合能找的人已经找过了');
  const p = present(s, w).find(x => x.id === person);
  if (!p) throw new Error('这个人现在不在跟前');
  if (!s.met.includes(p.id)) s.met.push(p.id);
  s.consultsLeft -= 1;

  const pitches = [];
  for (const d of s.docket) {
    const c = cardOf(s, w, d);
    for (const a of (c && c.approaches) || []) {
      if (a.by && a.by[p.id]) pitches.push({ uid: d.uid, approachId: a.id, title: d.title, label: a.label, pitch: a.by[p.id], odds: a.odds ? rules.oddsWord(rules.roll(s, a, () => 1).p) : '' });
    }
  }
  const byItem = [];
  for (const x of pitches) {
    const g = byItem.find(y => y.uid === x.uid);
    if (g) g.lines.push(x.pitch); else byItem.push({ uid: x.uid, title: x.title, lines: [x.pitch] });
  }
  const small = (w.identity.smallTalk && w.identity.smallTalk[p.id]) || [p.sample || '"……"'];
  const fb = pitches.length
    ? byItem.map(g => (byItem.length > 1 ? `说到"${g.title}"——` : '') + g.lines.join(byItem.length > 1 || g.lines.length > 1 ? '\n又或者——' : '')).join('\n\n')
    : small[Math.floor(rng(s.id + p.id + s.turn)() * small.length)];
  const r = await generate(s, w, P.consult(s, w, p, question, s.docket, pitches), fb);
  const entry = { turn: s.turn, person: p.id, name: p.name, question: question || '', reply: r.text, suggestions: pitches.map(x => ({ uid: x.uid, approachId: x.approachId, title: x.title, label: x.label, person: p.name, odds: x.odds })) };
  s.consults.push(entry);
  addStory(s, w, { kind: 'consult', who: p.name, q: question || '', text: r.text }, { generated: r.generated });
  return entry;
}

function actNote(s, w, { uid, approachId, person, on = true }) {
  const d = s.docket.find(x => x.uid === uid);
  if (!d) throw new Error('案头上没有这件事');
  const c = cardOf(s, w, d);
  const a = (c.approaches || []).find(x => x.id === approachId);
  if (!a) throw new Error('没有这个办法');
  s.notebook = s.notebook.filter(n => n.uid !== uid || n.approachId !== approachId);
  if (on) s.notebook.push({ uid, approachId, title: d.title, label: a.label, person: person || '' });
  s.decision.picks = s.decision.picks.filter(x => x.uid !== uid);
  if (on) s.decision.picks.push({ uid, approachId });
}

// —————————————————— 拿主意 ——————————————————
async function actPolish(s, w, { text, executor }) {
  const idn = persona(s, w);
  text = String(text || '').trim();
  const ex = executor || s.decision.executor;
  const local = idn.idm === 'emperor' ? `敕${ex}：${text.replace(/[。．.]?$/, '')}。` : `（对${ex}）${text}`;
  const r = text ? await generate(s, w, P.polish(s, w, text, ex), local) : { text: '' };
  s.decision.text = text;
  s.decision.polished = r.text;
  s.decision.executor = ex;
  return r.text;
}

// —————————————————— 结算 ——————————————————
function applyRegion(s, upd) {
  for (const [name, cols] of Object.entries(upd || {})) {
    if (!cols || typeof cols !== 'object') continue;
    let r = s.regions.find(x => x.name === name);
    if (!r) { r = { name, cols: {} }; s.regions.push(r); }
    Object.assign(r.cols, Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, String(v)])));
  }
}

function applyEff(s, w, eff, why, ledger) {
  const idn = persona(s, w);
  for (const [k, v] of Object.entries(eff || {})) {
    if (!v) continue;
    if (k.startsWith('g.')) {
      const key = k.slice(2);
      if (!(key in s.groups)) continue;
      const before = s.groups[key];
      s.groups[key] = clamp(before + v, 0, 100);
      ledger.push({ key: k, label: idn.groups.find(g => g.key === key).label, before, after: s.groups[key], d: s.groups[key] - before, why });
    } else {
      if (!(k in s.stats)) continue;
      const st = idn.stats.find(x => x.key === k);
      const before = s.stats[k];
      s.stats[k] = st.scale ? clamp(before + v, 0, 100) : Math.max(0, before + v);
      ledger.push({ key: k, label: st.label, before, after: s.stats[k], d: s.stats[k] - before, why });
    }
  }
}

function matchApproach(text, approaches) {
  if (!text) return null;
  let best = null, score = 0;
  for (const a of approaches) {
    const sc = (a.kw || []).filter(k => text.includes(k)).length;
    if (sc > score) { score = sc; best = a; }
  }
  return best;
}

function scheduleThen(s, list) {
  for (const t of list || []) {
    if (Array.isArray(t)) s.queue.push({ id: t[0], at: s.turn + t[1] });
    else if (t && t.hook) s.hooks.push({ text: t.hook, at: s.turn + (t.after || 2) });
  }
}

async function actEndTurn(s, w, { text, executor } = {}) {
  if (s.phase !== 'turn') throw new Error('现在不能结束回合');
  const idn = persona(s, w);
  if (text != null) s.decision.text = String(text);
  if (executor) s.decision.executor = executor;
  const decisionText = s.decision.polished || s.decision.text || '';
  if (decisionText) addStory(s, w, { kind: 'decision', executor: s.decision.executor, text: decisionText });
  const rand = rng(s.id + '|resolve|' + s.turn);

  let mapped = {}, custom = {}, free = [], color = '';
  if (llm.enabled() && decisionText) {
    const items = s.docket.map(d => ({ ...d, approaches: ((cardOf(s, w, d) || {}).approaches || []) }));
    const r = await generate(s, w, P.resolve(s, w, items, s.decision), null, { json: true, maxTokens: 1500 });
    if (r.data) {
      mapped = r.data.map || {}; custom = r.data.custom || {}; free = Array.isArray(r.data.free) ? r.data.free.slice(0, 2) : [];
      color = guard.scrub(r.data.color || '');
    }
    if (color && guard.check(color, s.date, w.guard).length) color = '';
  }
  const keys = new Set([...idn.stats.map(x => x.key), ...idn.groups.map(x => 'g.' + x.key)]);
  const cleanEff = (e, lim) => Object.fromEntries(Object.entries(e || {}).filter(([k, v]) => keys.has(k) && Number.isFinite(Number(v))).slice(0, 2).map(([k, v]) => [k, clamp(Number(v), -lim, lim)]));
  const okText = t => (t && !guard.check(t, s.date, w.guard).length ? guard.scrub(t) : '');

  const ledger = [], reports = [], rumors = [], notes = [];
  const carry = [];
  for (const d of s.docket) {
    const c = cardOf(s, w, d);
    if (!c) continue;
    const approaches = c.approaches || [];
    const pick = s.decision.picks.find(x => x.uid === d.uid);
    let a = pick ? approaches.find(x => x.id === pick.approachId) : null;
    if (!a && mapped[d.uid] && mapped[d.uid] !== 'ignore' && mapped[d.uid] !== 'custom') a = approaches.find(x => x.id === mapped[d.uid]);
    if (!a && !mapped[d.uid]) a = matchApproach(decisionText, approaches);
    if (!a && mapped[d.uid] === 'custom' && custom[d.uid]) a = { id: 'custom', label: '自行处置', eff: cleanEff(custom[d.uid].eff, 6), report: okText(custom[d.uid].report) };
    if (!a) {
      if (d.deadline > 0 && approaches.length) { d.deadline -= 1; d.carry = true; carry.push(d); continue; }
      const ig = c.ignore || { eff: {} };
      applyEff(s, w, ig.eff, `${d.title}·未处理`, ledger);
      if (ig.report) reports.push({ title: d.title, text: ig.report, how: '未处理' });
      scheduleThen(s, ig.then);
      Object.assign(s.flags, ig.flags || {});
      if (c.mainline) s.mainline[c.mainline] = ig.mainlineSet || (s.mainline[c.mainline] === 'asked' ? 'delivered' : s.mainline[c.mainline]);
      applyRegion(s, ig.region);
      continue;
    }
    if (a.carry) { d.carry = true; carry.push(d); reports.push({ title: d.title, text: a.report, how: a.label }); continue; }
    const res = rules.roll(s, a, rand);
    const eff = res.ok ? a.eff : (a.fail ? a.fail.eff : Object.fromEntries(Object.entries(a.eff || {}).filter(([, v]) => v < 0)));
    applyEff(s, w, eff, `${d.title}·${a.label}${res.ok ? '' : '（没办成）'}`, ledger);
    if (res.ok) {
      Object.assign(s.flags, a.flags || {});
      scheduleThen(s, a.then);
      if (c.mainline) s.mainline[c.mainline] = a.mainlineSet || (s.mainline[c.mainline] === 'asked' ? 'delivered' : s.mainline[c.mainline]);
      applyRegion(s, a.region);
      notes.push(...rules.applyRuleFields(s, a, F(s, w, s.date, 'day')));
    }
    const rep = res.ok ? a.report : ((a.fail && a.fail.report) || '没办成。');
    if (rep) reports.push({ title: d.title, text: rep, how: a.label + (res.ok ? '' : '（没办成）') });
    if (res.ok && a.rumor) rumors.push(a.rumor);
    const pitched = {};
    for (const other of approaches) for (const pid of Object.keys(other.by || {})) (pitched[pid] = pitched[pid] || new Set()).add(other.id);
    for (const [pid, ids] of Object.entries(pitched)) {
      if (!s.people[pid] || !s.consults.some(x => x.person === pid)) continue;
      const used = ids.has(a.id);
      s.people[pid].memory.push(`${F(s, w)}，"${d.title}"${used ? '用了这人的主意' : '没听这人的'}`);
      if (s.people[pid].memory.length > 12) s.people[pid].memory.shift();
      s.people[pid].favor = clamp((s.people[pid].favor ?? 50) + (used ? 3 : -2), 0, 100);
    }
  }
  for (const f of free) {
    const rep = okText(f.report);
    if (!rep) continue;
    applyEff(s, w, cleanEff(f.eff, 6), '自己的打算', ledger);
    reports.push({ title: '自己的打算', text: rep, how: '' });
    if (f.hook) s.hooks.push({ text: String(f.hook).slice(0, 120), at: s.turn + clamp(Number(f.after) || 2, 1, 6) });
  }
  s.deltas = {};
  for (const l of ledger) s.deltas[l.key] = (s.deltas[l.key] || 0) + l.d;
  if (s.stats.dowry === 0) s.statNotes.dowry = '已失';

  const prevDate = { ...s.date };
  s.lastResult = { turn: s.turn, date: F(s, w), executor: s.decision.executor, reports, ledger: ledger.filter(l => l.d), rumors, color, notes };
  addStory(s, w, { kind: 'result', text: [color, ...reports.map(r => `【${r.title}】${r.text}`), ...rumors.map(r => '风声：' + r), ...notes.map(n => n.text)].filter(Boolean).join('\n') || '这一回合平平过去。' });

  const death = rules.checkDeath(s);
  if (death) return finish(s, w, death);
  const end = notes.find(n => n.kind === 'ending');
  if (end) return finish(s, w, { kind: 'ending', why: end.text });

  s.date = cal.advance(s.date, unitOf(s, w));
  s.docket = carry;
  s.notebook = [];
  await startTurn(s, w, prevDate);
}

/** 无事快进：连续过回合，直到案头出现非日常的事（最多 n 回合） */
async function actSkip(s, w, { n = 6 } = {}) {
  const trivial = d => ['日常', '天时'].includes(d.type) || d.ref.kind === 'pool' || d.title === '无事';
  let k = 0;
  const max = clamp(Number(n) || 6, 1, 24);
  while (k < max && s.phase === 'turn' && s.docket.every(trivial)) {
    await actEndTurn(s, World.get(s), {});
    k++;
  }
  return { skipped: k };
}

async function finish(s, w, ending) {
  s.phase = 'ended';
  s.dateLabel = F(s, w, s.date, 'day');
  s.career.push({ date: s.dateLabel, text: ending.why || '收场', kind: 'end' });
  const fb = rules.endingText(s, w, ending);
  const r = llm.enabled() ? await generate(s, w, P.biography(s, w, ending), fb) : { text: fb };
  s.ending = { ...ending, date: s.dateLabel, age: s.age, text: r.text };
  addStory(s, w, { kind: 'ending', text: r.text });
}

function actGoals(s, w, { goals }) {
  const list = (Array.isArray(goals) ? goals : []).map(x => String(x).trim()).filter(Boolean).slice(0, 3);
  if (!list.length) throw new Error('至少写一个志向');
  const old = s.goals || [];
  s.goals = list.map((t, i) => {
    const o = old.find(x => x.text === t);
    return o || { id: 'g' + (i + 1) + '_' + s.turn, text: t.slice(0, 40), progress: 0, done: false };
  });
  s.career.push({ date: s.dateLabel, text: '立志：' + list.join('；'), kind: 'goal-set' });
}

// —————————————————— 给前端的视图 ——————————————————
function view(s) {
  const w = World.get(s);
  const idn = persona(s, w);
  const op = w.identity.opening;
  const b = s.phase === 'opening' ? op[s.beat] : op[op.length - 1];
  const st = (s.phase === 'opening' ? b.status : { date: 'full', name: true }) || {};
  const status = {
    date: st.date === 'short' ? `${cal.monthLabel(s.date)}${cal.dayName(s.date.d)} · ${st.time || ''}` : s.phase === 'opening' ? F(s, w, s.date, 'day') : F(s, w),
    name: st.name ? idn.name : '',
    place: st.name ? (st.place ? `${idn.place} · ${st.place}` : idn.place) : '',
    title: st.name ? idn.title : '',
  };
  const revealed = s.phase !== 'opening' || s.beat >= op.length - 1;
  return {
    id: s.id, scenario: w.title, kind: w.kind, idm: idn.idm, unit: idn.unit,
    phase: s.phase, beat: s.beat, beats: op.length, turn: s.turn, status,
    age: s.age, calendar: { lunar: F(s, w, s.date, 'day'), julian: cal.julian(s.date) },
    beatActions: s.phase === 'opening' ? (b.actions || []).map(a => a.label) : [],
    story: s.story.slice(-80),
    revealed,
    stats: revealed ? idn.stats.map(x => ({
      key: x.key, label: x.label, value: s.stats[x.key],
      shown: x.fmt === 'qian' ? qian(s.stats[x.key]) : x.scale ? word(x, s.stats[x.key]) : `${s.stats[x.key]}${x.unit || ''}`,
      bar: x.scale ? s.stats[x.key] : null, note: s.statNotes[x.key] || '', d: s.deltas[x.key] || 0,
    })) : [],
    groups: revealed ? idn.groups.map(g => ({ key: g.key, label: g.label, value: s.groups[g.key], word: ['怨', '不满', '平常', '安', '感戴'][clamp(Math.floor(s.groups[g.key] / 20), 0, 4)], d: s.deltas['g.' + g.key] || 0 })) : [],
    regions: revealed ? s.regions : [],
    people: present(s, w).filter(p => s.met.includes(p.id) || s.phase !== 'opening').map(p => ({
      id: p.id, name: p.name, age: p.age, role: p.role, origin: p.origin, stance: p.stance, temper: p.temper, sample: p.sample,
      memory: (s.people[p.id] || { memory: [] }).memory.slice(-4),
      favor: (s.people[p.id] || {}).favor ?? 50,
    })),
    docket: s.phase === 'turn' ? s.docket.map(d => {
      const c = cardOf(s, w, d) || {};
      return { uid: d.uid, type: d.type, title: d.title, from: d.from, form: d.form, text: d.text, deadline: d.deadline, generated: !!d.generated, approachCount: (c.approaches || []).length };
    }) : [],
    consultsLeft: s.consultsLeft, consults: s.consults,
    notebook: s.notebook, decision: s.decision, executors: idn.executors,
    lastResult: s.lastResult, goals: s.goals, goalOptions: w.identity.goals || [],
    career: s.career.filter(c => c.kind !== 'age').slice(-20),
    ending: s.ending, recaps: s.recaps.slice(-5),
    llm: llm.enabled(), search: search.enabled(), research: s.research,
  };
}

function historyView(s) {
  const w = World.get(s);
  const now = cal.ord(s.date);
  const table = w.mainline.map(m => {
    const happened = cal.ord({ y: m.date.y, m: m.date.m, leap: false, d: 1 }) <= now;
    return {
      id: m.id, when: history.label(m, w.eras), title: m.title, confidence: m.confidence, scope: m.scope,
      happened, status: s.mainline[m.id] || '', fact: happened ? m.fact : '', source: happened ? m.source : [],
    };
  });
  return {
    table, log: s.historyLog, lookups: s.lookups || [],
    facts: (w.facts || []).map(f => ({ text: f.text, grade: f.grade || '二手', source: f.source || [] })),
    eras: w.eras.map(e => ({ name: e.name, start: cal.yearLabel(e.start), end: e.end != null ? cal.yearLabel(e.end) : '', grade: e.grade || '剧本' })),
    sources: (w.sources || []).slice(-60).map(c => ({ id: c.id, title: c.title, url: c.url, trust: c.trust })),
    horizon: w.horizon ? cal.yearLabel(w.horizon.y) : '',
    research: s.research, searchOn: search.enabled(),
    calendarNote: '公历为天文推算（1644年前定朔平气，1645年起定朔定气），与历代行用历法可能差一日；秦与汉初以十月为岁首，此处一律按正月为岁首编月。',
  };
}

async function act(s, a) {
  const w = World.get(s);
  s.updated = Date.now();
  if (s.phase === 'ended' && a.type !== 'lookup') throw new Error('这一局已经收场了');
  switch (a.type) {
    case 'beat': await actBeat(s, w, a); return {};
    case 'consult': return { consult: await actConsult(s, w, a) };
    case 'note': actNote(s, w, a); return {};
    case 'polish': return { polished: await actPolish(s, w, a) };
    case 'draft': s.decision.text = String(a.text || ''); if (a.executor) s.decision.executor = a.executor; s.decision.polished = ''; return {};
    case 'endTurn': await actEndTurn(s, w, a); return {};
    case 'skip': return await actSkip(s, w, a);
    case 'goals': actGoals(s, w, a); return {};
    case 'lookup': return { lookup: await research.lookup(s, w, a.question, s.research) };
    case 'retire': await finish(s, w, { kind: 'retire', why: String(a.why || '归隐') }); return {};
    default: throw new Error('未知的动作：' + a.type);
  }
}

module.exports = { newGame, newGameFromWorld, act, view, historyView };
