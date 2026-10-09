'use strict';
/**
 * 一局游戏的全部流程：开场三拍 → 回合（看局势 / 案头 / 问人 / 拿主意 / 结算 / 新事）。
 * 数值只由事件卡结算（账目真实）；大模型只负责写口吻和额外来报，失败就用本地内容。
 */
const crypto = require('crypto');
const cal = require('./calendar');
const scenario = require('./scenario');
const guard = require('./guard');
const history = require('./history');
const llm = require('./llm');
const P = require('./prompts');

const CONSULTS_PER_TURN = 2;
const DOCKET_MAX = 5;

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
  const num = x => String(x).replace(/\d/g, c => '〇一二三四五六七八九'[c]);
  if (!g) return `${w}文`;
  return w ? `${g}贯${w}文` : `${g}贯`;
}
function word(stat, v) {
  if (!stat.scale) return '';
  const k = clamp(Math.floor(v / 25), 0, stat.scale.length - 1);
  return stat.scale[k];
}

// —————————————————— 新开局 ——————————————————
function newGame(scnId, identityId) {
  const scn = scenario.load(scnId);
  const idn = scn.identities[identityId];
  if (!idn) throw new Error('没有这个身份：' + identityId);
  const s = {
    id: crypto.randomBytes(6).toString('hex'),
    scenario: scnId, identity: identityId, deliverClass: idn.deliverClass,
    created: Date.now(), updated: Date.now(),
    date: { ...idn.start }, turn: 0, phase: 'opening', beat: 0,
    stats: Object.fromEntries(idn.stats.map(x => [x.key, x.value])),
    statNotes: Object.fromEntries(idn.stats.filter(x => x.note).map(x => [x.key, x.note])),
    groups: Object.fromEntries(idn.groups.map(x => [x.key, x.value])),
    regions: JSON.parse(JSON.stringify(idn.regions)),
    deltas: {}, flags: {}, fired: {}, queue: [],
    people: Object.fromEntries(idn.people.map(p => [p.id, { memory: [] }])),
    met: [], docket: [], generated: {}, consultsLeft: 0, consults: [], notebook: [],
    decision: { text: '', polished: '', executor: idn.executorDefault, picks: [] },
    lastResult: null, mainline: {}, historyLog: [], gm: { issues: [] }, story: [],
  };
  // 开局前的背景史事
  history.step(s, scn, null, s.date);
  pushBeat(s, scn, 0);
  return s;
}

function pushBeat(s, scn, i) {
  const idn = scn.identities[s.identity];
  const b = idn.opening[i];
  for (const id of b.meet || []) if (!s.met.includes(id)) s.met.push(id);
  s.beat = i;
  addStory(s, scn, { kind: 'beat', beat: i, text: b.text });
}

function addStory(s, scn, entry, { generated = false } = {}) {
  const issues = guard.check(entry.text, s.date, scn.guard);
  if (issues.length) s.gm.issues.push({ turn: s.turn, date: cal.fmt(s.date, 'day'), where: entry.kind, generated, issues, text: entry.text.slice(0, 80) });
  s.story.push({ turn: s.turn, date: cal.fmt(s.date, s.phase === 'opening' ? 'day' : unitOf(s, scn)), ...entry });
  if (s.story.length > 400) s.story.splice(0, s.story.length - 400);
}

function unitOf(s, scn) {
  const u = scn.identities[s.identity].unit;
  return u === 'season' ? 'season' : u === 'month' ? 'month' : 'xun';
}

