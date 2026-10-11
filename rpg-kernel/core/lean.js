'use strict';
/**
 * 精简写作链（2026-10-11 起为默认）。
 *
 * 为什么另起一条：旧链每回合给模型发 6~7 次、共约 4 万字、60 多段规则，其中一半是逼模型「造戏」的机关
 * （每轮必须有变数、对手暗中行动、代价、伏笔、篇章节拍、满格时钟……），还互相矛盾；
 * 喂进去的材料也有错（七十年前的旧事当新闻、几天后才发生的事当已发生、按随机模板编的人物利害与账目）。
 * 玩家的反馈是「剧情假、拖沓、牵强附会、身份乱给」。
 *
 * 这里只做三件事：
 *   ① 一份约一千二百字、不自相矛盾的 GM 规则（system）；
 *   ② 只给真实材料：此刻时地、主角档案、家人与身边的人（只有身份与关系）、近几年已传到此地的史事、
 *      本局改写过的历史、记忆与前两回合原文；
 *   ③ 一次调用，按 JSON 收稿。
 * 旧链仍在（存档 meta.legacyEngine = true 时使用），供高级玩家对照。
 */
const timeline = require('./timeline');
const figure = require('./figure-data');

const LEN = {
  short: '约 300～500 字',
  normal: '约 500～900 字',
  long: '约 1000～1600 字',
  nolimit: '写完这件事即止',
};

function gmRules(verbosity) {
  return `你是历史模拟的主持人（GM）。你写主角身边的世界与他人，不扮演主角。

一、主角归玩家
1. 主角只做玩家本轮写明的事、只说玩家写明的话。不写主角的心思、决定、表态和玩家没写的动作；至多写他看见、听见什么，以及「接过」「起身」这类必需的小动作。
2. 不替玩家选择，不给选项或建议，不替他了结任何事。

二、时间不跳
3. 只写这一刻到玩家这一步做完为止，不出当日。不写「次日」「数月后」，不概括「此后」。

三、剧情只有三个来源
4. 玩家这一步的直接结果。
5. 下文「已传到此地的史事」里列出的真实事件，以及它们落到本地的实际影响（诏令、征发、物价、人员往来）。没有列出的远方大事，此时此地无人知道。
6. 在场之人按其真实身份、职守与利害作出的正常反应：可以推诿、讨价、拒绝，但不突然反常，不知道他不该知道的事。
不新编密谋、刺探、背叛、巧合、伏笔或无史可据的冲突；不把无关的史事硬扯到一起；不在场的人只做史书记载的事。没什么大事时，就把眼前这件事写实，平淡也可以。

四、史实与称谓
7. 年号、官名、地名、礼制、器物、钱粮单位一律合乎本朝本年。人物的身份、年龄、亲属以下文档案为准，不改、不补、不另编。拿不准的细节换成拿得准的，或干脆不写；正文里不写「据考」「不详」。
8. 不出现现代词语和现代观念。
9. 数字非必要不写；要写就用约数，并与身份量级相符；不罗列账目。
10. 虚构人物不与史载真人同名，不写成真人的亲属、门生、部属；虚构的小人物见不到帝王将相。

五、文字
11. 平实白话，句子短，说事为主。比喻全篇不超过两处；不铺陈景物、光影、气氛，不写微表情和心理揣测。
12. 一回合只写一件事、两三个人；对话有来有回，各人口吻合乎身份。
13. 开场：先用三四句平实的叙述交代主角是谁、何年何月、身在何处、眼下与他相关的真实局势；随后一个具体的人带着一件具体的日常事务来到面前。之后每回合：第一句直接写玩家这一步的结果。
14. 写到有人等主角回话或拍板处即停。${LEN[verbosity] || LEN.normal}，写完即止，不凑字数。

六、输出
只输出一个 JSON 对象，不加代码块，不加任何说明：
{"scene":"正文","understood":"一句话复述玩家本轮意图，开场填空串","presentNpcs":[{"name":"","role":""}],"newNpcs":[{"name":"","gender":"","age":0,"role":"","tie":"与主角的关系"}],"statusChanges":[{"项":"钱/粮/田/宅/职官/爵位/健康/名望等","后":"变化后的值","原因":"正文里的哪件事"}],"historyChanges":[{"event":"史书原载的事","now":"本局实际变成了什么","cause":"玩家哪一步导致","person":"命运被改的真人（可空）","alive":true}],"doubts":["拿不准而回避了的细节"],"turnSummary":"本轮事实摘要，150字内","pendingDecision":"一句话说明此刻摆在主角面前的局面"}
statusChanges、historyChanges 没有就给 []；historyChanges 只在玩家的行动真把一件史载的事或一个真人的命运改了时才填。
正文里不得出现任何规则、自检、编号或引擎提示。`;
}

