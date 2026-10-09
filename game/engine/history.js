'use strict';
/**
 * 每回合的历史检索与核对。
 *
 * 一、主线：从史事表里找出"本回合该到"的条目（史事日期 + 按身份的传递延迟），
 *     判断它对这个身份是否可见、因果前提是否成立、是否存疑，然后决定上不上案头。
 * 二、核对记录：本回合时间窗里的每一条史事都列出处理结果，写进史事面板，玩家可以随时查。
 * 三、联网检索（可选）：按"年号＋地点"查维基百科，结果一律标"联网·待核"，只进面板、
 *     不进正文；若与史事表的日期冲突，标红提示。
 */
const cal = require('./calendar');
const llm = require('./llm');

function monthsAfter(date, n) {
  // 史事日期加 n 个月（按月表）
  let d = { y: date.y, m: date.m, leap: false, d: date.d || 1 };
  for (let i = 0; i < n; i++) d = cal.advance({ ...d, d: 1 }, 'month');
  return d;
}

function depState(s, scn, id) {
  if (s.deliverClass !== 'court') return 'ok'; // 非皇帝身份：朝廷依史行事
  let st = 'ok';
  for (const dep of scn.deps[id] || []) {
    const ml = scn.mainline.find(x => x.id === dep);
    const v = s.mainline[dep];
    if (ml && ml.kind === 'fixed') { if (v === 'blocked') return 'fail'; continue; }
    if (v === 'followed') continue;
    if (['rejected', 'shelved', 'blocked'].includes(v)) return 'fail';
    st = 'pending';
  }
  return st;
}

/**
 * 返回本回合应上案头的主线条目 + 核对记录。
 * 已经发生、消息已到、前提成立的条目上案头；前提还在待决（比如你把前一道札子"下两府详议"了）的，
 * 等前提定了再说；前提被你否决的，历史在这里分岔，记为"不发生"。
 */
function step(s, scn, prevDate, curDate) {
  const cls = s.deliverClass;
  const lo = prevDate ? cal.ord(prevDate) : -Infinity;
  const hi = cal.ord(curDate);
  const due = [];
  const log = [];
  const authored = new Set(scn.identities[s.identity].events.filter(e => e.mainline).map(e => e.mainline));

  for (const m of scn.mainline) {
    if (s.mainline[m.id]) continue;
    const happened = cal.ord({ y: m.date.y, m: m.date.m, leap: false, d: 1 });
    if (happened > hi) continue;
    const inWindow = happened > lo;
    const d = m.deliver && m.deliver[cls];
    if (m.background && !d) { s.mainline[m.id] = 'background'; continue; }
    const entry = { id: m.id, title: m.title, when: label(m), confidence: m.confidence, status: '' };
    if (m.confidence === '存疑') {
      s.mainline[m.id] = 'doubt';
      entry.status = '存疑，不发（只记在这里）';
      log.push(entry);
      continue;
    }
    const ds = depState(s, scn, m.id);
    if (ds === 'fail') {
      s.mainline[m.id] = 'blocked';
      entry.status = '前提已被你否决，历史在此分岔：不发生';
      log.push(entry);
      continue;
    }
    if (ds === 'pending') continue;
    if (!d) {
      s.mainline[m.id] = 'offstage';
      if (inWindow) { entry.status = '本回合发生，但你这个身份听不到'; log.push(entry); }
      continue;
    }
    const arrive = cal.ord(monthsAfter(m.date, d.delay || 0));
    if (arrive > hi) {
      if (inWindow) { entry.status = '已发生，消息还在路上'; log.push(entry); }
      continue;
    }
    if (authored.has(m.id)) entry.status = '已写成本局专门的来报';
    else { entry.status = '已上案头'; due.push(m); }
    if (!(cls === 'court' && m.choice)) s.mainline[m.id] = 'delivered';
    else s.mainline[m.id] = 'asked';
    log.push(entry);
  }
  return { due, log };
}

function label(m) {
  const e = cal.era(m.date.y).label;
  if (m.precision === 'year') return e;
  if (m.precision === 'season') return e + cal.SEASON(m.date.m);
  return e + cal.monthLabel({ m: m.date.m, leap: false });
}

/** 联网检索（可选，失败不影响游戏） */
async function online(s, scn, curDate) {
  const conf = llm.config().history || {};
  if (!conf.online) return [];
  const q = `${cal.era(curDate.y).label} ${scn.identities[s.identity].place.split(' ')[0]}`;
  const url = 'https://zh.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=5&srsearch=' + encodeURIComponent(q);
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(url, { signal: ctl.signal, headers: { 'user-agent': 'shu-sim/0.1 (history game)' } });
    clearTimeout(t);
    if (!r.ok) return [{ query: q, error: 'HTTP ' + r.status }];
    const j = await r.json();
    return (j.query?.search || []).map(x => ({
      query: q, title: x.title,
      snippet: String(x.snippet || '').replace(/<[^>]+>/g, ''),
      url: 'https://zh.wikipedia.org/wiki/' + encodeURIComponent(x.title),
      grade: '联网·待核',
    }));
  } catch (e) {
    return [{ query: q, error: e.name === 'AbortError' ? '超时' : e.message }];
  }
}

/** 给生成用的"已知史事"摘要：只给已发生的、未存疑的，并按 precision 写日期 */
function knownFacts(s, scn, curDate) {
  const now = cal.ord(curDate);
  return scn.mainline
    .filter(m => m.confidence !== '存疑')
    .filter(m => cal.ord({ y: m.date.y, m: m.date.m, leap: false, d: 1 }) <= now)
    .filter(m => !['blocked', 'rejected', 'shelved'].includes(s.mainline[m.id]))
    .map(m => `- ${label(m)}：${m.fact}`);
}

module.exports = { step, online, knownFacts, label };
