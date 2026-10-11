'use strict';
/**
 * 仿《历史模拟器：崇祯》的回合呈现（设计见 设计/02_回合循环.md、03_数值与人群.md、04_事件系统.md）：
 *   数值条（按身份五六项）· 人群满意度 · 案头来报（可能夸大、说谎、瞒报）·
 *   问人（各有立场私心、记得你听没听）· 建议簿 · 结算三层（回报可能失真 / 账目真实 / 风声）·
 *   仅 GM 知道的暗线（后果延迟、也可能不了了之）。
 *
 * 模型每回合在 JSON 里申报 meters / groups / reports / settlement / gmNotes，这里记账并拼成下一回合的材料。
 */
const cut = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '……' : t; };
const arr = v => (Array.isArray(v) ? v : []);

/* 各身份的数值条（03_数值与人群.md）：开局时让模型按此给初值 */
const METER_SPEC = {
  emperor: { meters: '国库（钱、粮）、内帑、民心、吏治、威望、军心', groups: '按朝代取：朝官各派、宗室、宦官或外戚、军队、农户、工商' },
  warlord: { meters: '府库、兵额实数、粮饷可支几月、地盘、部将忠心、名分', groups: '部将、士人、百姓、邻近势力' },
  official: { meters: '官库钱粮、上官考语、民望、胥吏掌控、私财、清名', groups: '上司、乡绅、胥吏、小民' },
  noble: { meters: '家资（钱、粮、田）、食邑或俸禄、朝中关系、宗族地位、名声、身体', groups: '宗族长辈、朝中权要、门客家仆、封地百姓' },
  commoner: { meters: '家资（钱、粮、田）、家中地位、名声、人情、身体', groups: '家人、邻里、官府差役、主家或佃户' },
};
function meterSpec(state) {
  const idm = state.identityModule || 'commoner';
  const role = String((state.protagonist && state.protagonist.role) || '');
  if (idm === 'warlord' && /将|校尉|都尉|千户|把总|守备|参将/.test(role) && !/节度|割据|自立|称王/.test(role)) {
    return { meters: '兵额（册上 / 实有）、粮饷、士气、主帅信任、私兵、身体', groups: '士卒、主帅、地方官、粮官' };
  }
  if (idm === 'commoner' && /商|贾|掌柜|牙人|行商|东家/.test(role)) return { meters: '本钱、存货、信用、官府关系、行内名声、身体', groups: '东家或伙计、同行、官府、主顾' };
  if (idm === 'commoner' && /士子|书生|举人|秀才|生员|监生|童生/.test(role)) return { meters: '学业、文名、盘缠、人脉、身体', groups: '师友、同年、荐主、家人' };
  return METER_SPEC[idm] || METER_SPEC.commoner;
}

const WORDS = v => (v >= 80 ? '感戴' : v >= 60 ? '安' : v >= 40 ? '平常' : v >= 25 ? '不满' : '怨');

/** 采纳时：数值、人群、案头、暗线记账 */
function applyDesk(state, draft) {
  const d = draft || {};
  const turn = (state.turn || 0) + 1;
  // 数值条
  const M = state.meters = state.meters && typeof state.meters === 'object' ? state.meters : {};
  for (const m of arr(d.meters).slice(0, 8)) {
    const k = String((m && (m.项 || m.name)) || '').trim().slice(0, 16);
    const v = String((m && (m.值 || m.value)) || '').trim().slice(0, 40);
    if (!k || !v) continue;
    const old = M[k] || { hist: [] };
    const why = String((m.因 || m.why) || '').trim().slice(0, 60);
    const chg = String((m.变 || m.delta) || '').trim().slice(0, 4);
    const changed = !!old.value && old.value !== v;
    if (old.value !== v) old.hist = arr(old.hist).concat([{ turn, from: old.value || '', to: v, why }]).slice(-6);
    M[k] = { value: v, delta: changed ? (chg || '变') : '', why: changed || !old.value ? why : (old.why || ''), turn, hist: old.hist };
  }
  // 人群满意度
  const G = state.groups = state.groups && typeof state.groups === 'object' ? state.groups : {};
  for (const g of arr(d.groups).slice(0, 8)) {
    const k = String((g && (g.人群 || g.name)) || '').trim().slice(0, 12);
    const v = Math.max(0, Math.min(100, Math.round(Number(g && (g.值 ?? g.value)))));
    if (!k || !Number.isFinite(v)) continue;
    const old = G[k];
    G[k] = { value: v, word: WORDS(v), delta: old ? v - old.value : 0, why: String((g.因 || g.why) || '').slice(0, 60) || (old && old.why) || '', turn };
  }
  // 案头：新的一批来报替换上一批（上一批没处理的，模型会在新来报里或暗线里交代）
  const reps = arr(d.reports).filter(r => r && (r.title || r.text)).slice(0, 4)
    .map(r => ({ title: cut(r.title, 16), from: cut(r.from, 30), form: cut(r.form, 6), text: cut(r.text, 320), deadline: cut(r.deadline, 40), turn }));
  if (reps.length) state.desk = reps;
  // 暗线：只有 GM 知道
  const notes = arr(d.gmNotes).map(x => cut(typeof x === 'string' ? x : JSON.stringify(x), 140)).filter(Boolean).slice(0, 5);
  if (notes.length) state.gmNotes = arr(state.gmNotes).concat(notes.map(t => ({ turn, text: t }))).slice(-15);
  for (const t of arr(d.gmNotesDone)) state.gmNotes = arr(state.gmNotes).filter(n => !String(n.text).includes(String(t).slice(0, 10)));
  // 问人记录：已经进了这一回合的，标记为已用
  for (const c of arr(state.consults)) if (!c.usedTurn) c.usedTurn = turn;
}