const cut = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '……' : t; };

/** 近几年、已传到此地的史事（不把几十年前的旧事当新闻，不把还没发生的事当已发生） */
function newsBlock(state) {
  const c = state.clock || {};
  const Y = Number(c.gregorianYear) || 0;
  const polity = (state.location && state.location.polity) || '';
  const place = (state.location && state.location.full) || '';
  const dv = require('./divergence');
  const asPlayed = e => { const ch = dv.changedEvent(state, e.text); return ch ? `本局实际：${ch.now}（史书原载「${cut(e.text, 30)}」未照此发生）` : e.text; };
  const lines = [];
  if (Y && timeline.EVENTS.some(e => e.polity === polity)) {
    const k = timeline.knownAt(polity, place, Y, c.month, c.day);
    const recent = k.known.filter(e => e.y >= Y - 3);
    for (const e of recent.slice(-8)) lines.push(`· ${e.y}年${e.m ? e.m + '月' : ''}：${asPlayed(e)}`);
    for (const e of k.rumored.filter(e => e.y >= Y - 1 && !dv.changedEvent(state, e.text)).slice(-2)) lines.push(`· 传闻（未经证实）：${e.text}`);
  }
  // 联网查到的本年大事：只取已到月份的；月份不明的标「未必已传到」
  const h = Y && state.liveHistory && state.liveHistory[Y];
  if (h && Array.isArray(h.lines) && h.lines.length) {
    const seen = new Set(lines.map(l => l.slice(0, 12)));
    for (const l of h.lines.slice(0, 8)) {
      if (l.source === 'timeline') continue;
      if (l.m && c.month && l.m > c.month) continue;
      const t = `· ${Y}年${l.m ? l.m + '月' : ''}：${asPlayed(l)}${l.m ? '' : '（月份不明，未必已传到此地）'}`;
      if (!seen.has(t.slice(0, 12))) lines.push(t);
    }
  }
  return lines.length
    ? `【已传到此地的史事（近几年；以外的远方大事此时此地无人知道）】\n${lines.join('\n')}`
    : '【已传到此地的史事】本年此地没有查到可写的大事：只写主角眼前的日常，不要自造天下大事。';
}

function protagonistBlock(state) {
  const p = state.protagonist || {};
  const c = state.clock || {};
  const Y = Number(c.gregorianYear) || 0;
  const L = [];
  const age = p.age != null && p.age !== '' ? `${p.age}岁` : (p.ageUnknown || state.mode === 'real' ? '年岁史无明载（正文不写具体岁数）' : '年岁未定');
  L.push(`${p.name || '（未命名）'}，${p.gender || '性别未载'}，${age}，${state.mode === 'real' ? '史载真人' : '虚构人物'}${p.nativePlace ? '，' + p.nativePlace + '人' : ''}`);
  try { L.push(require('./profile').renderProfileBlock(state).replace(/^=== .*? ===\n/, '')); } catch (_) { /* 无 */ }
  // 史载真人：档案里此年此月的处境与官历
  const fd = state.mode === 'real' ? figure.dossierAt(p.name, Y, c.month) : null;
  if (fd) {
    if (fd.situation && fd.situation.text) L.push(`此时的真实处境：${cut(fd.situation.text, 160)}`);
    if (fd.tension && fd.tension.label) L.push(`眼下摆在他面前的事：${cut(fd.tension.label, 60)}`);
    const f0 = figure.FIGURES[p.name] || {};
    if (f0.father) L.push(`父：${f0.father}`);
    if (f0.knowledgeOnly) L.push('（以上档案由 AI 据正史推断，未联网核对；与之冲突的细节宁可不写）');
  }
  // 未成年：实际主事者
  try {
    const cap = require('./capability').capabilityOf(state);
    if (cap && cap.isMinor) L.push(`年幼，实务由${cap.guardian ? cap.guardian.name + '（' + cap.guardian.relation + '）' : '家中长辈'}主持；他能做的是读书、旁听、与身边人往来，不能理政。`);
  } catch (_) { /* 无 */ }
  return `【主角档案（以此为准，不改不补）】\n${L.filter(Boolean).join('\n')}`;
}

