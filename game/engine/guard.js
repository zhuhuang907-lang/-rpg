'use strict';
/**
 * 时代把关：检查一段要进正文的文字。返回问题列表（空 = 通过）。
 * 问题只记进 GM 日志和史事面板的"本回合核对"，绝不以争论的形式写进正文。
 *
 * 规则分两层：
 *   UNIVERSAL —— 所有时代通用：现代词、后世纪年、考证腔、出戏。
 *   剧本/世界 —— 本局特有：某词某年以前不得出现（terms），本局不得出现（banned）。
 */
const UNIVERSAL = {
  terms: [],
  banned: [
    { re: '公元|公历|儒略|格里历|星期[一二三四五六日天]|礼拜[一二三四五六天]', why: '正文不出现后世纪年与星期' },
    { re: '手机|电话|电脑|电视|互联网|汽车|火车|飞机|电灯|照片|相机|警察|派出所|博物馆|报纸|科学家|共和国|总统|分钟|小时(?!候)|公里|厘米|公斤', why: '现代词' },
  ],
  meta: [
    { re: '据考|考证|存疑|史载|有说法|一说认为|一说是|未核实|待核|史料|史书记载|历史上', why: '正文不得出现考证、争论腔，核查只在幕后' },
    { re: '作为AI|人工智能|大模型|GM|玩家', why: '正文不得出戏' },
  ],
};

function merge(...rules) {
  const out = { terms: [...UNIVERSAL.terms], banned: [...UNIVERSAL.banned], meta: [...UNIVERSAL.meta] };
  for (const r of rules) {
    if (!r) continue;
    out.terms.push(...(r.terms || []));
    out.banned.push(...(r.banned || []));
    out.meta.push(...(r.meta || []));
  }
  return out;
}

const ym = d => d.y * 12 + (d.m || 1);

function check(text, date, rules, opts = {}) {
  if (!text) return [];
  const out = [];
  const now = ym(date);
  for (const t of rules.terms || []) {
    let re; try { re = new RegExp(t.re); } catch { continue; }
    if (!re.test(text)) continue;
    if (now < ym(t.from)) out.push({ kind: '时代', term: t.re, why: t.why });
    else if (t.until && now > ym(t.until)) out.push({ kind: '时代', term: t.re, why: t.why });
  }
  for (const b of rules.banned || []) {
    let re; try { re = new RegExp(b.re); } catch { continue; }
    if (re.test(text)) out.push({ kind: '禁用', term: b.re, why: b.why });
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

module.exports = { check, scrub, merge, UNIVERSAL };
