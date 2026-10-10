'use strict';
/**
 * 真实农历（替换「一月三十天」的简易进位）。
 * 月表 data/calendar.json 由 tools/calc_calendar.py 天文推算：1644 年前定朔平气，1645 年起定朔定气，
 * 覆盖公元前221年—1912年；与历代行用历法可能差一日或闰月位置不同。
 * 表里是天文纪年（0 = 公元前1年），本引擎的 gregorianYear 是历史纪年（-1 = 公元前1年，没有 0 年），这里负责换算。
 * 超出范围时退回 30 天一月，保证不阻断推进。
 */
const fs = require('fs');
const path = require('path');

let MONTHS = null, YEAR_FIRST = null;
function load() {
  if (MONTHS) return;
  MONTHS = []; YEAR_FIRST = new Map();
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'calendar.json'), 'utf8')).years;
    for (const [y, , lens, leapPos] of raw) {
      YEAR_FIRST.set(y, MONTHS.length);
      let num = 0;
      for (let i = 0; i < lens.length; i++) {
        const leap = i === leapPos;
        if (!leap) num += 1;
        MONTHS.push({ y, m: num, leap, days: lens[i] === '1' ? 30 : 29 });
      }
    }
  } catch (_) { /* 没有月表就全程退回 30 天一月 */ }
}
const toAstro = y => (y < 0 ? y + 1 : y);
const fromAstro = y => (y <= 0 ? y - 1 : y);

function idx(y, m, leap) {
  load();
  const first = YEAR_FIRST.get(toAstro(y));
  if (first == null) return -1;
  for (let i = first; i < MONTHS.length && MONTHS[i].y === toAstro(y); i++) {
    if (MONTHS[i].m === m && MONTHS[i].leap === !!leap) return i;
  }
  // 存档里标了闰月但该年其实不闰：退到同名正月份
  return leap ? idx(y, m, false) : -1;
}

/** 这个月有几天（29/30）；查不到返回 30 */
function monthDays(y, m, leap) {
  const i = idx(y, m, leap);
  return i < 0 ? 30 : MONTHS[i].days;
}
/** 这一年有没有闰月、闰几月（0 = 不闰） */
function leapMonthOf(y) {
  load();
  const first = YEAR_FIRST.get(toAstro(y));
  if (first == null) return 0;
  for (let i = first; i < MONTHS.length && MONTHS[i].y === toAstro(y); i++) if (MONTHS[i].leap) return MONTHS[i].m;
  return 0;
}

/** 从 {y,m,d,leap} 往后推 n 天，按真实大小月与闰月进位 */
function addDays(date, n) {
  let { y, m, d } = date; let leap = !!date.leap;
  let i = idx(y, m, leap);
  if (i < 0) {
    d += n;
    while (d > 30) { d -= 30; m += 1; if (m > 12) { m = 1; y += 1; if (y === 0) y = 1; } }
    return { y, m, d, leap: false, approx: true };
  }
  d = Math.min(d, MONTHS[i].days) + n;
  while (d > MONTHS[i].days) {
    d -= MONTHS[i].days; i += 1;
    if (i >= MONTHS.length) { const t = MONTHS[i - 1]; return addDays({ y: fromAstro(t.y) + 1, m: 1, d, leap: false }, 0); }
  }
  const t = MONTHS[i];
  return { y: fromAstro(t.y), m: t.m, d, leap: t.leap };
}

const MONTH_CN = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '腊月'];
const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function dayName(d) {
  if (d <= 10) return '初' + NUM[d];
  if (d < 20) return '十' + NUM[d - 10];
  if (d === 20) return '二十';
  if (d < 30) return '廿' + NUM[d - 20];
  return '三十';
}
/** 「闰四月廿三」 */
function label(m, d, leap) { return (leap ? '闰' : '') + (MONTH_CN[m] || `${m}月`) + (d ? dayName(d) : ''); }

module.exports = { addDays, monthDays, leapMonthOf, label, dayName };
