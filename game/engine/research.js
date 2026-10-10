'use strict';
/**
 * 游戏内的历史检索：开局建世界、每过一段时间往后续查、玩家手动"查一下"。
 *
 * 流程：定检索词 → 博查联网检索 → 整理成"资料卡"（S1、S2……，带网址）→ 大模型只依据资料卡写世界底本
 *       → 引擎逐条核对：主线史事必须引用资料卡，否则降为"存疑"、不发给玩家。
 *
 * 评级：
 *   已核   —— 引用了可信站点（维基文库、CTEXT、高校、社科院、政府、维基百科等）的资料卡
 *   二手   —— 引用了一般网页的资料卡
 *   未查证 —— 没接博查，只凭大模型记忆（默认不发给玩家，可在设置里放开）
 *   存疑   —— 说不出出处，或日期对不上
 */
const cal = require('./calendar');
const search = require('./search');
const llm = require('./llm');
const guard = require('./guard');

// 天文纪年（0＝公元前1年）
const DYNASTIES = [
  { name: '秦', from: -220, to: -206, w: 1 },
  { name: '西汉', from: -201, to: 8, w: 3 },
  { name: '东汉', from: 25, to: 219, w: 3 },
  { name: '三国', from: 220, to: 279, w: 2 },
  { name: '西晋', from: 266, to: 316, w: 1 },
  { name: '东晋十六国', from: 317, to: 419, w: 1 },
  { name: '南北朝', from: 420, to: 588, w: 2 },
  { name: '隋', from: 581, to: 617, w: 1 },
  { name: '唐', from: 618, to: 906, w: 5 },
  { name: '五代十国', from: 907, to: 959, w: 1 },
  { name: '北宋', from: 960, to: 1126, w: 4 },
  { name: '南宋', from: 1127, to: 1278, w: 3 },
  { name: '元', from: 1271, to: 1367, w: 2 },
  { name: '明', from: 1368, to: 1643, w: 5 },
  { name: '清', from: 1644, to: 1911, w: 4 },
];
const ARCHETYPES = [
  { idm: 'commoner', t: '佃农', w: 3 }, { idm: 'commoner', t: '自耕农家的长子', w: 2 }, { idm: 'commoner', t: '农家女', w: 2 },
  { idm: 'commoner', t: '城里小户人家的媳妇', w: 2 }, { idm: 'artisan', t: '手艺人', w: 2 }, { idm: 'merchant', t: '行商', w: 2 },
  { idm: 'merchant', t: '铺子掌柜', w: 2 }, { idm: 'scholar', t: '读书应考的士子', w: 3 }, { idm: 'official', t: '县衙小吏', w: 2 },
  { idm: 'official', t: '地方官', w: 2 }, { idm: 'military', t: '戍边的军卒', w: 2 }, { idm: 'military', t: '统兵将领', w: 1 },
  { idm: 'clergy', t: '寺院僧人', w: 1 }, { idm: 'court', t: '宫中宫人', w: 1 }, { idm: 'noble', t: '宗室子弟', w: 1 },
  { idm: 'emperor', t: '皇帝', w: 1 },
];
const IDMS = ['emperor', 'noble', 'official', 'military', 'merchant', 'scholar', 'commoner', 'artisan', 'clergy', 'court'];

function dynastyOf(y) {
  const list = DYNASTIES.filter(d => y >= d.from && y <= d.to);
  return list.length ? list[list.length - 1].name : '';
}

function weighted(list, r) {
  const total = list.reduce((a, x) => a + x.w, 0);
  let k = r * total;
  for (const x of list) { k -= x.w; if (k <= 0) return x; }
  return list[list.length - 1];
}

/** 随机开局：在历表范围内挑朝代、年份、身份类型 */
function randomSpec(rand = Math.random) {
  const d = weighted(DYNASTIES, rand());
  const y = d.from + Math.floor(rand() * (d.to - d.from + 1));
  const a = weighted(ARCHETYPES, rand());
  return { year: y, dynasty: d.name, identity: a.t, idm: a.idm, place: '', name: '', gender: '', random: true };
}

