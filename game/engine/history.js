'use strict';
/**
 * 每回合的史事核对。
 * 一、从主线史事表里找出"本回合该到"的条目（发生日期＋按身份的传递延迟），判断对这个身份是否可见、
 *     因果前提是否成立、评级够不够，决定上不上案头。
 * 二、本回合时间窗里每一条史事的处理结果都写进核对记录（史事面板可查）。
 * 发给玩家的评级：已核、二手；"未查证"（没接博查时大模型凭记忆写的）默认不发，设置里可放开；"存疑"永远不发。
 */
const cal = require('./calendar');
const llm = require('./llm');

function monthsAfter(date, n) {
  let d = { y: date.y, m: date.m, leap: false, d: 1 };
  if (!cal.inRange(d)) return d;
  for (let i = 0; i < n; i++) d = cal.advance(d, 'month');
  return d;
}

function deliverable(m) {
  if (m.confidence === '存疑') return false;
  if (m.confidence === '未查证') return !!(llm.config().research || {}).allowUnverified;
  return true;
}

function depState(s, w, id) {
  if (s.deliverClass !== 'court') return 'ok';
  let st = 'ok';
  for (const dep of w.deps[id] || []) {
    const ml = w.mainline.find(x => x.id === dep);
    const v = s.mainline[dep];
    if (ml && ml.kind === 'fixed') { if (v === 'blocked') return 'fail'; continue; }
    if (v === 'followed') continue;
    if (['rejected', 'shelved', 'blocked'].includes(v)) return 'fail';
    st = 'pending';
  }
  return st;
}

function step(s, w, prevDate, curDate) {
  const cls = s.deliverClass;
  const lo = prevDate ? cal.ord(prevDate) : -Infinity;
  const hi = cal.ord(curDate);
  const due = [];
  const log = [];
  const authored = new Set((w.identity.events || []).filter(e => e.mainline).map(e => e.mainline));

  for (const m of w.mainline) {
    if (s.mainline[m.id]) continue;
    const happened = cal.ord({ y: m.date.y, m: m.date.m, leap: false, d: 1 });
    if (happened > hi) continue;
    const inWindow = happened > lo;
    const d = m.deliver && m.deliver[cls];
    if (m.background && !d) { s.mainline[m.id] = 'background'; continue; }
    const entry = { id: m.id, title: m.title, when: label(m, w.eras), confidence: m.confidence, status: '' };
    if (!deliverable(m)) {
      s.mainline[m.id] = 'doubt';
      entry.status = m.confidence === '未查证' ? '未查证，不发（接上博查可查实）' : '存疑，不发';
      log.push(entry);
      continue;
    }
    const ds = depState(s, w, m.id);
    if (ds === 'fail') { s.mainline[m.id] = 'blocked'; entry.status = '前提已被你否决，历史在此分岔：不发生'; log.push(entry); continue; }
    if (ds === 'pending') continue;
    // 开局前很久的事，只当背景
    if (!prevDate && happened < cal.ord(s.startDate || curDate) - 400) { s.mainline[m.id] = 'background'; continue; }
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
    s.mainline[m.id] = cls === 'court' && m.choice ? 'asked' : 'delivered';
    log.push(entry);
  }
  return { due, log };
}

function label(m, eras) {
  const e = cal.era(m.date.y, eras).label;
  if (m.precision === 'year') return e;
  if (m.precision === 'season') return e + cal.SEASON(m.date.m);
  return e + cal.monthLabel({ m: m.date.m, leap: false });
}

/** 给生成用的"已知史事"：已发生、可发的，日期按精度写 */
function knownFacts(s, w, curDate) {
  const now = cal.ord(curDate);
  return w.mainline
    .filter(deliverable)
    .filter(m => cal.ord({ y: m.date.y, m: m.date.m, leap: false, d: 1 }) <= now)
    .filter(m => !['blocked', 'rejected', 'shelved'].includes(s.mainline[m.id]))
    .slice(-30)
    .map(m => `- ${label(m, w.eras)}：${m.fact}${s.mainline[m.id] === 'offstage' ? '（主角这个身份不知道）' : ''}`);
}

module.exports = { step, knownFacts, label, deliverable };
