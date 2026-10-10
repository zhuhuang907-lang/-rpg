'use strict';
/**
 * 农历：秦（公元前221）到清末（1912）。月表由 tools/calc_calendar.py 天文推算：
 * 1644 年前定朔平气，1645 年起定朔定气。与历代行用历法可能差一日或闰月位置不同，界面上标"推算"。
 * 年份一律用天文纪年（0 = 公元前1年，-220 = 公元前221年）。
 * 年号不内置：由剧本或开局检索给出 eras = [{ name, start, end }]（start/end 为天文纪年）；查不到时用干支纪年。
 */
const path = require('path');
const fs = require('fs');

const RAW = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'calendar.json'), 'utf8')).years;

// 展开成月序列
const MONTHS = [];
const YEAR_FIRST = new Map();
for (const [y, jd, lens, leapPos] of RAW) {
  YEAR_FIRST.set(y, MONTHS.length);
  let num = 0;
  for (let i = 0; i < lens.length; i++) {
    const leap = i === leapPos;
    if (!leap) num += 1;
    MONTHS.push({ y, m: num, leap, days: lens[i] === '1' ? 30 : 29, jd: 0 });
  }
}
// 逐月累加儒略日
{
  let i = 0;
  for (const [, jd, lens] of RAW) {
    let cur = jd;
    for (let k = 0; k < lens.length; k++) { MONTHS[i].jd = cur; cur += MONTHS[i].days; i++; }
  }
}
const MIN_Y = RAW[0][0], MAX_Y = RAW[RAW.length - 1][0];

const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const MONTH = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const XUN = ['上旬', '中旬', '下旬'];
const GAN = '甲乙丙丁戊己庚辛壬癸', ZHI = '子丑寅卯辰巳午未申酉戌亥';
const SEASON = m => (m <= 3 ? '春' : m <= 6 ? '夏' : m <= 9 ? '秋' : '冬');

function ganzhiYear(y) {
  const i = (((y - 4) % 60) + 60) % 60;
  return GAN[i % 10] + ZHI[i % 12];
}
function numCn(n) {
  if (n === 1) return '元';
  if (n <= 10) return NUM[n];
  if (n < 20) return '十' + NUM[n - 10];
  const t = Math.floor(n / 10), u = n % 10;
  return NUM[t] + '十' + (u ? NUM[u] : '');
}

/** 年号标签；eras 里找不到就用干支 */
function era(y, eras) {
  const list = (eras || []).filter(e => y >= e.start && (e.end == null || y <= e.end));
  const e = list.length ? list[list.length - 1] : null;
  if (!e) return { name: '', n: 0, label: `${ganzhiYear(y)}年` };
  const n = y - e.start + 1;
  return { name: e.name, n, label: `${e.name}${numCn(n)}${e.yearWord || '年'}` };
}

function idx(date) {
  const first = YEAR_FIRST.get(date.y);
  if (first == null) return -1;
  for (let i = first; i < MONTHS.length && MONTHS[i].y === date.y; i++) {
    if (MONTHS[i].m === date.m && MONTHS[i].leap === !!date.leap) return i;
  }
  return -1;
}
function inRange(date) { return idx(date) >= 0; }

function monthLabel(date) {
  return (date.leap ? '闰' : '') + MONTH[date.m];
}
function dayName(d) {
  if (d <= 10) return '初' + (d === 10 ? '十' : NUM[d]);
  if (d < 20) return '十' + NUM[d - 10];
  if (d === 20) return '二十';
  if (d < 30) return '廿' + NUM[d - 20];
  return '三十';
}

function fmt(date, unit = 'xun', eras) {
  const e = era(date.y, eras).label;
  if (unit === 'season') return `${e}${SEASON(date.m)} · ${monthLabel(date)}`;
  if (unit === 'month') return `${e}${monthLabel(date)}`;
  if (unit === 'day') return `${e}${monthLabel(date)}${dayName(date.d)}`;
  return `${e}${monthLabel(date)}${XUN[Math.min(2, Math.floor((date.d - 1) / 10))]}`;
}

function pick(i, d) {
  const t = MONTHS[i];
  if (!t) throw new Error('日期超出历表范围（公元前221年—1912年）');
  return { y: t.y, m: t.m, leap: t.leap, d: Math.min(d, t.days) };
}

/** 往后推：unit = day | xun | month | season | year */
function advance(date, unit, n = 1) {
  let i = idx(date);
  if (i < 0) throw new Error('日期超出历表范围：' + JSON.stringify(date));
  let cur = date;
  for (let k = 0; k < n; k++) {
    i = idx(cur);
    if (unit === 'day') {
      cur = cur.d < MONTHS[i].days ? { ...cur, d: cur.d + 1 } : pick(i + 1, 1);
    } else if (unit === 'xun') {
      cur = cur.d < 11 ? { ...cur, d: 11 } : cur.d < 21 ? { ...cur, d: 21 } : pick(i + 1, 1);
    } else if (unit === 'year') {
      cur = pick(i + 12 + (MONTHS.slice(i, i + 12).some(x => x.leap) ? 1 : 0), 1);
    } else {
      cur = pick(i + (unit === 'season' ? 3 : 1), 1);
    }
  }
  return cur;
}

/** 可比较的序数：儒略日数 */
function ord(date) {
  const i = idx(date);
  if (i < 0) {
    // 只给年月的史事：用该年的正月或下一年的推算
    const first = YEAR_FIRST.get(date.y);
    if (first == null) return date.y * 365.25 + 1721058;
    const j = Math.min(MONTHS.length - 1, first + Math.max(0, (date.m || 1) - 1));
    return MONTHS[j].jd + (date.d || 1) - 1;
  }
  return MONTHS[i].jd + (date.d || 1) - 1;
}

/** 儒略日数 → 公历日期（1582-10-15 以前儒略历，以后格里历） */
function jdToDate(jd) {
  const Z = Math.floor(jd + 0.5 - 0.5) + 0; // jd 为整数日数（正午）
  let A = Z;
  if (Z >= 2299161) { const al = Math.floor((Z - 1867216.25) / 36524.25); A = Z + 1 + al - Math.floor(al / 4); }
  const B = A + 1524, C = Math.floor((B - 122.1) / 365.25), D = Math.floor(365.25 * C), E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E);
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  return { year, month, day, gregorian: Z >= 2299161 };
}
function yearLabel(y) { return y <= 0 ? `公元前${1 - y}年` : `${y}年`; }

/** 公历换算（推算）文字 */
function julian(date) {
  if (!inRange(date)) return '';
  const g = jdToDate(ord(date));
  return `${yearLabel(g.year)}${g.month}月${g.day}日（${g.gregorian ? '格里历' : '儒略历'}）`;
}

function at(y, m, d = 1, leap = false) { return { y, m, leap, d }; }
function monthsBetween(a, b) { return idx(b) - idx(a); }

module.exports = {
  fmt, era, advance, ord, at, julian, monthLabel, dayName, SEASON, monthsBetween, idx, inRange,
  ganzhiYear, yearLabel, MIN_Y, MAX_Y,
};
