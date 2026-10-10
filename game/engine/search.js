'use strict';
/**
 * 联网检索。两条路：
 *   博查（Bocha，要 Key，中文覆盖最好）：
 *     POST https://api.bochaai.com/v1/web-search   Authorization: Bearer <key>
 *     { "query": "...", "freshness": "noLimit", "summary": true, "count": 8 }
 *     结果在 data.webPages.value[]：name / url / snippet / summary / siteName / datePublished
 *   维基百科（免费，不要 Key）：没填博查 Key 时自动用它；博查报错或查不到时也拿它兜底。
 *     （做法取自原 rpg-kernel 的 adapters/search.js）
 * 结果按查询词缓存在 data/cache/search/，同一个词不重复花钱。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const llm = require('./llm');

const CACHE = process.env.SHU_CACHE || path.join(__dirname, '..', 'data', 'cache', 'search');

function conf() {
  const c = llm.config().search || {};
  const apiKey = c.apiKey || '';
  return {
    // bocha：有 Key 用博查；wikipedia：只用维基；off：不查
    provider: c.provider === 'off' ? 'off' : apiKey ? 'bocha' : 'wikipedia',
    apiKey,
    endpoint: c.endpoint || 'https://api.bochaai.com/v1/web-search',
    wikiEndpoint: c.wikiEndpoint || 'https://zh.wikipedia.org/w/api.php',
    count: c.count || 8,
    budget: c.budget || 300, // 每局最多检索次数
  };
}
function enabled() { return conf().provider !== 'off'; }
function providerName() { return { bocha: '博查', wikipedia: '维基百科（免费）', off: '不查' }[conf().provider]; }

function cacheFile(provider, q) {
  return path.join(CACHE, provider + '-' + crypto.createHash('sha1').update(q).digest('hex') + '.json');
}

async function fetchJson(url, init, timeoutMs) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

async function bocha(c, query, count, timeoutMs) {
  const j = await fetchJson(c.endpoint, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + c.apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ query, freshness: 'noLimit', summary: true, count: count || c.count }),
  }, timeoutMs);
  if (j.code && j.code !== 200) throw new Error('博查：' + (j.msg || j.code));
  return ((j.data && j.data.webPages && j.data.webPages.value) || []).map(x => ({
    title: String(x.name || ''), url: String(x.url || ''), site: String(x.siteName || ''),
    date: String(x.datePublished || '').slice(0, 10),
    text: String(x.summary || x.snippet || '').replace(/\s+/g, ' ').slice(0, 700),
  })).filter(x => x.url);
}

async function wikipedia(c, query, count, timeoutMs) {
  const u = `${c.wikiEndpoint}?action=query&list=search&format=json&origin=*&srlimit=${Math.min(count || 6, 10)}&srsearch=${encodeURIComponent(query)}`;
  const j = await fetchJson(u, { headers: { 'user-agent': 'shu-history-rpg/0.2' } }, timeoutMs);
  return ((j.query && j.query.search) || []).map(h => ({
    title: String(h.title || ''), url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(h.title || '')}`,
    site: '维基百科', date: '', text: String(h.snippet || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 700),
  })).filter(x => x.title);
}

/** 单次检索，返回 [{ title, url, site, date, text }] */
async function web(query, { count, timeoutMs = 20000 } = {}) {
  const c = conf();
  if (c.provider === 'off') return [];
  query = String(query).trim().slice(0, 200);
  const order = c.provider === 'bocha' ? ['bocha', 'wikipedia'] : ['wikipedia'];
  let lastErr = null;
  for (const p of order) {
    const f = cacheFile(p, query);
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* 没缓存 */ }
    try {
      const list = p === 'bocha' ? await bocha(c, query, count, timeoutMs) : await wikipedia(c, query, count, timeoutMs);
      if (!list.length) continue; // 查不到就换下一家兜底
      fs.mkdirSync(CACHE, { recursive: true });
      fs.writeFileSync(f, JSON.stringify(list));
      return list;
    } catch (e) { lastErr = e; }
  }
  if (lastErr) throw lastErr;
  return [];
}

/** 可信度：只按来源站点粗分，不代替人工核对 */
const TRUSTED = [
  /wikisource\.org/, /ctext\.org/, /cbdb\.fas\.harvard\.edu/, /\.edu\.cn/, /\.ac\.cn/, /\.gov\.cn/, /cssn\.cn/,
  /shidianguji\.com/, /guoxue/, /cnki/, /nlc\.cn/, /dpm\.org\.cn/, /\.edu\.tw/, /sinica\.edu\.tw/, /\.edu\.hk/, /wikipedia\.org/, /wikidata\.org/,
];
function trust(url) { return TRUSTED.some(re => re.test(url)) ? '可信站点' : '一般网页'; }

module.exports = { web, enabled, conf, trust, providerName };
