'use strict';
/**
 * 农历时间。月表由 tools/calc_calendar.py 天文推算（定朔、平气置闰），
 * 与宋代行用历法可能差一日；只用于公历换算和月长，界面上标"推算"。
 */
const path = require('path');
const fs = require('fs');

const TABLE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'calendar.json'), 'utf8')).months;

const ERAS = [
  { name: '治平', start: 1064 },
  { name: '熙宁', start: 1068 },
  { name: '元丰', start: 1078 },
  { name: '元祐', start: 1086 },
];
const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const MONTH = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '腊月'];
const XUN = ['上旬', '中旬', '下旬'];
const SEASON = m => (m <= 3 ? '春' : m <= 6 ? '夏' : m <= 9 ? '秋' : '冬');

function era(y) {
  let e = ERAS[0];
  for (const x of ERAS) if (y >= x.start) e = x;
  const n = y - e.start + 1;
  const ord = n === 1 ? '元' : n <= 10 ? NUM[n] : n < 20 ? '十' + NUM[n - 10] : String(n);
  return { name: e.name, n, label: `${e.name}${ord}年` };
}

/** 月序：在 TABLE 里的下标 */
function idx(date) {
  return TABLE.findIndex(t => t.year === date.y && t.month === date.m && !!t.leap === !!date.leap);
}

function monthLabel(date) {
  return (date.leap ? '闰' : '') + (date.m === 12 ? '十二月' : MONTH[date.m]);
}

/** date: { y, m, leap, d }  d 为日（1–30） */
function fmt(date, unit = 'xun') {
  const e = era(date.y).label;
  if (unit === 'season') return `${e}${SEASON(date.m)} · ${monthLabel(date)}`;
  if (unit === 'month') return `${e}${monthLabel(date)}`;
  if (unit === 'day') return `${e}${monthLabel(date)}${dayName(date.d)}`;
  return `${e}${monthLabel(date)}${XUN[Math.min(2, Math.floor((date.d - 1) / 10))]}`;
}

function dayName(d) {
  if (d <= 10) return '初' + (d === 10 ? '十' : NUM[d]);
  if (d < 20) return '十' + NUM[d - 10];
  if (d === 20) return '二十';
  if (d < 30) return '廿' + NUM[d - 20];
  return '三十';
}

/** 往后推：unit = xun | month | season */
function advance(date, unit) {
  let i = idx(date);
  if (i < 0) throw new Error('日期超出月表范围：' + JSON.stringify(date));
  if (unit === 'xun') {
    if (date.d < 21) return { ...date, d: date.d < 11 ? 11 : 21 };
    i += 1;
    return pick(i, 1);
  }
  const steps = unit === 'season' ? 3 : 1;
  for (let k = 0; k < steps; k++) i += 1;
  return pick(i, 1);
}
function pick(i, d) {
  const t = TABLE[i];
  if (!t) throw new Error('月表到头了');
  return { y: t.year, m: t.month, leap: !!t.leap, d };
}

/** 可比较的序数（月序*100+日） */
function ord(date) { return idx(date) * 100 + date.d; }

/** 由"熙宁二年九月"这类坐标构造日期（史事表用 {y,m,d?}） */
function at(y, m, d = 1, leap = false) { return { y, m, leap, d }; }

/** 公历换算（推算）：返回儒略历日期字符串 */
function julian(date) {
  const t = TABLE[idx(date)];
  if (!t) return '';
  const [Y, M, D] = t.julian.split('-').map(Number);
  const dt = new Date(Date.UTC(Y, M - 1, D));
  // JS Date 是前推格里历；月表的 julian 字段已是儒略历日期字符串，这里只做日数相加
  dt.setUTCDate(dt.getUTCDate() + date.d - 1);
  return `${dt.getUTCFullYear()}年${dt.getUTCMonth() + 1}月${dt.getUTCDate()}日`;
}

function monthsBetween(a, b) { return idx(b) - idx(a); }

module.exports = { fmt, era, advance, ord, at, julian, monthLabel, dayName, SEASON, monthsBetween, idx };
