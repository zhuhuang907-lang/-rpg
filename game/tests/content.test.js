'use strict';
/**
 * 内容与史实把关测试：
 * - 本地写好的每一段正文，在它最早可能出现的时间点，都要通过时代把关；
 * - 主线史事表每条都有可信度和出处，存疑的不得发给玩家；
 * - 历法锚点与已知史料对得上；
 * - 整局模拟跑下来不报错，史事不早于"发生日期＋传递延迟"上案头，皇帝否决的决策会让后续史事分岔。
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const os = require('os');
// 用一个空的临时配置：本测试只验证本地内容，不接大模型
process.env.SHU_CONFIG = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shu-')), 'config.json');
const scenario = require('../engine/scenario');
const guard = require('../engine/guard');
const cal = require('../engine/calendar');
const game = require('../engine/game');

const scn = scenario.load('xining');

function texts(card) {
  const out = [card.title, typeof card.text === 'function' ? '' : card.text];
  for (const a of card.approaches || []) out.push(a.label, a.report, a.rumor, ...Object.values(a.by || {}));
  if (card.ignore) out.push(card.ignore.report);
  return out.filter(Boolean);
}

test('本地正文在最早出现的时间点都能通过时代把关', () => {
  const bad = [];
  for (const idn of Object.values(scn.identities)) {
    const at = idn.start;
    for (const b of idn.opening) {
      for (const t of [b.text, ...(b.actions || []).flatMap(a => [a.label, a.bridge])]) {
        const is = guard.check(t, at, scn.guard);
        if (is.length) bad.push([idn.id, '开场', t.slice(0, 20), is]);
      }
    }
    for (const e of [...idn.events, ...(idn.groupEvents || [])]) {
      for (const t of texts(e)) { const is = guard.check(t, at, scn.guard); if (is.length) bad.push([idn.id, e.id, t.slice(0, 20), is]); }
    }
    for (const p of idn.people) for (const t of [p.sample, ...((idn.smallTalk || {})[p.id] || [])]) {
      const is = guard.check(t, at, scn.guard); if (is.length) bad.push([idn.id, p.id, t, is]);
    }
  }
  for (const k of ['commoner', 'court', 'commonerPool', 'courtPool']) {
    for (const d of scn.daily[k]) for (const t of texts(d)) { const is = guard.check(t, { y: 1068, m: 9, d: 1 }, scn.guard); if (is.length) bad.push([k, d.id, t.slice(0, 20), is]); }
  }
  for (const side of Object.values(scn.weather.cards)) for (const [k, w] of Object.entries(side)) {
    const is = guard.check(w.text, { y: 1068, m: 9, d: 1 }, scn.guard); if (is.length) bad.push(['weather', k, w.text.slice(0, 20), is]);
  }
  for (const m of scn.mainline) {
    for (const [cls, d] of Object.entries(m.deliver || {})) {
      let at = { y: m.date.y, m: m.date.m, leap: false, d: 1 };
      for (let i = 0; i < (d.delay || 0); i++) at = cal.advance(at, 'month');
      for (const t of texts({ ...d, title: d.title || '' })) {
        const is = guard.check(t, at, scn.guard); if (is.length) bad.push([m.id, cls, t.slice(0, 20), is]);
      }
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('主线史事表：都有可信度与出处；存疑的不发给玩家', () => {
  for (const m of scn.mainline) {
    assert.ok(['已核', '二手', '存疑'].includes(m.confidence), m.id);
    assert.ok(['month', 'season', 'year'].includes(m.precision), m.id);
    if (m.confidence !== '存疑') assert.ok(m.source.length > 0, m.id + ' 缺出处');
    if (m.confidence === '存疑') assert.ok(!m.deliver, m.id + ' 存疑却要发给玩家');
  }
});

test('历法锚点：熙宁元年正月朔＝1068-02-06（儒略），七月己卯＝初九＝1068-08-09，熙宁二年有闰十一月', () => {
  assert.strictEqual(cal.julian({ y: 1068, m: 1, d: 1 }), '1068年2月6日');
  assert.strictEqual(cal.julian({ y: 1068, m: 7, d: 9 }), '1068年8月9日');
  assert.ok(cal.idx({ y: 1069, m: 11, leap: true }) >= 0);
  assert.strictEqual(cal.fmt({ y: 1068, m: 9, d: 14 }, 'day'), '熙宁元年九月十四');
  assert.strictEqual(cal.fmt({ y: 1071, m: 1, d: 1 }, 'day'), '熙宁四年正月初一');
});

async function play(identity, turns, choose) {
  const s = game.newGame('xining', identity);
  const idn = scn.identities[identity];
  while (s.phase === 'opening') await game.act(s, { type: 'beat', index: 0 });
  const seen = [];
  for (let t = 0; t < turns; t++) {
    for (const d of s.docket) {
      if (d.ref.kind === 'mainline') seen.push({ id: d.ref.id, at: { ...s.date } });
      const pick = choose(s, d);
      if (pick) await game.act(s, { type: 'note', uid: d.uid, approachId: pick });
    }
    await game.act(s, { type: 'endTurn' });
  }
  return { s, seen, idn };
}

test('整局模拟：平民 60 旬、皇帝 34 季，不报错、无把关问题、史事不早到', async () => {
  for (const [identity, turns] of [['zhou', 60], ['shenzong', 34]]) {
    const { s, seen } = await play(identity, turns, () => null);
    assert.deepStrictEqual(s.gm.issues, [], identity + ' 有把关问题');
    for (const x of seen) {
      const m = scn.mainline.find(y => y.id === x.id);
      const d = m.deliver[s.deliverClass];
      let at = { y: m.date.y, m: m.date.m, leap: false, d: 1 };
      for (let i = 0; i < (d.delay || 0); i++) at = cal.advance(at, 'month');
      assert.ok(cal.ord(x.at) >= cal.ord(at), `${x.id} 早到了`);
    }
  }
});

test('皇帝否决"王安石主持财计"后，均输、青苗等后续史事不再发生', async () => {
  const s = game.newGame('xining', 'shenzong');
  while (s.phase === 'opening') await game.act(s, { type: 'beat', index: 0 });
  for (let t = 0; t < 12; t++) {
    const m05 = s.docket.find(d => d.ref.kind === 'mainline' && d.ref.id === 'M05');
    if (m05) await game.act(s, { type: 'note', uid: m05.uid, approachId: 'reject' });
    await game.act(s, { type: 'endTurn' });
  }
  assert.strictEqual(s.mainline.M05, 'rejected');
  assert.strictEqual(s.mainline.M07, 'blocked');
  assert.strictEqual(s.mainline.M08, 'blocked');
});

test('平民身份收不到朝廷内部的决策，只收到传闻，且标题不泄露她不该知道的名字', async () => {
  const { s } = await play('zhou', 60, () => null);
  const titles = s.story.filter(e => e.kind === 'docket').map(e => e.title);
  assert.ok(titles.includes('京里换了个管钱粮的参政'));
  assert.ok(!titles.some(t => /王安石/.test(t)));
});