/** 把玩家填的公元年（公元前用负数，按习惯 -221＝公元前221年）换成天文纪年 */
function toAstro(y) { y = Number(y); return y < 0 ? y + 1 : y; }
function fromAstro(y) { return y <= 0 ? y - 1 : y; }
function yearWords(y) { return y <= 0 ? `公元前${1 - y}年` : `公元${y}年`; }

// ———————————————————— 资料卡 ————————————————————
async function gather(queries, progress, budget) {
  const cards = [];
  const seen = new Set();
  for (const q of queries) {
    if (budget && budget.used >= budget.max) { progress && progress({ step: 'search', q, note: '本局检索次数已用完' }); break; }
    progress && progress({ step: 'search', q });
    let list = [];
    try { list = await search.web(q); if (budget) budget.used += 1; } catch (e) { progress && progress({ step: 'search-error', q, error: e.message }); }
    for (const x of list) {
      if (seen.has(x.url)) continue;
      seen.add(x.url);
      cards.push({ id: 'S' + (cards.length + 1), q, ...x, trust: search.trust(x.url) });
    }
    progress && progress({ step: 'found', q, n: list.length });
  }
  return cards;
}

function cardsText(cards, max = 40) {
  return cards.slice(0, max).map(c => `[${c.id}] ${c.title}（${c.site || c.url}）${c.date ? ' ' + c.date : ''}\n${c.text}`).join('\n\n');
}

// ———————————————————— 检索词 ————————————————————
function baseQueries(spec) {
  const Y = yearWords(spec.year);
  const dyn = spec.dynasty || dynastyOf(spec.year);
  const place = spec.place || '';
  const who = spec.identity || '';
  return [
    `${dyn} ${Y} 年号 皇帝 在位`,
    `${Y} ${dyn} 大事记`,
    `${dyn} ${Y}前后 ${place} 历史`,
    `${dyn} ${who} 生活 制度`,
    `${dyn} ${place} 地方行政 官职 ${Y}`,
    `${dyn} 物价 米价 工钱`,
    `${dyn} 称谓 习俗 日常`,
  ].map(q => q.replace(/\s+/g, ' ').trim());
}

async function planQueries(spec) {
  const base = baseQueries(spec);
  if (!llm.enabled()) return base;
  try {
    const out = await llm.chat('你是历史研究助手，只输出 JSON。',
      `玩家要在这个设定里开一局历史模拟：${yearWords(spec.year)}（${spec.dynasty || dynastyOf(spec.year)}），地点：${spec.place || '未定'}，身份：${spec.identity || '未定'}${spec.name ? '，姓名：' + spec.name : ''}。
请列出 6 到 9 个中文网页检索词，用来查清：当时的年号与在位皇帝、这几年的大事、这个地方当时的名称与隶属和主官、这种身份的生活与制度、物价量级、称谓习俗；如果玩家给了真实人物的名字，查他的生平。
输出：{"queries":["…"]}`, { json: true, maxTokens: 600 });
    const qs = (out.queries || []).map(String).filter(Boolean).slice(0, 9);
    return qs.length >= 4 ? qs : base;
  } catch { return base; }
}

// ———————————————————— 世界底本 ————————————————————
const UNIT_WORDS = { xun: '一旬', month: '一月', season: '一季' };