/** 大模型生成 + 时代把关：不过关重写一次，仍不过关就用本地文字 */
async function generate(s, scn, prompt, fallback, opts = {}) {
  if (!llm.enabled()) return { text: fallback, generated: false };
  for (let k = 0; k < 2; k++) {
    try {
      const extra = k ? `\n\n上一稿有这些问题，必须避免：${opts.lastIssues.map(x => x.term + '（' + x.why + '）').join('；')}` : '';
      const out = await llm.chat(prompt.system, prompt.user + extra, opts);
      if (opts.json) return { data: out, generated: true };
      const text = guard.scrub(out);
      const issues = guard.check(text, s.date, scn.guard);
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
async function actBeat(s, scn, { index, text }) {
  const idn = scn.identities[s.identity];
  const b = idn.opening[s.beat];
  if (s.phase !== 'opening' || !b.actions) throw new Error('现在不在开场的可行动阶段');
  const next = idn.opening[s.beat + 1];
  let label, bridge;
  if (index != null && b.actions[index]) {
    label = b.actions[index].label;
    bridge = b.actions[index].bridge;
  } else {
    label = String(text || '').slice(0, 200);
    const fb = b.actions[0].bridge;
    bridge = (await generate(s, scn, P.bridge(s, scn, label, next.text), fb)).text;
  }
  addStory(s, scn, { kind: 'player', text: label });
  addStory(s, scn, { kind: 'bridge', text: bridge });
  pushBeat(s, scn, s.beat + 1);
  if (!idn.opening[s.beat].actions) await startTurn(s, scn, null);
}

// —————————————————— 卡片 ——————————————————
function cardOf(s, scn, item) {
  const idn = scn.identities[s.identity];
  const r = item.ref;
  if (r.kind === 'event') return idn.events.find(e => e.id === r.id);
  if (r.kind === 'group') return idn.groupEvents.find(e => e.id === r.id);
  if (r.kind === 'daily') return scn.daily[s.deliverClass === 'court' ? 'court' : 'commoner'].find(e => e.id === r.id);
  if (r.kind === 'pool') return scn.daily[s.deliverClass === 'court' ? 'courtPool' : 'commonerPool'].find(e => e.id === r.id);
  if (r.kind === 'gen') return s.generated[item.uid];
  if (r.kind === 'weather') {
    const w = scn.weather.cards[s.deliverClass === 'court' ? 'court' : 'commoner'][r.id];
    return { ...w, title: r.id, deadline: 0, arriveRegion: w.region, approaches: [{ id: 'noted', label: '知道了，照常过日子', kw: [], eff: {}, report: '' }], ignore: { eff: {} }, arriveEff: w.eff };
  }
  if (r.kind === 'mainline') {
    const m = scn.mainline.find(x => x.id === r.id);
    const d = m.deliver[s.deliverClass];
    if (s.deliverClass === 'court' && m.choice && d.approaches) {
      return { title: d.title || m.title, from: d.from, form: d.form, text: d.text, deadline: 1, mainline: m.id, approaches: d.approaches, arriveRegion: d.region, ignore: { eff: { prestige: -1 }, report: '留中不下。', mainlineSet: 'shelved' }, gm: `史实：${m.choice.history}（${m.confidence}）` };
    }
    if (s.deliverClass === 'court' && m.choice) {
      return {
        title: m.title, from: d.from, form: d.form, text: d.text, deadline: 1, mainline: m.id, arriveRegion: d.region,
        approaches: [
          { id: 'follow', label: '准奏，照此施行', kw: ['准', '行', '照此', '施行', '可'], by: { wang: '"此事可行，愿陛下断然行之，勿为浮议所摇。"' }, eff: { treasury: 3, admin: 1, 'g.censors': -5, 'g.council': -2 }, report: '中书奉旨施行。', rumor: '台谏中已有人在写弹章。', mainlineSet: 'followed' },
          { id: 'reject', label: '不准', kw: ['不准', '驳', '罢', '不行'], by: { sima: '"此事更张太骤，恐扰百姓，愿陛下审之。"' }, eff: { 'g.censors': 4, prestige: -1 }, report: '札子降还。', rumor: '', mainlineSet: 'rejected' },
          { id: 'defer', label: '下两府详议，再定', kw: ['详议', '再议', '商议', '缓'], by: { wen: '"事体重大，宜令两府同议，徐观其便。"' }, eff: {}, report: '诏两府详议。', rumor: '', carry: true },
        ],
        ignore: { eff: { prestige: -1 }, report: '札子留中不下。', mainlineSet: 'shelved' },
        gm: `史实：${m.choice.history}（${m.confidence}）`,
      };
    }
    return {
      title: d.title || m.title, from: d.from, form: d.form, text: d.text, deadline: 0, mainline: m.id,
      approaches: d.approaches || [{ id: 'noted', label: '知道了', kw: [], eff: {}, report: '' }],
      ignore: { eff: {} }, arriveRegion: d.region,
    };
  }
  return null;
}

function addItem(s, scn, ref, card) {
  if (!card) return;
  if (s.docket.some(d => d.ref.kind === ref.kind && d.ref.id === ref.id)) return;
  const uid = `${ref.kind}:${ref.id}@${s.turn}`;
  s.docket.push({
    uid, ref, type: card.type || (ref.kind === 'mainline' ? '史事' : ref.kind === 'weather' ? '天时' : ref.kind === 'daily' ? '日常' : '人事'),
    title: card.title, from: card.from, form: card.form,
    text: typeof card.text === 'function' ? card.text(s) : card.text,
    deadline: card.deadline != null ? card.deadline : 1, arrived: s.turn,
  });
  if (card.arriveEff) applyEff(s, scn, card.arriveEff, card.title, []);
  if (card.onFire) card.onFire(s);
  applyRegion(s, card.arriveRegion);
  if (ref.kind !== 'gen') addStory(s, scn, { kind: 'docket', title: card.title, text: typeof card.text === 'function' ? card.text(s) : card.text });
}

// —————————————————— 回合开始：排案头 ——————————————————
async function startTurn(s, scn, prevDate) {
  const idn = scn.identities[s.identity];
  s.phase = 'turn';
  s.turn += 1;
  s.consultsLeft = CONSULTS_PER_TURN;
  s.consults = [];
  s.decision = { text: '', polished: '', executor: idn.executorDefault, picks: [] };

  // 留在案头的旧事
  s.docket = s.docket.filter(d => d.carry);
  for (const d of s.docket) { d.carry = false; }

  // 排队的回响事件
  const now = s.queue.filter(q => q.at <= s.turn);
  s.queue = s.queue.filter(q => q.at > s.turn);
  for (const q of now) {
    if (s.fired[q.id]) continue;
    s.fired[q.id] = s.turn;
    addItem(s, scn, { kind: 'event', id: q.id }, idn.events.find(e => e.id === q.id));
  }
  // 条件触发的本局事件
  for (const e of idn.events) {
    if (s.fired[e.id]) continue;
    let ok = false;
    try { ok = e.when(s); } catch { ok = false; }
    if (ok) { s.fired[e.id] = s.turn; addItem(s, scn, { kind: 'event', id: e.id }, e); }
  }
  // 史事：本回合到达的
  const { due, log } = history.step(s, scn, prevDate, s.date);
  for (const m of due) addItem(s, scn, { kind: 'mainline', id: m.id }, cardOf(s, scn, { ref: { kind: 'mainline', id: m.id } }));
  // 人群过线
  for (const g of idn.groupEvents || []) {
    if (s.fired[g.id]) continue;
    if (s.groups[g.group] < g.below) { s.fired[g.id] = s.turn; addItem(s, scn, { kind: 'group', id: g.id }, g); }
  }
  // 天时：换季时掷一次（季回合每回合掷）
  if (scn.weather && (idn.unit === 'season' || !prevDate || cal.SEASON(prevDate.m) !== cal.SEASON(s.date.m))) {
    const r = rng(s.id + '|weather|' + s.turn)();
    let acc = 0;
    for (const w of scn.weather.table[cal.SEASON(s.date.m)] || []) {
      acc += w.p;
      if (r < acc) { addItem(s, scn, { kind: 'weather', id: w.kind }, cardOf(s, scn, { ref: { kind: 'weather', id: w.kind } })); break; }
    }
  }
  // 节令日常
  const xun = Math.floor((s.date.d - 1) / 10);
  for (const d of scn.daily[s.deliverClass === 'court' ? 'court' : 'commoner'] || []) {
    const key = d.id + '@' + s.date.y;
    if (s.fired[key]) continue;
    if (d.month !== s.date.m || s.date.leap) continue;
    if (d.xun != null && idn.unit === 'xun' && d.xun !== xun) continue;
    s.fired[key] = s.turn;
    addItem(s, scn, { kind: 'daily', id: d.id }, d);
  }
  // 家常池：案头不足两份时抽一份
  const poolKey = s.deliverClass === 'court' ? 'courtPool' : 'commonerPool';
  if (s.docket.length < 2 && scn.daily && scn.daily[poolKey]) {
    const fresh = scn.daily[poolKey].filter(x => !(s.fired[x.id] && s.turn - s.fired[x.id] < 20) && !(x.once && s.fired[x.id]));
    if (fresh.length) {
      const x = fresh[Math.floor(rng(s.id + '|pool|' + s.turn)() * fresh.length)];
      s.fired[x.id] = s.turn;
      addItem(s, scn, { kind: 'pool', id: x.id }, { ...x, deadline: 0 });
    }
  }
  // 大模型补充来报（"多做点"）：案头不足四份时补到四份，最多补两份
  if (llm.enabled() && s.docket.length < 4) await genExtra(s, scn, Math.min(2, 4 - s.docket.length));
  // 实在无事
  if (!s.docket.length) {
    addItem(s, scn, { kind: 'quiet', id: String(s.turn) }, {
      title: '无事', from: '', form: '', deadline: 0,
      text: idn.idm === 'emperor' ? '这一季没有急务。两府例行奏事，诸路平安。' : '这一旬家里没什么事。你可以找人说说话，或者自己拿个主意做点什么。',
      approaches: [], ignore: { eff: {} },
    });
    s.generated[s.docket[s.docket.length - 1].uid] = { approaches: [], ignore: { eff: {} } };
    s.docket[s.docket.length - 1].ref = { kind: 'gen', id: 'quiet' };
  }
  // 超出上限的推到下回合
  if (s.docket.length > DOCKET_MAX) {
    for (const d of s.docket.splice(DOCKET_MAX)) if (d.ref.kind === 'event') s.queue.push({ id: d.ref.id, at: s.turn + 1 }), delete s.fired[d.ref.id];
  }

  // 历史检索记录
  const online = await history.online(s, scn, s.date);
  s.historyLog.unshift({
    turn: s.turn, date: cal.fmt(s.date, unitOf(s, scn)), julian: cal.julian(s.date),
    checked: log, online,
    issues: s.gm.issues.filter(i => i.turn === s.turn).map(i => ({ where: i.where, issues: i.issues })),
  });
  if (s.historyLog.length > 60) s.historyLog.length = 60;
}

async function genExtra(s, scn, count) {
  const idn = scn.identities[s.identity];
  const r = await generate(s, scn, P.extraDocket(s, scn, count), null, { json: true, maxTokens: 2500 });
  const items = r.data && Array.isArray(r.data.items) ? r.data.items : [];
  const keys = new Set([...idn.stats.map(x => x.key), ...idn.groups.map(x => 'g.' + x.key)]);
  for (const [i, it] of items.slice(0, count).entries()) {
    const whole = [it.title, it.text, ...(it.approaches || []).flatMap(a => [a.label, a.report, a.rumor, ...Object.values(a.by || {})])].join('\n');
    const issues = guard.check(whole, s.date, scn.guard);
    if (issues.length) { s.gm.issues.push({ turn: s.turn, where: '生成来报被拦', issues, text: it.title }); continue; }
    const approaches = (it.approaches || []).slice(0, 3).map((a, k) => ({
      id: a.id || 'a' + k, label: String(a.label || '').slice(0, 40), kw: [],
      by: Object.fromEntries(Object.entries(a.by || {}).filter(([pid]) => idn.people.some(p => p.id === pid))),
      eff: Object.fromEntries(Object.entries(a.eff || {}).filter(([k2, v]) => keys.has(k2) && Number.isFinite(v)).map(([k2, v]) => [k2, clamp(v, -6, 6)])),
      report: String(a.report || ''), rumor: String(a.rumor || ''),
    }));
    const uid = `gen:${s.turn}-${i}@${s.turn}`;
    s.generated[uid] = { title: it.title, from: it.from, form: it.form, text: it.text, approaches, ignore: { eff: {} }, type: '人事', deadline: 0 };
    s.docket.push({ uid, ref: { kind: 'gen', id: `${s.turn}-${i}` }, type: '人事', title: it.title, from: it.from, form: it.form, text: it.text, deadline: 0, arrived: s.turn, generated: true });
  }
}

// —————————————————— 问人 ——————————————————
function present(s, scn) {
  const idn = scn.identities[s.identity];
  const extra = idn.presence ? idn.presence(s) : {};
  return idn.people.filter(p => (extra[p.id] != null ? extra[p.id] : p.present) && (s.met.includes(p.id) || extra[p.id]));
}

async function actConsult(s, scn, { person, question }) {
  if (s.phase !== 'turn') throw new Error('还没到可以问人的时候');
  if (s.consultsLeft <= 0) throw new Error('这一回合能找的人已经找过了');
  const idn = scn.identities[s.identity];
  const p = present(s, scn).find(x => x.id === person);
  if (!p) throw new Error('这个人现在不在跟前');
  if (!s.met.includes(p.id)) s.met.push(p.id);
  s.consultsLeft -= 1;

  const pitches = [];
  for (const d of s.docket) {
    const c = cardOf(s, scn, d);
    for (const a of (c && c.approaches) || []) {
      if (a.by && a.by[p.id]) pitches.push({ uid: d.uid, approachId: a.id, title: d.title, label: a.label, pitch: a.by[p.id] });
    }
  }
  const small = (idn.smallTalk && idn.smallTalk[p.id]) || [p.sample];
  const byItem = [];
  for (const x of pitches) {
    const g = byItem.find(y => y.uid === x.uid);
    if (g) g.lines.push(x.pitch); else byItem.push({ uid: x.uid, title: x.title, lines: [x.pitch] });
  }
  const fb = pitches.length
    ? byItem.map(g => (byItem.length > 1 ? `说到"${g.title}"——` : '') + g.lines.join(byItem.length > 1 || g.lines.length > 1 ? '\n又或者——' : '')).join('\n\n')
    : small[Math.floor(rng(s.id + p.id + s.turn)() * small.length)];
  const r = await generate(s, scn, P.consult(s, scn, p, question, s.docket, pitches), fb);
  const entry = { turn: s.turn, person: p.id, name: p.name, question: question || '', reply: r.text, suggestions: pitches.map(x => ({ uid: x.uid, approachId: x.approachId, title: x.title, label: x.label, person: p.name })) };
  s.consults.push(entry);
  addStory(s, scn, { kind: 'consult', who: p.name, q: question || '', text: r.text }, { generated: r.generated });
  return entry;
}

function actNote(s, scn, { uid, approachId, person, on = true }) {
  const d = s.docket.find(x => x.uid === uid);
  if (!d) throw new Error('案头上没有这件事');
  const c = cardOf(s, scn, d);
  const a = (c.approaches || []).find(x => x.id === approachId);
  if (!a) throw new Error('没有这个办法');
  s.notebook = s.notebook.filter(n => n.uid !== uid || n.approachId !== approachId);
  if (on) s.notebook.push({ uid, approachId, title: d.title, label: a.label, person: person || '' });
  // 采纳＝放进本回合的决定
  s.decision.picks = s.decision.picks.filter(x => x.uid !== uid);
  if (on) s.decision.picks.push({ uid, approachId });
}

// —————————————————— 拿主意 ——————————————————
async function actPolish(s, scn, { text, executor }) {
  const idn = scn.identities[s.identity];
  text = String(text || '').trim();
  const ex = executor || s.decision.executor;
  const local = idn.idm === 'emperor' ? `敕${ex}：${text.replace(/[。．.]?$/, '')}。` : `（对${ex === '自己' ? '自己' : ex}）${text}`;
  const r = text ? await generate(s, scn, P.polish(s, scn, text, ex), local) : { text: '' };
  s.decision.text = text;
  s.decision.polished = r.text;
  s.decision.executor = ex;
  return r.text;
}

// —————————————————— 结算 ——————————————————
/** 地方一览：{ 地名: { 栏: 文字 } }，没有这个地名就新加一行 */
function applyRegion(s, upd) {
  for (const [name, cols] of Object.entries(upd || {})) {
    let r = s.regions.find(x => x.name === name);
    if (!r) { r = { name, cols: {} }; s.regions.push(r); }
    Object.assign(r.cols, cols);
  }
}

function applyEff(s, scn, eff, why, ledger) {
  const idn = scn.identities[s.identity];
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

async function actEndTurn(s, scn, { text, executor } = {}) {
  if (s.phase !== 'turn') throw new Error('现在不能结束回合');
  const idn = scn.identities[s.identity];
  if (text != null) s.decision.text = String(text);
  if (executor) s.decision.executor = executor;
  const decisionText = s.decision.polished || s.decision.text || '';
  if (decisionText) addStory(s, scn, { kind: 'decision', executor: s.decision.executor, text: decisionText });

  // 大模型判读决定（可选）
  let mapped = {}, custom = {}, color = '';
  if (llm.enabled() && decisionText) {
    const items = s.docket.map(d => ({ ...d, approaches: (cardOf(s, scn, d).approaches || []) }));
    const r = await generate(s, scn, P.resolve(s, scn, items, s.decision), null, { json: true });
    if (r.data) { mapped = r.data.map || {}; custom = r.data.custom || {}; color = guard.scrub(r.data.color || ''); }
    if (color && guard.check(color, s.date, scn.guard).length) color = '';
  }

  const ledger = [], reports = [], rumors = [];
  const carry = [];
  for (const d of s.docket) {
    const c = cardOf(s, scn, d);
    if (!c) continue;
    const approaches = c.approaches || [];
    const pick = s.decision.picks.find(x => x.uid === d.uid);
    let a = pick ? approaches.find(x => x.id === pick.approachId) : null;
    if (!a && mapped[d.uid] && mapped[d.uid] !== 'ignore' && mapped[d.uid] !== 'custom') a = approaches.find(x => x.id === mapped[d.uid]);
    if (!a && !mapped[d.uid]) a = matchApproach(decisionText, approaches);
    if (!a && mapped[d.uid] === 'custom' && custom[d.uid]) {
      const cu = custom[d.uid];
      const keys = new Set([...idn.stats.map(x => x.key), ...idn.groups.map(x => 'g.' + x.key)]);
      const eff = Object.fromEntries(Object.entries(cu.eff || {}).filter(([k, v]) => keys.has(k) && Number.isFinite(v)).slice(0, 2).map(([k, v]) => [k, clamp(v, -5, 5)]));
      a = { id: 'custom', label: '自行处置', eff, report: guard.check(cu.report || '', s.date, scn.guard).length ? '' : guard.scrub(cu.report || '') };
    }
    if (!a) {
      if (d.deadline > 0 && approaches.length) { d.deadline -= 1; d.carry = true; carry.push(d); continue; }
      const ig = c.ignore || { eff: {} };
      applyEff(s, scn, ig.eff, `${d.title}·未处理`, ledger);
      if (ig.report) reports.push({ title: d.title, text: ig.report, how: '未处理' });
      for (const [id, after] of ig.then || []) s.queue.push({ id, at: s.turn + after });
      Object.assign(s.flags, ig.flags || {});
      if (c.mainline) s.mainline[c.mainline] = ig.mainlineSet || (s.mainline[c.mainline] === 'asked' ? 'delivered' : s.mainline[c.mainline]);
      applyRegion(s, ig.region);
      continue;
    }
    if (a.carry) { d.carry = true; carry.push(d); reports.push({ title: d.title, text: a.report, how: a.label }); continue; }
    applyEff(s, scn, a.eff, `${d.title}·${a.label}`, ledger);
    Object.assign(s.flags, a.flags || {});
    for (const [id, after] of a.then || []) s.queue.push({ id, at: s.turn + after });
    if (c.mainline) s.mainline[c.mainline] = a.mainlineSet || (s.mainline[c.mainline] === 'asked' ? 'delivered' : s.mainline[c.mainline]);
    applyRegion(s, a.region);
    if (a.report) reports.push({ title: d.title, text: a.report, how: a.label });
    if (a.rumor) rumors.push(a.rumor);
    // 人物记忆：问过的人，记得你这件事有没有听他的
    const pitched = {};
    for (const other of approaches) for (const pid of Object.keys(other.by || {})) (pitched[pid] = pitched[pid] || new Set()).add(other.id);
    for (const [pid, ids] of Object.entries(pitched)) {
      if (!s.people[pid] || !s.consults.some(x => x.person === pid)) continue;
      s.people[pid].memory.push(`${cal.fmt(s.date, unitOf(s, scn))}，"${d.title}"${ids.has(a.id) ? '用了这人的主意' : '没听这人的'}`);
    }
  }
  // 账目合并（同一项多次变化按条列出）
  s.deltas = {};
  for (const l of ledger) s.deltas[l.key] = (s.deltas[l.key] || 0) + l.d;
  for (const k of Object.keys(s.stats)) if (k === 'dowry' && s.stats[k] === 0) s.statNotes.dowry = '已失';

  const prevDate = { ...s.date };
  s.lastResult = { turn: s.turn, date: cal.fmt(s.date, unitOf(s, scn)), executor: s.decision.executor, reports, ledger: ledger.filter(l => l.d), rumors, color };
  addStory(s, scn, { kind: 'result', text: [color, ...reports.map(r => `【${r.title}】${r.text}`), ...rumors.map(r => '风声：' + r)].filter(Boolean).join('\n') || '这一回合平平过去。' });

  s.date = cal.advance(s.date, idn.unit);
  s.docket = carry;
  s.notebook = [];
  await startTurn(s, scn, prevDate);
}

// —————————————————— 给前端的视图 ——————————————————
function view(s) {
  const scn = scenario.load(s.scenario);
  const idn = scn.identities[s.identity];
  const b = s.phase === 'opening' ? idn.opening[s.beat] : idn.opening[idn.opening.length - 1];
  const st = (s.phase === 'opening' ? b.status : { date: 'full', name: true }) || {};
  const status = {
    date: st.date === 'short' ? `${cal.monthLabel(s.date)}${cal.dayName(s.date.d)} · ${st.time || ''}` : s.phase === 'opening' ? cal.fmt(s.date, 'day') : cal.fmt(s.date, unitOf(s, scn)),
    name: st.name ? idn.name : '',
    place: st.name ? (st.place ? `${idn.place} · ${st.place}` : idn.place) : '',
    title: st.name ? idn.title : '',
  };
  const revealed = s.phase !== 'opening' || s.beat >= idn.opening.length - 1;
  return {
    id: s.id, scenario: scn.title, identity: s.identity, idm: idn.idm, unit: idn.unit,
    phase: s.phase, beat: s.beat, beats: idn.opening.length, turn: s.turn, status,
    calendar: { lunar: cal.fmt(s.date, 'day'), julian: cal.julian(s.date) },
    beatActions: s.phase === 'opening' ? (b.actions || []).map(a => a.label) : [],
    story: s.story.slice(-80),
    revealed,
    stats: revealed ? idn.stats.map(x => ({
      key: x.key, label: x.label, value: s.stats[x.key],
      shown: x.fmt === 'qian' ? qian(s.stats[x.key]) : x.unit ? `${s.stats[x.key]}${x.unit}` : `${word(x, s.stats[x.key])}`,
      bar: x.scale ? s.stats[x.key] : null, note: s.statNotes[x.key] || '', d: s.deltas[x.key] || 0,
    })) : [],
    groups: revealed ? idn.groups.map(g => ({ key: g.key, label: g.label, value: s.groups[g.key], word: ['怨', '不满', '平常', '安', '感戴'][clamp(Math.floor(s.groups[g.key] / 20), 0, 4)], d: s.deltas['g.' + g.key] || 0 })) : [],
    regions: revealed ? s.regions : [],
    people: present(s, scn).filter(p => s.met.includes(p.id) || s.phase === 'turn').map(p => ({
      id: p.id, name: p.name, age: p.age, role: p.role, origin: p.origin, stance: p.stance, temper: p.temper, sample: p.sample,
      memory: s.people[p.id].memory.slice(-5),
    })),
    docket: s.phase === 'turn' ? s.docket.map(d => {
      const c = cardOf(s, scn, d) || {};
      return { uid: d.uid, type: d.type, title: d.title, from: d.from, form: d.form, text: d.text, deadline: d.deadline, generated: !!d.generated, approachCount: (c.approaches || []).length };
    }) : [],
    consultsLeft: s.consultsLeft, consults: s.consults,
    notebook: s.notebook, decision: s.decision, executors: idn.executors,
    lastResult: s.lastResult,
    llm: llm.enabled(),
  };
}

function historyView(s) {
  const scn = scenario.load(s.scenario);
  const now = cal.ord(s.date);
  const table = scn.mainline.map(m => {
    const happened = cal.ord({ y: m.date.y, m: m.date.m, leap: false, d: 1 }) <= now;
    return {
      id: m.id, when: history.label(m), title: m.title, confidence: m.confidence, scope: m.scope,
      happened, status: s.mainline[m.id] || '', fact: happened ? m.fact : '', source: happened ? m.source : [],
    };
  });
  return { table, log: s.historyLog, calendarNote: '公历为天文推算（定朔、平气置闰），与宋代行用历法可能差一日。' };
}

async function act(s, a) {
  const scn = scenario.load(s.scenario);
  s.updated = Date.now();
  switch (a.type) {
    case 'beat': await actBeat(s, scn, a); return {};
    case 'consult': return { consult: await actConsult(s, scn, a) };
    case 'note': actNote(s, scn, a); return {};
    case 'polish': return { polished: await actPolish(s, scn, a) };
    case 'draft': s.decision.text = String(a.text || ''); if (a.executor) s.decision.executor = a.executor; s.decision.polished = ''; return {};
    case 'endTurn': await actEndTurn(s, scn, a); return {};
    default: throw new Error('未知的动作：' + a.type);
  }
}

module.exports = { newGame, act, view, historyView };
