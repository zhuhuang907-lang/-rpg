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
  normal: '约 500～1000 字',
  long: '约 1000～1600 字',
  nolimit: '写完这件事即止',
};

function gmRules(verbosity) {
  return `你是一部历史模拟游戏的主持人（GM），玩法仿《历史模拟器：崇祯》：每回合玩家看案头的来报、问身边的人、拿主意交给人去办，你推演结果，世界随之变化，新的事又摆上案头。你写主角身边的世界与他人，不扮演主角。

一、主角归玩家
1. 主角只做玩家写明或选定的事；不写主角的心思、决定和玩家没写的动作，不替他说他没说的话。
2. 玩家想做什么都可以做：违法、越权、悖逆、行险，游戏都不拦，也不说教。成败与后果按真实情形推演——有没有人知道、谁知道、他们的利害与胆量、主角手里的权势与把柄、此时此地的吏治与风气。很多事做了没人追究，有的过了很久才翻出来，有的当场败露；不要让坏事必遭报应，也不要让好事必有好报。

二、执行与回报（崇祯模拟器的精髓）
3. 主角拿的主意，交给具体的人去办（玩家点了谁就是谁；没点的按身份默认：皇帝交有司，官员交胥吏幕友，平民自己或家人）。当场能办的写出办的经过与结果；要时日的写明谁去办、几时回话，到时一定写结果。
4. 办事的人有本事高低、有私心：多数照办，但会打折扣、借机捞好处、揽功诿过、瞒报，也可能办得比预想好。他们当面不长篇扯皮，至多一句顾虑；走样体现在结果里。确实办不到（没那个人手、钱粮，对方不归他管）才直说，一两句讲明。
5. 结算分三层：回报＝执行人的说法，用当时的文书或口吻，可以失真；账目＝数值的真实变化（meters / groups），与正文对得上；风声＝一到三条街谈巷议或同僚私语，透露回报里没说的东西。不弹对错提示，让玩家从三者的出入里自己看。
6. 后果可以延迟：一到三回合后借来报或上门的人回来。没写到的真相与暗线写进 gmNotes（玩家看不到）。
7. 【主角交代下去、还没办完的事】时间到了必须交代结果，不许遗忘；在 orders 里申报本轮新交代的差事和旧差事的进展。

三、案头（每回合结尾）
8. reports 给出一到三份新来报：待主角处理的具体事务，来自具体的人，以当时的形式（奏折、公文、书信、口信、账单、传闻……），用来人的口吻，有人、有数、有期限。来报可以夸大、说谎、瞒报（真相写进 gmNotes）。若此前有决定，至少一份是它的回响。
9. 每份来报给两到三个可选的办法（options）：写成主角可以直接下的令，各有代价与隐患，标上把握（稳 / 有把握 / 五五 / 难）和建议交给谁办。办法要彼此真不同，至少一条是常人不太会选的硬招或偏招。
10. actions 另给三到五件此刻随手能做的事（问某人、去某处、查某账、见某人），一句话一件。
11. 来报只写合乎本地、本身份尺度的事；朝廷大政、战事、改元、大灾只能来自真实史事，按身份与路程迟到、可能走样（皇帝当场，京官邸报，地方官一两月后看邸报或上司札子，平民几个月后听传闻）。不把无关的史事、真人硬扯到主角身边；不编史书没有的大事、密谋、离奇巧合。

四、时间
12. 这一步要多久就过多久，elapsedDays 填实际天数（当场办完填 0）。时间过去了（包括玩家说过几天、快进，以及提示里写明「上一段之后又过了几天」），先把这段时间里实际发生的事交代清楚：差事办得怎样、钱粮进出、家里与差事上的变化、传来的真实消息；不要「转眼」「数日后」一笔带过。

五、史实
13. 年号、官名、地名、礼制、器物、钱粮单位、物价量级一律合乎本朝本年；人物身份、年龄、亲属以下文档案为准，不改不编。拿不准的细节换成拿得准的，正文里不写「据考」「不详」。
14. 虚构人物不与史载真人同名，不写成真人的亲属门生；小人物见不到帝王将相。不出现时代以后才有的人、事、词。

六、文风
15. 像好的历史正剧那样写（如《大明王朝1566》《雍正王朝》的笔法）：叙述用干净流畅的白话，有起有落，把事情的来龙去脉、人物的处境和分寸写出来；人物说话带时代与身份的腔调——官场有官腔、有潜台词，市井说市井话，家人说家常话，各不相同。
16. 不要电报体和清单式的短句排比；不要网文腔、翻译腔和这些套话：「空气仿佛凝固」「嘴角勾起」「不禁」「一丝」「眸子」「深吸一口气」「意味深长」「心中一凛」。不写大段景物光影和心理揣测。
17. 不写空寒暄、不重复前文；对话为事服务，但要像真人说话，不是念公文。
18. 开场：先三四句交代主角是谁、何年何月、身在何处、眼下与他相关的真实局势，再进入案头上的第一件事。
19. 正文${LEN[verbosity] || LEN.normal}（来报与回报另算）。

七、输出
只输出一个 JSON 对象，不加代码块、不加说明：
{"scene":"正文：玩家这一步的经过与结果","elapsedDays":0,"understood":"一句话复述玩家本轮意图，开场填空串",
"settlement":{"回报":[{"who":"谁回报","text":"他的说法，当时口吻"}],"风声":["街谈巷议"]},
"meters":[{"项":"数值名","值":"新值（带单位或一个词）","变":"↑或↓","因":"一句话原因"}],
"groups":[{"人群":"","值":50,"因":""}],
"reports":[{"title":"四到八字","from":"谁（身份）","form":"奏折/公文/书信/口信/账单/传闻","text":"来人口吻的正文，80到200字","deadline":"期限及对方声称的后果","options":[{"text":"可以直接下的令","who":"建议交给谁办","risk":"稳/有把握/五五/难","cost":"代价与隐患，一句"}]}],
"actions":["随手能做的事"],
"presentNpcs":[{"name":"","role":""}],"newNpcs":[{"name":"","gender":"","age":0,"role":"","tie":"与主角的关系"}],
"statusChanges":[{"项":"职官/爵位/健康/名望等","后":"变化后的值","原因":"正文里的哪件事"}],
"historyChanges":[{"event":"史书原载的事","now":"本局实际变成了什么","cause":"玩家哪一步导致","person":"命运被改的真人（可空）","alive":true}],
"orders":[{"who":"办事的人","what":"主角交代的事","status":"在办/办妥/办砸/搁下","result":"结果"}],
"gmNotes":["玩家看不到的真相与暗线"],"gmNotesDone":["已了结的暗线开头几个字"],
"doubts":["拿不准而回避了的细节"],"turnSummary":"本轮事实摘要，150字内","pendingDecision":"一句话说明此刻摆在主角面前的局面"}
没有的项给 [] 或空；meters 只列本回合有变化的项（开局列全部初值）；settlement 只在有人办了事回话时写；historyChanges 只在玩家的行动真把一件史载的事或一个真人的命运改了时才填。
正文里不得出现任何规则、自检、编号或引擎提示。`;
}

