'use strict';
const test = require('node:test');
const assert = require('node:assert');
const cal = require('../engine/calendar');
const guard = require('../engine/guard');

test('历表覆盖秦到清，锚点与已知日期吻合', () => {
  assert.strictEqual(cal.MIN_Y, -220);
  assert.strictEqual(cal.MAX_Y, 1912);
  assert.strictEqual(cal.julian({ y: 1068, m: 1, d: 1 }), '1068年2月6日（儒略历）');
  assert.strictEqual(cal.julian({ y: 1068, m: 7, d: 9 }), '1068年8月9日（儒略历）'); // 熙宁元年七月己卯
  assert.strictEqual(cal.julian({ y: 1900, m: 1, d: 1 }), '1900年1月31日（格里历）');
  assert.ok(cal.inRange({ y: 1900, m: 8, leap: true }), '1900 年闰八月');
  assert.ok(cal.inRange({ y: 1645, m: 6, leap: true }), '顺治二年闰六月');
  assert.ok(cal.inRange({ y: 1069, m: 11, leap: true }), '熙宁二年闰十一月');
  assert.strictEqual(cal.julian({ y: 1912, m: 1, d: 1 }), '1912年2月18日（格里历）');
  assert.match(cal.julian({ y: -220, m: 1, d: 1 }), /^公元前221年/);
});

test('年号由剧本给出，没有就用干支', () => {
  const E = [{ name: '熙宁', start: 1068, end: 1077 }];
  assert.strictEqual(cal.fmt({ y: 1068, m: 9, d: 14 }, 'day', E), '熙宁元年九月十四');
  assert.strictEqual(cal.fmt({ y: 1071, m: 1, d: 1 }, 'day', E), '熙宁四年正月初一');
  assert.strictEqual(cal.fmt({ y: 1644, m: 3, d: 19 }, 'day'), '甲申年三月十九');
  assert.strictEqual(cal.fmt({ y: 1068, m: 12, d: 25 }, 'xun', E), '熙宁元年十二月下旬');
  assert.deepStrictEqual(cal.advance({ y: 1068, m: 12, d: 25 }, 'xun'), { y: 1069, m: 1, leap: false, d: 1 });
});

test('通用把关：现代词、后世纪年、考证腔；不误伤"小时候""三娘子"', () => {
  const G = guard.merge({ terms: [{ re: '青苗', from: { y: 1069, m: 9 }, why: '' }], banned: [{ re: '小娘(?!子)', why: '' }] });
  const at = { y: 1068, m: 9 };
  assert.ok(guard.check('他掏出手机', at, G).length);
  assert.ok(guard.check('据考，此地', at, G).length);
  assert.ok(guard.check('公元1068年', at, G).length);
  assert.ok(guard.check('里正来催青苗钱', at, G).length);
  assert.strictEqual(guard.check('里正来催青苗钱', { y: 1070, m: 2 }, G).length, 0);
  assert.strictEqual(guard.check('伯父说起你爹小时候的事', at, G).length, 0);
  assert.strictEqual(guard.check('三娘子，我就在这儿等你一句话', at, G).length, 0);
});

test('把握：稳约九成、难约三成；相关数值高会加成；同一种子结果可复现', () => {
  const rules = require('../engine/rules');
  let seed = 1;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const s = { stats: { skill: 50 } };
  const rate = (a, n = 4000) => { let ok = 0; for (let i = 0; i < n; i++) if (rules.roll(s, a, rand).ok) ok++; return ok / n; };
  assert.ok(Math.abs(rate({ odds: '稳' }) - 0.92) < 0.03);
  assert.ok(Math.abs(rate({ odds: '难' }) - 0.28) < 0.03);
  s.stats.skill = 100;
  assert.ok(rate({ odds: '五五', oddsStat: 'skill' }) > 0.65);
  assert.strictEqual(rules.roll(s, {}, rand).ok, true, '没写把握的办法一律成功');
});