/* ===== 下一回合的材料 ===== */
function metersBlock(state, isOpening) {
  const spec = meterSpec(state);
  const M = state.meters || {};
  const G = state.groups || {};
  const ms = Object.entries(M);
  const gs = Object.entries(G);
  if (!ms.length || isOpening) {
    return `【数值条（本回合要在 meters、groups 里给出初值）】本身份看这几项：${spec.meters}；人群：${spec.groups}。`
      + '能用钱粮人数亩数表示的给具体数和单位，抽象的（名声、信任）给一个词；初值要合乎此人身份量级与本朝物价，拿不准的只给词（拮据 / 宽裕）。人群满意度 0–100。';
  }
  return '【数值条（以此为准；本回合有变化的在 meters / groups 里申报新值与原因，账目必须真实，与正文、回报对得上）】\n'
    + ms.map(([k, v]) => `· ${k}：${v.value}`).join('\n')
    + (gs.length ? '\n人群：' + gs.map(([k, v]) => `${k} ${v.value}（${v.word}）`).join('；') : '');
}

function deskBlock(state) {
  const d = arr(state.desk);
  if (!d.length) return '';
  return '【案头上的来报（上一回合末摆上来的；玩家这一步可能就是在处理其中某件，没处理的到期按「未处理」推演）】\n'
    + d.map(r => `· 「${r.title}」来自${r.from}（${r.form}）：${cut(r.text, 140)}${r.deadline ? '　期限：' + r.deadline : ''}`).join('\n');
}

function hiddenBlock(state) {
  const n = arr(state.gmNotes);
  if (!n.length) return '';
  return '【仅 GM 知道（玩家看不到；按真实情形决定这些暗线何时、以何种方式浮出，也可能不了了之；已了结的在 gmNotesDone 里写它的开头几个字）】\n'
    + n.map(x => `· 第${x.turn}轮：${x.text}`).join('\n');
}

function consultBlock(state) {
  const cs = arr(state.consults).filter(c => !c.usedTurn).slice(-4);
  if (!cs.length) return '';
  return '【这一步之前主角问过的人（他们记得主角听没听他们的：照做了的更亲近，问了不听的会有想法）】\n'
    + cs.map(c => `· 问${c.who}：「${cut(c.q, 60)}」　他答：${cut(c.reply, 120)}${arr(c.suggestions).length ? '　他的主意：' + c.suggestions.map(s => cut(s.text, 40)).join('；') : ''}`).join('\n');
}