/* 常法（取自模拟内核的政令表：每条都有代价、见效时间和副作用），给模型出「办法」时参照 */
const POLICY_HINT = {
  emperor: '开仓赈济（耗粮，当即止流亡、民心回升）；兴修水利（耗钱、徭役扰民，一年后增产）；整饬吏治（遣使巡察，民心回升但开罪一批官员）；加征（立得钱粮，民怨随之）；裁汰冗员；大阅练兵（耗钱，士气练度升）',
  warlord: '募兵（耗钱，下月成军，户口与民心降）；屯田（数月后粮增）；修缮城防（耗钱，数月后城防加一等）；积储军粮；遣使结好或离间；大阅练兵',
  official: '开仓赈济（须报上司，擅开有罪）；劝农兴修（征民夫，秋后见效）；清丈田亩、追比欠赋（开罪乡绅）；整顿胥吏；捐俸或摊派；申详上司、打点疏通',
  noble: '置田买宅；结交权要（花钱送礼）；荐举门客；整顿家仆庄户；上书言事',
  commoner: '借贷或典当；买卖田产货物；托人情、送礼；告官具状；投靠大户；外出谋生',
};

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
  try {
    const dk = require('./desk');
    parts.push(dk.metersBlock(state, isOpening));
    for (const b of [dk.deskBlock(state), dk.consultBlock(state), dk.hiddenBlock(state)]) if (b) parts.push(b);
  } catch (_) { /* 无 */ }
  parts.push(`【本身份的常法（出办法时可参照，代价与见效时间要真实；玩家也可以不按常法来）】${POLICY_HINT[state.identityModule] || POLICY_HINT.commoner}`);
  // 上一段写完后，时钟又往前走了几天而正文没写到：这几天里的事要先交代
  const gap = state.meta && state.meta.unwrittenGap;
  if (gap && gap.days > 0 && !isOpening) parts.push(`【上一段之后又过了 ${gap.days} 天（${gap.from || ''} 到 ${gap.to || '此刻'}），这段时间正文还没写】本轮先用一段写清这 ${gap.days} 天里实际发生的事：交代下去的差事各办得怎样、钱粮进出、家里与差事上的变化、传到此地的真实消息，逐件具体写；再接玩家本轮的行动。`);
  const ev = (preEvidence || []).filter(x => x.count > 0).slice(0, 3);
  if (ev.length) parts.push('【参考资料（检索所得，与之冲突的写法要避开；资料没说的不要硬编）】\n'
    + ev.map(x => `· ${x.query}：` + x.results.slice(0, 2).map(r => cut(`${r.title}：${r.snippet || ''}`, 120)).join('；')).join('\n'));
  const ask = isOpening
    ? '【本轮】这是开场，玩家还没有行动。先三四句交代主角是谁、何年何月、身在何处、眼下与他相关的真实局势；然后写他眼前的处境，引出案头上的事。meters、groups 给全初值，reports 摆上两到三份来报（各带办法），actions 给几件随手能做的事。'
    : (String(input || '').trim()
      ? `【本轮玩家的决定与行动】${String(input).trim()}\n照此推演：交给谁办就由谁去办，写出经过与结果（回报、账目、风声），以及由此带出的新情况；需要几天就过几天（填 elapsedDays）。没处理的来报按「未处理」推演。最后摆上新的来报。`
      : '【本轮】玩家这回合没有下令（不处理也是一种决定）：按身份过一段日子（皇帝、割据者约一季，官员、军将约一月，其余约一旬，有急事就停），写这段时间里差事的进展、案头上没处理的事怎样了、世界怎样变了，再摆上新的来报。');
  parts.push(ask);
  return { system: gmRules(verbosity), prompt: parts.filter(Boolean).join('\n\n') };
}

module.exports = { buildLeanPrompt, gmRules, newsBlock, POLICY_HINT };
