'use strict';
/** 通用小工具：关系、势力、地块查询。所有模块共用，避免各写一套口径。 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rk = (a, b) => [a, b].sort().join('|');
const round = (v, step = 1) => Math.round(v / step) * step;

function rel(state, a, b) {
  if (a === b) return { v: 100, war: false, ally: true, truce: 0 };
  const k = rk(a, b);
  if (!state.relations[k]) state.relations[k] = { v: 0, war: false, ally: false, truce: 0 };
  return state.relations[k];
}
const atWar = (state, a, b) => a !== b && rel(state, a, b).war;
const allied = (state, a, b) => a === b || rel(state, a, b).ally;

function ownedRegions(state, fid) {
  return Object.values(state.regions).filter(r => r.owner === fid);
}
function armiesOf(state, fid) {
  return Object.values(state.armies).filter(a => a.faction === fid);
}
function armiesAt(state, rid) {
  return Object.values(state.armies).filter(a => a.loc === rid);
}
function aliveFactions(state) {
  return Object.values(state.factions).filter(f => f.alive);
}
function totalTroops(state, fid) {
  const g = ownedRegions(state, fid).reduce((s, r) => s + r.garrison, 0);
  const a = armiesOf(state, fid).reduce((s, x) => s + x.troops, 0);
  return { garrison: g, field: a, total: g + a };
}
function totalPop(state, fid) {
  return ownedRegions(state, fid).reduce((s, r) => s + r.pop, 0);
}

function ageOf(person, year) {
  if (!person || person.born == null) return null;
  return year - person.born + 1; // 虚岁
}

/** 中文数字（用于年号、月份） */
const CN = '〇一二三四五六七八九';
function cnNum(n) {
  if (n <= 10) return n === 10 ? '十' : CN[n];
  if (n < 20) return '十' + CN[n - 10];
  const t = Math.floor(n / 10), u = n % 10;
  return CN[t] + '十' + (u ? CN[u] : '');
}
const MONTH_NAMES = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

function fmtNum(n) {
  n = Math.round(n);
  const abs = Math.abs(n);
  if (abs >= 1e8) return (n / 1e8).toFixed(abs >= 1e9 ? 1 : 2).replace(/\.?0+$/, '') + '亿';
  if (abs >= 1e4) return (n / 1e4).toFixed(abs >= 1e5 ? 0 : 1).replace(/\.0$/, '') + '万';
  return String(n);
}

function season(m) {
  if (m >= 1 && m <= 3) return '春';
  if (m <= 6) return '夏';
  if (m <= 9) return '秋';
  return '冬';
}

module.exports = {
  clamp, rk, round, rel, atWar, allied, ownedRegions, armiesOf, armiesAt, aliveFactions,
  totalTroops, totalPop, ageOf, cnNum, MONTH_NAMES, fmtNum, season,
};
