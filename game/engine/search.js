'use strict';
/**
 * 联网检索：博查（Bocha）Web Search API。
 *   POST https://api.bochaai.com/v1/web-search
 *   Authorization: Bearer <key>
 *   { "query": "...", "freshness": "noLimit", "summary": true, "count": 8 }
 *   结果在 data.webPages.value[]：name / url / snippet / summary / siteName / datePublished
 * Key 填在界面「设置」里（存进 data/config.json 的 search.apiKey）。
 * 结果按查询词缓存在 data/cache/search/ 下，同一个词不重复花钱。
 * 没有 Key 时所有检索返回空，游戏照常进行（史事评级会降为"未查证"，见 research.js）。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const llm = require('./llm');

const CACHE = process.env.SHU_CACHE || path.join(__dirname, '..', 'data', 'cache', 'search');

function conf() {
  const c = llm.config().search || {};
  return {
    provider: c.provider || 'bocha',
    apiKey: c.apiKey || '',
    endpoint: c.endpoint || 'https://api.bochaai.com/v1/web-search',
    count: c.count || 8,
    budget: c.budget || 300, // 每局最多检索次数
  };
}
function enabled() { return !!conf().apiKey; }

function cacheFile(q) {
  return path.join(CACHE, crypto.createHash('sha1').update(q).digest('hex') + '.json');
}

/** 单次检索，返回 [{ title, url, site, date, text }] */
async function web(query, { count, timeoutMs = 20000 } = {}) {
  const c = conf();
  if (!c.apiKey) return [];
  query = String(query).trim().slice(0, 200);
  const f = cacheFile(query);
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* 没缓存 */ }
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(c.endpoint, {
      method: 'POST', signal: ctl.signal,
      headers: { authorization: 'Bearer ' + c.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ query, freshness: 'noLimit', summary: true, count: count || c.count }),
    });
    if (!r.ok) throw new Error('博查返回 ' + r.status);
    const j = await r.json();
    if (j.code && j.code !== 200) throw new Error('博查：' + (j.msg || j.code));
    const list = ((j.data && j.data.webPages && j.data.webPages.value) || []).map(x => ({
      title: String(x.name || ''), url: String(x.url || ''), site: String(x.siteName || ''),
      date: String(x.datePublished || '').slice(0, 10),
      text: String(x.summary || x.snippet || '').replace(/\s+/g, ' ').slice(0, 700),
    })).filter(x => x.url);
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(f, JSON.stringify(list));
    return list;
  } finally {
    clearTimeout(t);
  }
}

/** 可信度：只按来源站点粗分，不代替人工核对 */
const TRUSTED = [
  /wikisource\.org/, /ctext\.org/, /cbdb\.fas\.harvard\.edu/, /\.edu\.cn/, /\.ac\.cn/, /\.gov\.cn/, /cssn\.cn/,
  /shidianguji\.com/, /guoxue/, /cnki/, /nlc\.cn/, /dpm\.org\.cn/, /\.edu\.tw/, /sinica\.edu\.tw/, /\.edu\.hk/, /zh\.wikipedia\.org/,
];
function trust(url) { return TRUSTED.some(re => re.test(url)) ? '可信站点' : '一般网页'; }

module.exports = { web, enabled, conf, trust };
