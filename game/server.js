'use strict';
/**
 * 零依赖服务：静态前端 + JSON 接口。
 *   node server.js          默认端口 3168（PORT 环境变量可改）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const scenario = require('./engine/scenario');
const game = require('./engine/game');
const store = require('./engine/store');
const llm = require('./engine/llm');
const search = require('./engine/search');
const research = require('./engine/research');

const PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

async function body(req) {
  let raw = '';
  for await (const c of req) { raw += c; if (raw.length > 1e6) throw new Error('请求太大'); }
  return raw ? JSON.parse(raw) : {};
}

// 开局检索是慢活：放进后台任务，前端轮询进度
const jobs = new Map();
function startJob(fn) {
  const id = crypto.randomBytes(6).toString('hex');
  const job = { id, status: 'running', progress: [], result: null, error: null, at: Date.now() };
  jobs.set(id, job);
  fn(p => job.progress.push({ ...p, t: Date.now() }))
    .then(r => { job.status = 'done'; job.result = r; })
    .catch(e => { job.status = 'error'; job.error = e.message; });
  for (const [k, j] of jobs) if (Date.now() - j.at > 3600e3) jobs.delete(k);
  return id;
}

// 同一存档同时只处理一个动作
const locks = new Map();
async function withLock(id, fn) {
  while (locks.get(id)) await locks.get(id);
  let done;
  const p = new Promise(r => { done = r; });
  locks.set(id, p);
  try { return await fn(); } finally { locks.delete(id); done(); }
}

const routes = {
  'GET /api/scenarios': async () => ({
    scenarios: scenario.list(), llm: llm.enabled(), search: search.enabled(),
    dynasties: research.DYNASTIES.map(d => ({ name: d.name, from: research.fromAstro(d.from), to: research.fromAstro(d.to) })),
  }),
  'GET /api/saves': async () => ({ saves: store.list() }),
  'POST /api/new': async b => {
    const s = game.newGame(b.scenario, b.identity, b.mode === 'free' ? 'free' : 'history');
    store.save(s);
    return { view: game.view(s) };
  },
  // 自定义 / 随机时代：开局检索 → 写底本 → 开局
  'POST /api/new-custom': async b => {
    const spec = b.spec || {};
    const mode = b.mode === 'free' ? 'free' : 'history';
    const job = startJob(async progress => {
      const budget = { used: 0, max: search.conf().budget };
      const world = await research.createWorld(spec, progress, budget);
      const s = game.newGameFromWorld(world, budget, mode);
      store.save(s);
      return { id: s.id };
    });
    return { job };
  },
  'POST /api/job': async b => {
    const j = jobs.get(b.id);
    if (!j) throw new Error('任务不存在或已过期');
    return { status: j.status, progress: j.progress, error: j.error, view: j.status === 'done' ? game.view(store.load(j.result.id)) : null };
  },
  'POST /api/load': async b => ({ view: game.view(store.load(b.id)) }),
  'POST /api/delete': async b => { store.remove(b.id); return { ok: true }; },
  'POST /api/act': async b => withLock(b.id, async () => {
    const s = store.load(b.id);
    const extra = await game.act(s, b.action || {});
    store.save(s);
    return { view: game.view(s), ...extra };
  }),
  'POST /api/history': async b => game.historyView(store.load(b.id)),
  'GET /api/config': async () => {
    const c = llm.config();
    return {
      llm: c.llm ? { provider: c.llm.provider, baseUrl: c.llm.baseUrl, model: c.llm.model, hasKey: !!c.llm.apiKey } : null,
      search: { provider: 'bocha', endpoint: search.conf().endpoint, budget: search.conf().budget, hasKey: !!search.conf().apiKey },
      research: c.research || { allowUnverified: false },
    };
  },
  'POST /api/config': async b => {
    const c = llm.config();
    if (b.llm) {
      if (b.llm.clear) delete c.llm;
      else {
        const old = c.llm || {};
        c.llm = { provider: b.llm.provider || 'openai', baseUrl: b.llm.baseUrl || '', model: b.llm.model || '', apiKey: b.llm.apiKey || old.apiKey || '' };
      }
    }
    if (b.search) {
      if (b.search.clear) delete c.search;
      else {
        const old = c.search || {};
        c.search = { provider: 'bocha', apiKey: b.search.apiKey || old.apiKey || '', endpoint: b.search.endpoint || old.endpoint || '', budget: Number(b.search.budget) || old.budget || 300 };
      }
    }
    if (b.research) c.research = { allowUnverified: !!b.research.allowUnverified };
    llm.saveConfig(c);
    return { ok: true, llm: llm.enabled(), search: search.enabled() };
  },
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const key = `${req.method} ${url.pathname}`;
  if (routes[key]) {
    try {
      const out = await routes[key](req.method === 'POST' ? await body(req) : {});
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(out));
    } catch (e) {
      res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  const p = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3168;
  server.listen(port, () => console.log(`枢 · 历史模拟器：http://localhost:${port}`));
}

module.exports = { server, routes };