function peopleBlock(state) {
  const out = [];
  const fam = ((state.household && state.household.members) || []).slice(0, 10)
    .map(m => `${m.relation || '家人'} ${m.name}${m.age != null ? '（' + m.age + '岁）' : ''}${m.status && m.status !== '在世' ? '，' + m.status : ''}`);
  if (fam.length) out.push(`【家人】${fam.join('；')}`);
  const npcs = (state.npcs || []).filter(n => n && n.name && !(state.household && (state.household.members || []).some(m => m.name === n.name)));
  // 先放史载真人，再放已登场的虚构人物；只给身份与关系，不给「目标/恐惧/底线」之类的引擎推演
  npcs.sort((a, b) => (/historical|real/.test(String(b.source)) ? 1 : 0) - (/historical|real/.test(String(a.source)) ? 1 : 0));
  const lines = npcs.slice(0, 14).map(n => `${n.name}：${n.role || n.background || '身份未载'}${n.age != null ? '，' + n.age + '岁' : ''}${n.tie ? '，与主角：' + cut(n.tie, 20) : ''}${/historical|real/.test(String(n.source)) ? '（史载真人）' : ''}`);
  if (lines.length) out.push(`【身边已知的人（只有身份与关系；写他们时按身份常情）】\n${lines.join('\n')}`);
  return out.join('\n\n');
}

function recentBlock(state) {
  const gm = (state.log || []).filter(l => l.speaker === 'GM').slice(-2);
  if (!gm.length) return '';
  return '【前两回合原文（衔接用，不要照抄、不要重复已写过的场面）】\n'
    + gm.map((l, i) => `第${l.turn}轮：${cut(l.text, i === gm.length - 1 ? 900 : 500)}`).join('\n');
}

/** 拼出一回合的 system 与 prompt */
function buildLeanPrompt(state, input, { verbosity = 'normal', isOpening = false, preEvidence = [] } = {}) {
  const c = state.clock || {};
  const L = state.location || {};
  const Y = Number(c.gregorianYear) || 0;
  let lunar = '';
  try { lunar = require('./lunar').label(Number(c.month) || 1, Number(c.day) || 1, c.leap); } catch (_) { lunar = `${c.month}月${c.day}日`; }
  const parts = [];
  parts.push(`【此刻】${c.yearLabel || ''}（公元${Y < 0 ? '前' + -Y : Y}年）农历${lunar}，${c.season || ''}。地点：${L.full || '未载'}（${L.polity || ''}${L.controller && L.controller !== '未核实' ? '，实际控制：' + L.controller : ''}）。`);
  parts.push(protagonistBlock(state));
  const pb = peopleBlock(state); if (pb) parts.push(pb);
  parts.push(newsBlock(state));
  try { const hc = require('./divergence').renderHistoryChanges(state); if (hc) parts.push(hc.replace(/^=== (.*?) ===/, '【$1】')); } catch (_) { /* 无 */ }
  try { parts.push(require('./offices').eraOfficeBlock(Y)); } catch (_) { /* 无 */ }
  try { parts.push(require('./realnames').renderRealNameRule(state)); } catch (_) { /* 无 */ }
  try { const mem = require('./memory').renderMemory(state, input); if (mem) parts.push(mem.replace(/^=== (.*?) ===/, '【$1】')); } catch (_) { /* 无 */ }
  const rb = recentBlock(state); if (rb) parts.push(rb);
  const ev = (preEvidence || []).filter(x => x.count > 0).slice(0, 3);
  if (ev.length) parts.push('【参考资料（检索所得，与之冲突的写法要避开；资料没说的不要硬编）】\n'
    + ev.map(x => `· ${x.query}：` + x.results.slice(0, 2).map(r => cut(`${r.title}：${r.snippet || ''}`, 120)).join('；')).join('\n'));
  const ask = isOpening
    ? '【本轮】这是开场，玩家还没有行动。先三四句平实交代主角是谁、何年何月、身在何处、眼下与他相关的真实局势；然后一个具体的人带着一件具体的日常事务来到面前，写到他等主角回话处即停。'
    : (String(input || '').trim()
      ? `【本轮玩家的行动】${String(input).trim()}\n只写这一步引起的直接结果与在场之人的反应，写到需要主角回话或拍板处即停。`
      : '【本轮】玩家没写行动：只写此刻眼前正在发生的一件寻常事，写到需要主角回话处即停。');
  parts.push(ask);
  return { system: gmRules(verbosity), prompt: parts.filter(Boolean).join('\n\n') };
}

module.exports = { buildLeanPrompt, gmRules, newsBlock };
