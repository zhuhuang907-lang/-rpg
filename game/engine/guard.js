'use strict';
/**
 * 时代把关：检查一段要进正文的文字。返回问题列表（空 = 通过）。
 * 问题只记进 GM 日志和史事面板的"本回合核对"，绝不以争论的形式写进正文。
 */
const ym = d => d.y * 12 + d.m;

function check(text, date, rules, opts = {}) {
  if (!text) return [];
  const out = [];
  const now = ym(date);
  for (const t of rules.terms || []) {
    const re = new RegExp(t.re, 'g');
    if (!re.test(text)) continue;
    if (now < ym(t.from)) out.push({ kind: '时代', term: t.re, why: t.why });
    else if (t.until && now > ym(t.until)) out.push({ kind: '时代', term: t.re, why: t.why });
  }
  for (const b of rules.banned || []) {
    if (new RegExp(b.re).test(text)) out.push({ kind: '禁用', term: b.re, why: b.why });
  }
  if (!opts.allowMeta) {
    for (const m of rules.meta || []) {
      if (new RegExp(m.re).test(text)) out.push({ kind: '出戏', term: m.re, why: m.why });
    }
  }
  return out;
}

/** 生成文字的清理：去掉明显的出戏括注，例如"（据史载……）" */
function scrub(text) {
  return String(text || '')
    .replace(/（[^）]*(据|史载|考证|存疑|一说)[^）]*）/g, '')
    .replace(/\([^)]*(据|史载|考证|存疑)[^)]*\)/g, '')
    .trim();
}

module.exports = { check, scrub };