/* ===== 问人 ===== */
function personCard(state, who) {
  const n = (state.npcs || []).find(x => x && x.name === who);
  const m = ((state.household && state.household.members) || []).find(x => x && x.name === who);
  const L = [];
  if (m) L.push(`${m.relation || '家人'}${m.age != null ? '，' + m.age + '岁' : ''}`);
  if (n) L.push(`${n.role || n.background || ''}${n.age != null ? '，' + n.age + '岁' : ''}${n.tie ? '，与主角：' + n.tie : ''}${/historical|real/.test(String(n.source)) ? '（史载真人）' : ''}`);
  const rep = arr(state.desk).find(r => String(r.from).includes(who));
  if (rep) L.push(`他刚递上来报「${rep.title}」`);
  const mem = (state.log || []).filter(l => l.speaker === 'GM' && String(l.text).includes(who)).slice(-3).map(l => `第${l.turn}轮：` + cut(String(l.text).slice(Math.max(0, String(l.text).indexOf(who) - 40)), 120));
  const past = arr(state.consults).filter(c => c.who === who).slice(-3).map(c => `第${c.turn}轮问过他「${cut(c.q, 30)}」`);
  return { line: L.filter(Boolean).join('；') || '身份见前文', memory: mem.concat(past) };
}

function askPrompt(state, who, q) {
  const c = state.clock || {};
  const p = state.protagonist || {};
  const card = personCard(state, who);
  const system = `你扮演一个历史人物，回答主角的问话。只输出 JSON，不加代码块：{"reply":"他的回答","suggestions":[{"text":"他出的一条主意，具体到谁去办、怎么办","risk":"稳|有把握|五五|难"}],"memo":"他心里没说出口的打算（玩家看不到）"}
要求：
1. 用这个人的身份、性格、说话方式回答，合乎本朝本年；他只知道他这个身份能知道的事，不知道的就说不知道或照传闻说。
2. 他有自己的立场和私心：给的主意对他自己有利的地方，他不会明说；他也可能说谎、夸大、隐瞒，但不会荒唐。
3. 回答直截了当，不客套、不说教；三到六句。主意一到三条，各有隐患，risk 写他觉得有几成把握。
4. 主角想做的事哪怕违法越权，他也按自己的利害和胆量回应：可能帮着出主意、可能劝阻、可能借机要好处、可能转身去告发——照他这个人的真实反应来。
5. 不出现现代词语，不写「据考」。`;
  const prompt = [
    `【此刻】${c.yearLabel || ''}（公元${c.gregorianYear}年）${c.month}月，${(state.location && state.location.full) || ''}。`,
    `【主角】${p.name || ''}，${p.role || ''}。`,
    `【被问的人】${who}：${card.line}`,
    card.memory.length ? `【他与主角打过的交道】\n${card.memory.join('\n')}` : '',
    deskBlock(state),
    `【前一回合的情形】${cut(((state.log || []).filter(l => l.speaker === 'GM').slice(-1)[0] || {}).text, 500)}`,
    `【主角问他】${q}`,
  ].filter(Boolean).join('\n\n');
  return { system, prompt };
}

/* ===== 润色：把大白话改写成合乎身份的文书 ===== */
function polishForm(state) {
  const idm = state.identityModule || 'commoner';
  return idm === 'emperor' ? '诏书或朱批' : idm === 'official' ? '批札、告示或公文' : idm === 'warlord' ? '军令或手札' : idm === 'noble' ? '手书或家令' : '口头吩咐或书信';
}
function polishPrompt(state, text) {
  const c = state.clock || {};
  const p = state.protagonist || {};
  const form = polishForm(state);
  return {
    system: `你替主角把他用大白话写的打算改写成${form}，合乎本朝本年的文体、称谓与制度。只输出改写后的正文，不加说明、不加标题。不改动他的意思、不添他没说的事；写明交给谁去办（他写了的照写，没写的按身份默认：皇帝交有司，官员交胥吏，平民自己或家人）。长度适中，三到八句。`,
    prompt: `【此刻】${c.yearLabel || ''}（公元${c.gregorianYear}年），${(state.location && state.location.full) || ''}。主角：${p.name || ''}，${p.role || ''}。\n【他的打算】${text}`,
  };
}

/** 个人面板与界面用 */
function deskView(state) {
  return {
    meters: Object.entries(state.meters || {}).map(([k, v]) => ({ k, ...v })),
    groups: Object.entries(state.groups || {}).map(([k, v]) => ({ k, ...v })),
    desk: arr(state.desk),
    consults: arr(state.consults).slice(-12),
    advice: arr(state.adviceBook),
  };
}

module.exports = { meterSpec, applyDesk, metersBlock, deskBlock, hiddenBlock, consultBlock, askPrompt, polishPrompt, polishForm, deskView, personCard };
