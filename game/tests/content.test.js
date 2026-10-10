'use strict';
/**
 * 现成剧本的内容与史实把关：
 * - 本地写好的每一段正文，在最早可能出现的时间点都能通过时代把关；
 * - 主线史事表每条都有可信度与出处，存疑的不发；
 * - 整局模拟（不限回合）不报错、史事不早到、皇帝否决会让历史分岔、依史模式下真实人物按史载卒年收场。
 */
require('./_env');
const test = require('node:test');
const assert = require('node:assert');
const scenario = require('../engine/scenario');
const guard = require('../engine/guard');
const cal = require('../engine/calendar');
const game = require('../engine/game');

const scn = scenario.load('xining');
const G = guard.merge(scn.guard);

function texts(card) {
  const out = [card.title, typeof card.text === 'function' ? '' : card.text];
  for (const a of card.approaches || []) out.push(a.label, a.report, a.rumor, ...Object.values(a.by || {}));
  if (card.ignore) out.push(card.ignore.report);
  return out.filter(Boolean);
}

test('本地正文在最早出现的时间点都能通过时代把关', () => {
  const bad = [];
  const chk = (where, t, at) => { const is = guard.check(t, at, G); if (is.length) bad.push([where, String(t).slice(0, 20), is]); };
  for (const idn of Object.values(scn.identities)) {
    const at = idn.start;
    for (const b of idn.opening) for (const t of [b.text, ...(b.actions || []).flatMap(a => [a.label, a.bridge])]) chk(idn.id + '开场', t, at);
    for (const e of [...idn.events, ...(idn.groupEvents || [])]) for (const t of texts(e)) chk(idn.id + e.id, t, at);
    for (const p of idn.people) for (const t of [p.sample, ...((idn.smallTalk || {})[p.id] || [])]) chk(idn.id + p.id, t, at);
  }
  for (const k of ['commoner', 'court', 'commonerPool', 'courtPool']) for (const d of scn.daily[k]) for (const t of texts(d)) chk(k + d.id, t, { y: 1068, m: 9 });
  for (const side of Object.values(scn.weather.cards)) for (const [k, w] of Object.entries(side)) chk('天时' + k, w.text, { y: 1068, m: 9 });
  for (const m of scn.mainline) for (const [cls, d] of Object.entries(m.deliver || {})) {
    let at = { y: m.date.y, m: m.date.m, leap: false, d: 1 };
    for (let i = 0; i < (d.delay || 0); i++) at = cal.advance(at, 'month');
    for (const t of texts({ ...d, title: d.title || '' })) chk(m.id + cls, t, at);
  }
  assert.deepStrictEqual(bad, []);
});

test('主线史事表：都有可信度与出处；存疑的不发', () => {
  for (const m of scn.mainline) {
    assert.ok(['已核', '二手', '存疑'].includes(m.confidence), m.id);
    if (m.confidence !== '存疑') assert.ok(m.source.length > 0, m.id + ' 缺出处');
    else assert.ok(!m.deliver, m.id);
  }
});

async function play(identity, turns, mode) {
  const s = game.newGame('xining', identity, mode);
  while (s.phase === 'opening') await game.act(s, { type: 'beat', index: 0 });
  const seen = [];
  for (let t = 0; t < turns && s.phase === 'turn'; t++) {
    for (const d of s.docket) if (d.ref.kind === 'mainline') seen.push({ id: d.ref.id, at: { ...s.date } });
    await game.act(s, { type: 'endTurn' });
  }
  return { s, seen };
}

test('不限回合：平民 400 旬（十余年）跑下来不报错、无把关问题、史事不早到、会长大', async () => {
  const { s, seen } = await play('zhou', 400, 'free');
  assert.deepStrictEqual(s.gm.issues, []);
  assert.ok(s.turn >= 400 || s.phase === 'ended');
  assert.ok(s.age > 17);
  for (const x of seen) {
    const m = scn.mainline.find(y => y.id === x.id);
    let at = { y: m.date.y, m: m.date.m, leap: false, d: 1 };
    for (let i = 0; i < (m.deliver.commoner.delay || 0); i++) at = cal.advance(at, 'month');
    assert.ok(cal.ord(x.at) >= cal.ord(at), `${x.id} 早到了`);
  }
});

test('依史模式：神宗到元丰八年三月故去，收场并写生平', async () => {
  const { s } = await play('shenzong', 200, 'history');
  assert.strictEqual(s.phase, 'ended');
  assert.strictEqual(s.date.y, 1085);
  assert.ok(s.ending && s.ending.text.length > 20);
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

test('平民收到的是传闻，标题不泄露她不该知道的名字；志向能推进', async () => {
  const s = game.newGame('xining', 'zhou');
  while (s.phase === 'opening') await game.act(s, { type: 'beat', index: 0 });
  for (let t = 0; t < 60; t++) {
    for (const d of s.docket) {
      if (d.ref.kind === 'event' && d.ref.id === 'E01') await game.act(s, { type: 'note', uid: d.uid, approachId: 'tellMother' });
      if (d.ref.kind === 'event' && d.ref.id === 'E07') await game.act(s, { type: 'note', uid: d.uid, approachId: 'keep' });
    }
    await game.act(s, { type: 'endTurn' });
  }
  const titles = s.story.filter(e => e.kind === 'docket').map(e => e.title);
  assert.ok(titles.includes('京里换了个管钱粮的参政'));
  assert.ok(!titles.some(t => /王安石/.test(t)));
  assert.ok(s.goals[0].progress >= 30);
});