function worldPrompt(spec, cards, issues) {
  const searched = cards.length > 0;
  return {
    system: '你是严谨的历史学者兼游戏叙事者。只输出一个 JSON 对象，不要输出任何解释。',
    user: `为一局历史模拟游戏写"世界底本"。

【玩家设定】
年份：${yearWords(spec.year)}（${spec.dynasty || dynastyOf(spec.year) || '朝代待定'}）${spec.month ? '，' + spec.month + '月' : ''}
地点：${spec.place || '（由你按身份选一个合理的地方）'}
身份：${spec.identity || '（由你选）'}${spec.idm ? '（类型：' + spec.idm + '）' : ''}
姓名：${spec.name || '（虚构一个合乎时代的名字）'}；性别：${spec.gender || '（由你定）'}；年龄：${spec.age || '（由你定）'}
${spec.real ? '玩家要扮演真实历史人物：生平必须严格依据资料卡。' : '主角是虚构人物，但所处的时代、地方、制度必须真实。'}

【资料卡】${searched ? '（只能依据这些写史实；每条主线史事和背景要点都要在 cite 里写出资料卡编号）' : '（本局没有联网检索，只能凭你的知识；拿不准的史实不要写，cite 留空）'}
${searched ? cardsText(cards) : '无'}

【硬性规则】
1. 史实只写资料卡里有的；日期只写到资料能支持的精度（month / season / year）。资料不支持的大事一律不写。
2. 年份用公元年整数，公元前用负数（公元前221年写 -221）。月份用农历月 1–12；只知道季节或年份时 month 填 null 并设 precision。
3. 地名、官名、称谓、器物用当时的说法；不要出现后世才有的名称。
4. 主角若是真实人物，在 death 里写史载卒年月（有出处才写）；主角若是虚构人物，death 留空，身边人物也虚构，但不要和史载人物同名；史载人物只在资料卡支持时出现，并标 historical:true 和 cite。
5. 开场三拍像一个人醒来：第一拍只有身体感觉、声音、光、气味和一件小物件，最后有人用身边人的叫法叫主角（150–250字）；第二拍是日常，对话里自然带出至多三件事实，埋下钩子的影子（250–400字）；第三拍才是找上门的事：一个人、一件事、一个期限，停在对方等主角回答（300–500字）。不替主角说话、动作、做决定。正文里不出现考证、存疑之类的字眼，不出现公元纪年。
6. 第一拍、第二拍各给 3 个可选动作（label 简短；bridge 写这个动作之后外界的反应，40–100字）。
7. 回合长度：皇帝、割据者用 season；官员、将领用 month；其余用 xun。
8. 数值 5–6 项，必须含 key 为 "health" 的一项（身体）；能用钱粮人数表示的给 unit 和整数，抽象的给 0–100 和四个词的 scale（从坏到好）。人群 3–6 个，0–100。
9. 主线史事写开局前一年到开局后三年之间、会影响这个身份或这个地方的大事 6–14 条；deliver 写这件事以什么形式、隔几个月传到主角手里（主角这个身份根本听不到就填 null）；朝廷决策类在主角是皇帝时 kind 填 "court" 并给 choice。
10. 第一件找上门的事（hook）要和第三拍一致，给 2–3 个办法；每个办法写由哪个身边人提出（by 的键是人物 id）、他的一句原话、数值影响（每项绝对值不超过 15）、执行回报一句、风声一句。
${issues && issues.length ? '\n【上一稿的问题，必须改掉】\n' + issues.join('\n') : ''}

【输出格式】
{
 "dynasty":"", "eras":[{"name":"年号","start":公元年,"end":公元年,"ruler":"在位者","yearWord":"年（以'载'纪年的写'载'，如唐天宝三载以后）","cite":["S1"]}],
 "identity":{"name":"","gender":"","age":0,"origin":"籍贯","place":"当时地名（隶属）","title":"一句话身份","idm":"${IDMS.join('|')}","unit":"xun|month|season","startMonth":1,
   "death":{"year":null,"month":null,"cite":[]},
   "executors":["自己","…"],
   "stats":[{"key":"英文键","label":"","value":0,"unit":"可选","scale":["","","",""]}],
   "groups":[{"key":"英文键","label":"","value":50}],
   "regions":[{"name":"","cols":{"光景":"","近况":""}}],
   "people":[{"id":"英文小写","name":"","age":0,"origin":"","role":"与主角的关系或职任","stance":"","temper":"","sample":"一句台词","want":"","betray":"会出卖主角的条件","present":true,"historical":false,"cite":[]}],
   "goals":["三个可选的长远志向"],
   "opening":[{"text":"","meet":["人物id"],"time":"清晨之类","actions":[{"label":"","bridge":""}]},{"text":"","meet":[],"actions":[…]},{"text":"","meet":[]}],
   "hook":{"title":"","from":"","form":"","text":"","deadline":0,"approaches":[{"id":"a","label":"","by":{"人物id":"原话"},"eff":{"键":0},"report":"","rumor":""}]}
 },
 "mainline":[{"title":"","year":公元年,"month":null,"precision":"month|season|year","fact":"一两句","kind":"fixed|court","scope":"","cite":["S2"],
   "deliver":{"delay":0,"from":"","form":"","title":"主角这个身份会怎么称呼这件事","text":"传到主角耳中的样子（当时口吻）","approaches":[{"id":"","label":"","by":{},"eff":{},"report":"","rumor":""}]},
   "choice":{"prompt":"","history":"史实上怎么处置"}}],
 "facts":[{"text":"制度、物价量级、称谓等背景要点","cite":["S3"]}],
 "guard":{"terms":[{"word":"此时尚未出现的词","fromYear":公元年,"why":""}],"banned":[{"word":"本局任何时候都不该出现的词（后世地名、官名等）","why":""}]}
}`,
  };
}

