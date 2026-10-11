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
  return `你是历史模拟的主持人（GM）。你写主角身边的世界与他人，不扮演主角。玩家来这里是要「过日子、办成事、看时代怎么变」，每一回合都要让他觉得有东西可看、有事可做。

一、主角归玩家
1. 主角只做玩家本轮写明的事、只说玩家写明的话；不写主角的心思、决定和玩家没写的动作。
2. 不替玩家选择，不给选项或建议。

二、每回合要有实货（最要紧）
3. 把玩家这一步办完：他说去查账，就写查出了什么；说去见谁，就写见到了、谈了什么、对方给了什么答复。不要把一件事拆成好几回合，不要停在「刚要开始」。
4. 每回合至少给出三样具体的新东西：一个人名或身份、一个数目或价钱、一条消息或内情、一个局面的变化、一个新的可做之事——都要具体到能据此行动。
5. 不写寒暄、客套、等候、走路、环境气氛这类没有信息的过场；不重复前文已写过的内容。
6. 结尾停在一个有分量的节点：新的难处、新的机会、或有人等他拍板。不要每回合都用「对方等你回话」收尾。

三、时间按事走
7. 这一步要多久就过多久：赶路、等回信、查一县的账，可以过几天到一两个月；只是说几句话，就只过片刻。在 elapsedDays 里填这一步实际花了几天（当场办完填 0）。
8. 时间过去了，就写这段时间里实际办成了什么、发生了什么，具体写；不要用「转眼」「数日后」「时光飞逝」「就这样」一笔带过，也不要用一段概述代替该写的事。

四、剧情从哪里来
9. 玩家这一步的直接结果；在场与相关之人按其身份、职守、利害的正常反应（会推诿、讨价、拒绝、借机谋利）。
10. 这一年、这个地方真实发生的大事（下文列出的，以及你确知的、史书有载的本朝本年大事，如朝廷的诏令、党争、征税、战事、灾荒、物价），按消息传到此地的时间与路程，落到主角身上的实际影响。主角身份够不着的朝堂内幕，只能以传闻、邸报、上司的命令出现。
11. 不编造史书没有的大事、密谋、刺探、离奇巧合；不把无关的史事硬扯到一起；真人只做史书记载的事。

五、史实与称谓
12. 年号、官名、地名、礼制、器物、钱粮单位一律合乎本朝本年；人物身份、年龄、亲属以下文档案为准，不改不编。拿不准的细节换成拿得准的；正文里不写「据考」「不详」。
13. 不出现现代词语和现代观念。数字用约数，与身份量级相符。
14. 虚构人物不与史载真人同名，不写成真人的亲属、门生、部属；小人物见不到帝王将相。

六、文字
15. 平实白话，句子短，说事为主；比喻全篇不超过两处；不写景物光影、微表情和心理揣测。对话直接谈事，各人口吻合乎身份。
16. 开场：先三四句交代主角是谁、何年何月、身在何处、眼下与他相关的真实局势（用这一年真实的大事），然后直接进入一件要他处理的具体事务。
17. ${LEN[verbosity] || LEN.normal}；信息要密，不凑字数。

七、输出
只输出一个 JSON 对象，不加代码块，不加任何说明：
{"scene":"正文","elapsedDays":0,"understood":"一句话复述玩家本轮意图，开场填空串","presentNpcs":[{"name":"","role":""}],"newNpcs":[{"name":"","gender":"","age":0,"role":"","tie":"与主角的关系"}],"statusChanges":[{"项":"钱/粮/田/宅/职官/爵位/健康/名望等","后":"变化后的值","原因":"正文里的哪件事"}],"historyChanges":[{"event":"史书原载的事","now":"本局实际变成了什么","cause":"玩家哪一步导致","person":"命运被改的真人（可空）","alive":true}],"doubts":["拿不准而回避了的细节"],"turnSummary":"本轮事实摘要，150字内","pendingDecision":"一句话说明此刻摆在主角面前的局面"}
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
    ? `【本地年表里近几年已传到此地的史事（另可用你确知的本朝本年真实大事，按传到的时间与路程）】\n${lines.join('\n')}`
    : '【年表】本地年表里没有这一年的条目：请用你确知的、史书有载的本朝本年真实大事（诏令、党争、赋役、战事、灾荒、物价等）推动局面，按消息传到此地的时间与路程，只写真实发生过的。';
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
    ? '【本轮】这是开场，玩家还没有行动。先三四句平实交代主角是谁、何年何月、身在何处、眼下与他相关的真实局势（用这一年真实的大事）；然后直接进入一件要他处理、有分量的具体事务，交代清楚来龙去脉。'
    : (String(input || '').trim()
      ? `【本轮玩家的行动】${String(input).trim()}\n把这一步办完，写出它的结果、相关之人的反应和由此带出的新情况；需要几天就过几天（填 elapsedDays）。`
      : '【本轮】玩家没写行动：按这一年此地的真实局势，让一件与主角相干、有分量的事找上门来，写清来龙去脉。');
  parts.push(ask);
  return { system: gmRules(verbosity), prompt: parts.filter(Boolean).join('\n\n') };
}

module.exports = { buildLeanPrompt, gmRules, newsBlock };
