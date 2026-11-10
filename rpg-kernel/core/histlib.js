'use strict';
/**
 * 历史原文库（corpus/，全量 64 本：二十四史、清史稿、实录、类书、政书、编年、地理、兵书、史评、杂史）
 * - 桌面版：第一次用到某本书才下载（data/cache/histlib/，0.1–11 MB/本），索引只在内存里建；
 * - 检索：二元组倒排，与 scripts/build_corpus.py 产出的 corpus/*.jsonl.gz 配套；
 * - 给游戏取证：写剧情前照人名/年号/制度词查几段原文，带书名卷名出处，模型只许照原文引用。
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const UPD_REPO = 'zhuhuang907-lang/-rpg', UPD_BRANCH = 'claude/gallant-davinci-l8pni0';
const RAW_BASE = `https://raw.githubusercontent.com/${UPD_REPO}/${UPD_BRANCH}/corpus`;
const CORPUS_REMOTE = [RAW_BASE, 'https://ghfast.top/' + RAW_BASE, 'https://gh-proxy.com/' + RAW_BASE];
const CACHE = path.resolve(__dirname, '..', 'data', 'cache', 'histlib');
const BUNDLED = path.resolve(__dirname, '..', '..', 'corpus');
const MEM_BOOKS = 3;   // 内存里最多留几本书的索引（冊府元龜一本就几十 MB，多了费内存）

let META = null, metaAt = 0;
const passagesOf = new Map();   // id → [{v,t}]
const indexOf = new Map();      // id → {post:{bg:[i]}, df:{bg:n}, n}
const lru = [];

const SAFE_ID = /^[a-z0-9_]{2,40}$/;   // 书 id 白名单格式；再核 manifest 才许拼路径
function knownId(id) {
  if (!SAFE_ID.test(id)) return false;
  return !!(META && META.books && META.books.some(b => b.id === id));
}
function cachePath(id) {
  const name = path.basename(id + '.jsonl.gz');   // 白名单格式已保证无 ../
  const p = path.resolve(CACHE, name);
  if (!p.startsWith(CACHE + path.sep) && p !== CACHE) throw new Error('bad path');
  return p;
}

function bigrams(q) {
  const out = [];
  for (const run of String(q || '').match(/[\u4e00-\u9fff]+/g) || [])
    for (let i = 0; i + 1 < run.length; i++) out.push(run.slice(i, i + 2));
  return [...new Set(out)];
}

async function fetchX(url, opt) { return require('./net').fetchX(url, Object.assign({ signal: AbortSignal.timeout(120000) }, opt || {})); }

async function loadMeta() {
  if (META && Date.now() - metaAt < 600e3) return META;
  try { META = JSON.parse(fs.readFileSync(path.join(BUNDLED, 'meta.json'), 'utf8')); metaAt = Date.now(); return META; } catch (_) { /* 打包没带语料，走云端 */ }
  try { META = JSON.parse(fs.readFileSync(path.join(CACHE, 'meta.json'), 'utf8')); metaAt = Date.now(); return META; } catch (_) { /* 没缓存 */ }
  for (const base of CORPUS_REMOTE) {
    try {
      const r = await fetchX(base + '/meta.json');
      if (!r.ok) continue;
      META = await r.json();
      fs.mkdirSync(CACHE, { recursive: true });
      fs.writeFileSync(path.join(CACHE, 'meta.json'), JSON.stringify(META));
      metaAt = Date.now();
      return META;
    } catch (_) { /* 下一个源 */ }
  }
  META = { books: [] };
  return META;
}

async function ensureBook(id) {
  if (passagesOf.has(id)) return true;
  if (!META) await loadMeta();
  if (!knownId(id)) throw new Error('这本书不在库单里（' + id + '）');
  const gz = cachePath(id);
  let buf = null;
  try { buf = fs.readFileSync(path.join(BUNDLED, id + '.jsonl.gz')); } catch (_) { /* 打包没带 */ }
  if (!buf) { try { buf = fs.readFileSync(gz); } catch (_) { /* 没缓存 */ } }
  if (!buf) {
    fs.mkdirSync(CACHE, { recursive: true });
    for (const base of CORPUS_REMOTE) {
      try {
        const r = await fetchX(base + '/' + id + '.jsonl.gz');
        if (!r.ok) continue;
        buf = Buffer.from(await r.arrayBuffer());
        fs.writeFileSync(cachePath(id), buf);
        break;
      } catch (_) { /* 下一个源 */ }
    }
    if (!buf) throw new Error('这本书下载不了（' + id + '）');
  }
  const lines = zlib.gunzipSync(buf).toString('utf8').split('\n').filter(Boolean);
  const texts = [], post = {}, df = {};
  for (let i = 0; i < lines.length; i++) {
    let o; try { o = JSON.parse(lines[i]); } catch { continue; }
    const t = String(o.text || '');
    texts.push({ v: o.volume || '', t });
    for (const run of t.match(/[\u4e00-\u9fff]+/g) || []) {
      for (let k = 0; k + 1 < run.length; k++) {
        const bg = run.slice(k, k + 2);
        (post[bg] = post[bg] || []).push(i);
        df[bg] = (df[bg] || 0) + 1;
      }
    }
  }
  passagesOf.set(id, texts); indexOf.set(id, { post, df, n: texts.length });
  lru.push(id);
  while (lru.length > MEM_BOOKS) {
    const old = lru.shift();
    if (old !== id && !lru.includes(old)) { passagesOf.delete(old); indexOf.delete(old); }
  }
  return true;
}

/** 在几本书里查 q，返回 [{book,name,volume,text,score}]（按命中二元组的稀有度打分） */
async function search(q, bookIds, n) {
  if (!META) await loadMeta();
  const bgs = bigrams(q).slice(0, 24);
  if (!bgs.length) return [];
  const out = [];
  for (const id of (bookIds || []).slice(0, 6)) {
    if (!knownId(id)) continue;
    try { await ensureBook(id); } catch (_) { continue; }
    const idx = indexOf.get(id), texts = passagesOf.get(id);
    if (!idx || !texts) continue;
    const score = new Map();
    for (const bg of bgs) {
      const lst = idx.post[bg];
      if (lst) {
        const w = Math.log(1 + idx.n / (idx.df[bg] || 1));
        for (const i of lst) score.set(i, (score.get(i) || 0) + w);
      }
    }
    for (const [i, s] of score) if (s >= 1.5) out.push({ book: id, name: (META.books.find(b => b.id === id) || {}).name || id, volume: texts[i].v, text: texts[i].t, score: s / Math.sqrt(texts[i].t.length) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, Math.max(1, Math.min(8, n || 4)));
}

module.exports = { loadMeta, search, ensureBook };