function cleanId(x, i) { const v = String(x || '').toLowerCase().replace(/[^a-z0-9_]/g, ''); return v || 'p' + i; }
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function gradeOf(cites, cardMap, searched) {
  if (!searched) return '未查证';
  const cs = (cites || []).map(c => cardMap[c]).filter(Boolean);
  if (!cs.length) return '存疑';
  return cs.some(c => c.trust === '可信站点') ? '已核' : '二手';
}

function normMainline(list, cardMap, searched, startY) {
  const out = [];
  for (const [i, m] of (list || []).entries()) {
    const y = toAstro(m.year);
    if (!Number.isFinite(y) || y < cal.MIN_Y || y > cal.MAX_Y) continue;
    const precision = ['month', 'season', 'year'].includes(m.precision) ? m.precision : (m.month ? 'month' : 'year');
    // 只信到季或年的，放到该季、该年的最后一个月，保证"不早到"
    let mm = Number(m.month) || 0;
    if (precision === 'year' || !mm) mm = 12;
    else if (precision === 'season') mm = Math.ceil(mm / 3) * 3;
    mm = clamp(mm, 1, 12);
    const confidence = gradeOf(m.cite, cardMap, searched);
    const d = m.deliver && typeof m.deliver === 'object' && m.deliver.text ? {
      delay: clamp(Number(m.deliver.delay) || 0, 0, 24), from: String(m.deliver.from || ''), form: String(m.deliver.form || ''),
      title: String(m.deliver.title || m.title || ''), text: String(m.deliver.text || ''),
      approaches: normApproaches(m.deliver.approaches),
    } : null;
    out.push({
      id: `W${startY}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      date: { y, m: mm }, precision, kind: m.kind === 'court' ? 'court' : 'fixed', scope: String(m.scope || ''),
      title: String(m.title || '').slice(0, 40), fact: String(m.fact || ''), confidence,
      source: (m.cite || []).map(c => cardMap[c]).filter(Boolean).map(c => c.url),
      deliverRaw: d, choice: m.choice && m.choice.prompt ? { prompt: String(m.choice.prompt), history: String(m.choice.history || '') } : null,
    });
  }
  return out;
}

function normApproaches(list) {
  return (Array.isArray(list) ? list : []).slice(0, 4).map((a, k) => ({
    id: cleanId(a.id, k) || 'a' + k, label: String(a.label || '').slice(0, 40), kw: [],
    by: Object.fromEntries(Object.entries(a.by || {}).map(([pid, t]) => [cleanId(pid, 0), String(t)])),
    eff: Object.fromEntries(Object.entries(a.eff || {}).filter(([, v]) => Number.isFinite(Number(v))).map(([kk, v]) => [String(kk), clamp(Number(v), -15, 15)])),
    report: String(a.report || ''), rumor: String(a.rumor || ''),
    odds: ['稳', '有把握', '五五', '难'].includes(a.odds) ? a.odds : undefined,
  })).filter(a => a.label);
}

/** 把模型给的底本整理成引擎能用的身份与世界；返回 { world, issues } */
function normalize(raw, spec, cards) {
  const searched = cards.length > 0;
  const cardMap = Object.fromEntries(cards.map(c => [c.id, c]));
  const issues = [];
  const idn = raw.identity || {};

  // 年号：联网时必须有出处；没出处就不用（退回干支纪年）
  const eras = (raw.eras || []).map(e => ({
    name: String(e.name || '').slice(0, 6), start: toAstro(e.start), end: e.end == null ? null : toAstro(e.end),
    ruler: String(e.ruler || ''), grade: gradeOf(e.cite, cardMap, searched), yearWord: e.yearWord === '载' ? '载' : undefined,
  })).filter(e => e.name && Number.isFinite(e.start) && (!searched || e.grade !== '存疑'));

  const idm = IDMS.includes(idn.idm) ? idn.idm : (spec.idm || 'commoner');
  const unit = ['xun', 'month', 'season'].includes(idn.unit) ? idn.unit : (idm === 'emperor' ? 'season' : ['official', 'military', 'noble'].includes(idm) ? 'month' : 'xun');
  let startMonth = clamp(Number(spec.month || idn.startMonth) || 1, 1, 12);
  const start = { y: spec.year, m: startMonth, leap: false, d: 1 };
  if (!cal.inRange(start)) issues.push('开局年份超出历表范围（公元前221年—1912年）');

  // 数值
  let stats = (idn.stats || []).slice(0, 6).map((x, i) => {
    const key = cleanId(x.key, i);
    const scale = Array.isArray(x.scale) && x.scale.length >= 3 ? x.scale.map(String).slice(0, 4) : null;
    return { key, label: String(x.label || key).slice(0, 8), value: scale ? clamp(Number(x.value) || 50, 0, 100) : Math.max(0, Math.round(Number(x.value) || 0)), unit: scale ? undefined : String(x.unit || ''), scale: scale || undefined };
  });
  if (!stats.some(x => x.key === 'health')) stats.push({ key: 'health', label: '身体', value: 75, scale: ['病重', '虚弱', '平常', '康健'] });
  if (stats.length < 4) issues.push('数值太少');
  const groups = (idn.groups || []).slice(0, 6).map((g, i) => ({ key: cleanId(g.key, i), label: String(g.label || '').slice(0, 10), value: clamp(Number(g.value) || 50, 0, 100) }));
  const people = (idn.people || []).slice(0, 8).map((p, i) => {
    const historical = !!p.historical;
    const grade = historical ? gradeOf(p.cite, cardMap, searched) : '虚构';
    return {
      id: cleanId(p.id, i), name: String(p.name || '').slice(0, 10), age: Number(p.age) || null, origin: String(p.origin || ''),
      role: String(p.role || ''), stance: String(p.stance || ''), temper: String(p.temper || ''), sample: String(p.sample || ''),
      want: String(p.want || ''), betray: String(p.betray || ''), present: p.present !== false,
      historical: historical && grade !== '存疑', grade,
    };
  }).filter(p => p.name && !(p.grade === '存疑'));
  const ids = new Set(people.map(p => p.id));
  const opening = (idn.opening || []).slice(0, 3).map((b, i) => ({
    text: String(b.text || ''), meet: (b.meet || []).map(x => cleanId(x, 0)).filter(x => ids.has(x)),
    status: i === 0 ? { date: 'short', name: false, time: String(b.time || '清晨') } : { date: 'full', name: true },
    actions: i < 2 ? (b.actions || []).slice(0, 3).map(a => ({ label: String(a.label || '').slice(0, 30), bridge: String(a.bridge || '') })).filter(a => a.label && a.bridge) : undefined,
  }));
  if (opening.length !== 3 || opening.some((b, i) => !b.text || (i < 2 && (!b.actions || b.actions.length < 2)))) issues.push('开场三拍不完整（每拍要有正文，前两拍各要 2–3 个动作）');

  const hook = idn.hook && idn.hook.text ? {
    id: 'H0', type: '人事', title: String(idn.hook.title || '找上门的事'), from: String(idn.hook.from || ''), form: String(idn.hook.form || ''),
    text: String(idn.hook.text), deadline: clamp(Number(idn.hook.deadline) || 0, 0, 2), approaches: normApproaches(idn.hook.approaches),
  } : null;
  if (!hook || hook.approaches.length < 2) issues.push('第一件事（hook）缺少办法');

  const deliverClass = idm === 'emperor' ? 'court' : 'self';
  const mainline = normMainline(raw.mainline, cardMap, searched, spec.year).map(m => {
    const out = { ...m, deliver: m.deliverRaw ? { [deliverClass]: m.deliverRaw } : null };
    delete out.deliverRaw;
    if (!(idm === 'emperor' && m.kind === 'court')) out.choice = null;
    return out;
  });

  const facts = (raw.facts || []).slice(0, 20).map(f => ({ text: String(f.text || ''), grade: gradeOf(f.cite, cardMap, searched), source: (f.cite || []).map(c => cardMap[c]).filter(Boolean).map(c => c.url) })).filter(f => f.text && f.grade !== '存疑');

  const g = raw.guard || {};
  const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const worldGuard = {
    terms: (g.terms || []).filter(t => t.word && Number.isFinite(Number(t.fromYear))).map(t => ({ re: esc(t.word), from: { y: toAstro(t.fromYear), m: 1 }, why: String(t.why || '时代未到') })),
    banned: (g.banned || []).filter(b => b.word).map(b => ({ re: esc(b.word), why: String(b.why || '时代不符') })),
  };

  const dd = idn.death && idn.death.year ? { y: toAstro(idn.death.year), m: clamp(Number(idn.death.month) || 12, 1, 12), grade: gradeOf(idn.death.cite, cardMap, searched) } : null;
  const identity = {
    death: dd && dd.grade !== '存疑' && Number.isFinite(dd.y) ? dd : null,
    id: 'self', name: String(idn.name || spec.name || '无名').slice(0, 10), gender: String(idn.gender || spec.gender || ''),
    idm, title: String(idn.title || spec.identity || ''), age: clamp(Number(idn.age || spec.age) || 20, 1, 90),
    origin: String(idn.origin || ''), place: String(idn.place || spec.place || ''), region: '', start, unit,
    deliverClass, executorDefault: (idn.executors && idn.executors[0]) || '自己',
    executors: (idn.executors || ['自己']).map(String).slice(0, 6), stats, groups,
    regions: (idn.regions || []).slice(0, 6).map(r => ({ name: String(r.name || ''), cols: Object.fromEntries(Object.entries(r.cols || {}).map(([k, v]) => [String(k), String(v)])) })).filter(r => r.name),
    people, opening, goals: (idn.goals || []).map(String).filter(Boolean).slice(0, 4),
    events: [], groupEvents: [], smallTalk: {},
  };

  const world = {
    kind: 'dynamic', title: `${raw.dynasty || spec.dynasty || dynastyOf(spec.year)} · ${identity.place || ''}`.replace(/ · $/, ''),
    dynasty: String(raw.dynasty || spec.dynasty || dynastyOf(spec.year)), eras, mainline, deps: {}, facts,
    guard: worldGuard, identity, hook, sources: cards, searched,
    horizon: { y: Math.min(cal.MAX_Y, spec.year + 3), m: 12 },
  };
  return { world, issues };
}

/** 开局：检索 → 写底本 → 核对 → 不过关重写一次 */
async function createWorld(spec, progress, budget) {
  if (!llm.enabled()) throw new Error('自定义身份和随机时代需要先在「设置」里接上大模型（博查负责查，大模型负责写）。');
  spec = { ...spec };
  const givenYear = spec.year !== '' && spec.year != null && Number.isFinite(Number(spec.year));
  spec.year = givenYear ? toAstro(spec.year) : null;
  if (!givenYear || spec.random || !spec.identity) {
    const r = randomSpec();
    const userSet = Object.fromEntries(Object.entries(spec).filter(([, v]) => v !== '' && v != null && v !== false));
    spec = { ...r, ...userSet, year: givenYear ? spec.year : r.year };
    if (givenYear && !userSet.dynasty) spec.dynasty = dynastyOf(spec.year);
    if (userSet.identity && !userSet.idm) delete spec.idm;
  }
  if (spec.year < cal.MIN_Y || spec.year > cal.MAX_Y) throw new Error('年份要在公元前221年到1912年之间');
  spec.dynasty = spec.dynasty || dynastyOf(spec.year);
  progress && progress({ step: 'spec', text: `${yearWords(spec.year)} · ${spec.dynasty} · ${spec.place || '地点待定'} · ${spec.identity || '身份待定'}` });

  let cards = [];
  if (search.enabled()) {
    const qs = await planQueries(spec);
    cards = await gather(qs, progress, budget);
  } else {
    progress && progress({ step: 'note', text: '没有接博查：只能凭大模型的记忆写，史事一律标"未查证"。' });
  }

  let issues = [];
  for (let k = 0; k < 2; k++) {
    progress && progress({ step: 'write', text: k ? '底本有问题，重写一次……' : '依据资料写世界底本……' });
    const p = worldPrompt(spec, cards, issues);
    const raw = await llm.chat(p.system, p.user, { json: true, maxTokens: 8000, timeoutMs: 180000 });
    const r = normalize(raw, spec, cards);
    issues = r.issues.slice();
    // 时代把关：开场与第一件事
    const g = guard.merge(r.world.guard);
    const at = r.world.identity.start;
    for (const [i, b] of r.world.identity.opening.entries()) {
      for (const t of [b.text, ...(b.actions || []).flatMap(a => [a.label, a.bridge])]) {
        for (const x of guard.check(t, at, g)) issues.push(`第${i + 1}拍里"${x.term}"：${x.why}`);
      }
    }
    if (r.world.hook) for (const t of [r.world.hook.text, ...r.world.hook.approaches.flatMap(a => [a.label, a.report, a.rumor, ...Object.values(a.by)])]) {
      for (const x of guard.check(t, at, g)) issues.push(`第一件事里"${x.term}"：${x.why}`);
    }
    if (!issues.length) {
      progress && progress({ step: 'done', text: `底本完成：主线史事 ${r.world.mainline.length} 条（${countGrades(r.world.mainline)}），资料卡 ${cards.length} 张。` });
      return r.world;
    }
  }
  throw new Error('底本两次都没通过核对：' + issues.slice(0, 4).join('；'));
}

function countGrades(list) {
  const c = {};
  for (const m of list) c[m.confidence] = (c[m.confidence] || 0) + 1;
  return Object.entries(c).map(([k, v]) => `${k}${v}`).join('、') || '无';
}

/** 往后续查：当前日期离已查到的范围不足一年时，再查后面两三年 */
async function extend(s, w, progress, budget) {
  if (!llm.enabled()) return 0;
  const from = w.horizon.y + 1;
  const to = Math.min(cal.MAX_Y, from + 2);
  if (from > cal.MAX_Y) return 0;
  const spec = { year: from, dynasty: dynastyOf(from) || w.dynasty, place: w.identity.place, identity: w.identity.title };
  let cards = [];
  if (search.enabled()) {
    const eraName = cal.era(from, w.eras).label;
    const qs = [
      `${yearWords(from)} ${spec.dynasty} 大事记`, `${eraName} ${spec.dynasty} 大事`,
      `${yearWords(from + 1)} ${spec.dynasty} 大事`, `${spec.dynasty} ${w.identity.place} ${yearWords(from)}`,
      `${spec.dynasty} ${yearWords(from)} 年号 改元`,
    ];
    cards = await gather(qs, progress, budget);
  }
  const offset = (w.sources || []).length;
  cards = cards.map((c, i) => ({ ...c, id: 'S' + (offset + i + 1) }));
  const known = (w.mainline || []).map(m => m.title).slice(-40).join('、');
  const p = {
    system: '你是严谨的历史学者。只输出一个 JSON 对象。',
    user: `续写一局历史模拟的主线史事：${yearWords(from)} 到 ${yearWords(to)}，朝代 ${spec.dynasty}。主角：${w.identity.title}，在 ${w.identity.place}。
已有的史事（不要重复）：${known || '无'}
【资料卡】${cards.length ? cardsText(cards) : '无（凭知识，拿不准的不写，cite 留空）'}
规则：只写资料卡里有的大事，每条在 cite 写资料卡编号；日期只写到资料支持的精度；公元前用负数；月份用农历月；deliver 写传到主角手里的形式（听不到填 null）。如果这几年改了年号，在 eras 里补上。
输出：{"eras":[{"name":"","start":公元年,"end":公元年,"cite":[]}],"mainline":[{"title":"","year":0,"month":null,"precision":"month|season|year","fact":"","kind":"fixed|court","scope":"","cite":[],"deliver":{"delay":0,"from":"","form":"","title":"","text":"","approaches":[]},"choice":{"prompt":"","history":""}}],"guard":{"terms":[{"word":"","fromYear":0,"why":""}]}}`,
  };
  let raw;
  try { raw = await llm.chat(p.system, p.user, { json: true, maxTokens: 5000, timeoutMs: 120000 }); } catch (e) { progress && progress({ step: 'error', text: e.message }); return 0; }
  const searched = cards.length > 0 || !!w.searched;
  const cardMap = Object.fromEntries(cards.map(c => [c.id, c]));
  const cls = s.deliverClass;
  const add = normMainline(raw.mainline, cardMap, cards.length > 0, from).filter(m => m.date.y >= from).map(m => {
    const out = { ...m, deliver: m.deliverRaw ? { [cls]: m.deliverRaw } : null };
    delete out.deliverRaw;
    if (!(cls === 'court' && m.kind === 'court')) out.choice = null;
    return out;
  });
  const gArr = (raw.guard && raw.guard.terms) || [];
  const esc = x => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const newTerms = gArr.filter(t => t.word && Number.isFinite(Number(t.fromYear))).map(t => ({ re: esc(t.word), from: { y: toAstro(t.fromYear), m: 1 }, why: String(t.why || '') }));
  const newEras = (raw.eras || []).map(e => ({ name: String(e.name || '').slice(0, 6), start: toAstro(e.start), end: e.end == null ? null : toAstro(e.end), grade: gradeOf(e.cite, cardMap, cards.length > 0) }))
    .filter(e => e.name && Number.isFinite(e.start) && (!cards.length || e.grade !== '存疑') && !(w.eras || []).some(x => x.name === e.name));
  s.ext = s.ext || { mainline: [], guard: { terms: [], banned: [] }, eras: [], sources: [] };
  s.ext.mainline.push(...add);
  s.ext.guard.terms.push(...newTerms);
  s.ext.eras.push(...newEras);
  s.ext.sources.push(...cards);
  s.ext.horizon = { y: to, m: 12 };
  progress && progress({ step: 'done', text: `续查 ${yearWords(from)}—${yearWords(to)}：新增史事 ${add.length} 条（${countGrades(add)}）` });
  return add.length;
}

/** 玩家手动"查一下"：检索 + 摘要（只进史事面板，不进正文） */
async function lookup(s, w, question, budget) {
  question = String(question || '').trim().slice(0, 100);
  if (!question) throw new Error('要查什么？');
  const dyn = dynastyOf(s.date.y) || w.dynasty;
  let cards = [];
  if (search.enabled()) cards = await gather([`${dyn} ${question}`, question], null, budget);
  let answer = '';
  if (llm.enabled()) {
    try {
      const out = await llm.chat('你是严谨的历史学者。只输出 JSON。',
        `玩家在${yearWords(s.date.y)}（${dyn}）的游戏里想查："${question}"。
资料卡：${cards.length ? cardsText(cards, 12) : '无（只能凭知识，要说明没有出处）'}
请用三五句话回答，只说资料卡支持的；指出此时（${yearWords(s.date.y)}）这个东西/这个人/这个说法是否已经存在。
输出：{"answer":"","existsNow":true|false|null,"cite":["S1"]}`, { json: true, maxTokens: 800 });
      answer = String(out.answer || '');
      const used = (out.cite || []).map(c => cards.find(x => x.id === c)).filter(Boolean);
      const rec = { turn: s.turn, q: question, answer, existsNow: out.existsNow, grade: cards.length ? (used.some(c => c.trust === '可信站点') ? '已核' : used.length ? '二手' : '存疑') : '未查证', sources: used.map(c => ({ title: c.title, url: c.url })) };
      s.lookups = [rec, ...(s.lookups || [])].slice(0, 80);
      return rec;
    } catch (e) { answer = '查询失败：' + e.message; }
  }
  const rec = { turn: s.turn, q: question, answer: answer || (cards.length ? '找到这些资料，请自行判断：' : '没有接博查和大模型，查不了。'), existsNow: null, grade: cards.length ? '二手' : '未查证', sources: cards.slice(0, 6).map(c => ({ title: c.title, url: c.url })) };
  s.lookups = [rec, ...(s.lookups || [])].slice(0, 80);
  return rec;
}

module.exports = { createWorld, extend, lookup, randomSpec, dynastyOf, DYNASTIES, ARCHETYPES, toAstro, fromAstro, yearWords, normalize };
