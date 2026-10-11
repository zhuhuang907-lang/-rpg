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
4. 新东西只从两处来：玩家这一步的结果，和主角身边真实的处境（差事、家计、上司与同僚、本地的事）。要具体到人名、数目、价钱、日期，能据此行动；没有就少写，不硬凑。
5. 不写寒暄、客套、等候、走路、环境气氛这类没有信息的过场；不重复前文已写过的内容。
6. 结尾停在一个有分量的节点：新的难处、新的机会、或有人等他拍板。不要每回合都用「对方等你回话」收尾。

三、吩咐与执行（玩家最恼火的就是这条）
7. 主角在自己身份、职权以内的吩咐，下属、吏役、仆人、家人照办，不扯皮、不反问、不讨价还价、不劝他三思。当场能办的当场写出办成的样子；要时日的，写明谁去办、几天回话，到时一定写出结果（办妥了什么、数目多少，或办砸在哪、为什么）。
8. 只有吩咐超出主角的职权、违法违制、或实在办不到时，对方才推辞：只说一次，用一两句讲明具体原因，并说清能办到哪一步。不要一回合接一回合地拖着、推着。
9. 不归主角管的人（上司、同僚、外人）可以有自己的打算，但也直说，不绕弯子。
10. 【主角交代下去、还没办完的事】里列的差事，时间到了必须交代结果，不许遗忘；在 orders 里申报本轮新交代的差事和旧差事的进展。

四、对话
11. 每人每次开口一般不超过两三句，说要紧的：禀报只说事实和数目，回话先说结论。不奉承、不客套、不重复主角的话、不长篇大论讲道理。
12. 一回合里说话的人不宜超过三个；可以用一句叙述交代的，不写成对话。

五、时间按事走
13. 这一步要多久就过多久：赶路、等回信、查一县的账，可以过几天到一两个月；只是说几句话，就只过片刻。在 elapsedDays 里填这一步实际花了几天（当场办完填 0）。
14. 时间过去了（包括玩家说「过几天」「等到某时」「快进」，以及提示里写明「上一段之后又过了几天」），先用一段写清这些天里实际发生了什么：交代下去的事各办得怎样、钱粮田产进出多少、家里与差事上有什么变化、传来了什么真实消息——逐件具体写，然后停在新的局面。不要用「转眼」「数日后」「时光飞逝」「一切如常」一笔带过。

六、剧情从哪里来
15. 玩家这一步的直接结果；在场与相关之人按其身份、职守的正常反应。
16. 这一年这一地真实发生的大事（下文列出的，以及你确知、史书有载的本朝本年大事），只在它确实会波及主角的身份、所在、生计时才写，并按消息传到此地的时间与路程，写它落到主角身上的实际影响。够不着主角的就不写；主角身份够不着的朝堂内幕，只能以传闻、邸报、上司的命令出现。
17. 不牵强附会：不把无关的史事、真人硬扯到主角身边；不编造史书没有的大事、密谋、刺探、离奇巧合；真人只做史书记载的事，只出现在他此时真在的地方。

七、史实与称谓
18. 年号、官名、地名、礼制、器物、钱粮单位一律合乎本朝本年；人物身份、年龄、亲属以下文档案为准，不改不编。拿不准的细节换成拿得准的；正文里不写「据考」「不详」。
19. 不出现现代词语和现代观念。数字用约数，与身份量级相符。
20. 虚构人物不与史载真人同名，不写成真人的亲属、门生、部属；小人物见不到帝王将相。

八、文字
21. 平实白话，句子短，说事为主；比喻全篇不超过两处；不写景物光影、微表情和心理揣测。对话直接谈事，短，各人口吻合乎身份。
22. 开场：先三四句交代主角是谁、何年何月、身在何处、眼下与他相关的真实局势（用这一年真实的大事），然后直接进入一件要他处理的具体事务。
23. ${LEN[verbosity] || LEN.normal}；信息要密，不凑字数。

九、输出
只输出一个 JSON 对象，不加代码块，不加任何说明：
{"scene":"正文","elapsedDays":0,"understood":"一句话复述玩家本轮意图，开场填空串","presentNpcs":[{"name":"","role":""}],"newNpcs":[{"name":"","gender":"","age":0,"role":"","tie":"与主角的关系"}],"statusChanges":[{"项":"钱/粮/田/宅/职官/爵位/健康/名望等","后":"变化后的值","原因":"正文里的哪件事"}],"historyChanges":[{"event":"史书原载的事","now":"本局实际变成了什么","cause":"玩家哪一步导致","person":"命运被改的真人（可空）","alive":true}],"orders":[{"who":"办事的人","what":"主角交代的事","status":"在办/办妥/办砸/搁下","result":"结果，具体到数目"}],"doubts":["拿不准而回避了的细节"],"turnSummary":"本轮事实摘要，150字内","pendingDecision":"一句话说明此刻摆在主角面前的局面"}
statusChanges、historyChanges、orders 没有就给 []；orders 只记主角本轮新交代的差事和旧差事的进展；historyChanges 只在玩家的行动真把一件史载的事或一个真人的命运改了时才填。
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
    ? `【本地年表里近几年已传到此地的史事（只写确实波及主角的；另可用你确知的本朝本年真实大事，按传到的时间与路程）】\n${lines.join('\n')}`
    : '【年表】本地年表里没有这一年的条目：可用你确知的、史书有载的本朝本年真实大事（诏令、赋役、战事、灾荒、物价等），但只写确实波及主角身份、所在、生计的，按消息传到此地的时间与路程；够不着主角的不写，不硬扯。';
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
  try { const ob = require('./orders').renderOpen(state); if (ob) parts.push(ob); } catch (_) { /* 无 */ }
  // 上一段写完后，时钟又往前走了几天而正文没写到：这几天里的事要先交代
  const gap = state.meta && state.meta.unwrittenGap;
  if (gap && gap.days > 0 && !isOpening) parts.push(`【上一段之后又过了 ${gap.days} 天（${gap.from || ''} 到 ${gap.to || '此刻'}），这段时间正文还没写】本轮先用一段写清这 ${gap.days} 天里实际发生的事：交代下去的差事各办得怎样、钱粮进出、家里与差事上的变化、传到此地的真实消息，逐件具体写；再接玩家本轮的行动。`);
  const ev = (preEvidence || []).filter(x => x.count > 0).slice(0, 3);
  if (ev.length) parts.push('【参考资料（检索所得，与之冲突的写法要避开；资料没说的不要硬编）】\n'
    + ev.map(x => `· ${x.query}：` + x.results.slice(0, 2).map(r => cut(`${r.title}：${r.snippet || ''}`, 120)).join('；')).join('\n'));
  const ask = isOpening
    ? '【本轮】这是开场，玩家还没有行动。先三四句平实交代主角是谁、何年何月、身在何处、眼下与他相关的真实局势（用这一年真实的大事）；然后直接进入一件要他处理、有分量的具体事务，交代清楚来龙去脉。'
    : (String(input || '').trim()
      ? `【本轮玩家的行动】${String(input).trim()}\n把这一步办完，写出它的结果、相关之人的反应和由此带出的新情况；需要几天就过几天（填 elapsedDays）。`
      : '【本轮】玩家没写行动：先交代还没办完的差事有什么进展；再按主角的身份与此地的真实处境，写一件他分内该管、正找上门来的具体事务，写清来龙去脉。');
  parts.push(ask);
  return { system: gmRules(verbosity), prompt: parts.filter(Boolean).join('\n\n') };
}

module.exports = { buildLeanPrompt, gmRules, newsBlock };
