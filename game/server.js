'use strict';
/**
 * 零依赖服务：静态前端 + JSON 接口。
 *   node server.js          默认端口 3168（PORT 环境变量可改）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const scenario = require('./engine/scenario');
const game = require('./engine/game');
const store = require('./engine/store');
const llm = require('./engine/llm');

const PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

async function body(req) {
  let raw = '';
  for await (const c of req) { raw += c; if (raw.length > 1e6) throw new Error('请求太大'); }
  return raw ? JSON.parse(raw) : {};
}

const routes = {
  'GET /api/scenarios': async () => ({ scenarios: scenario.list(), llm: llm.enabled() }),
  'GET /api/saves': async () => ({ saves: store.list() }),
  'POST /api/new': async b => {
    const s = game.newGame(b.scenario, b.identity);
    store.save(s);
    return { view: game.view(s) };
  },
  'POST /api/load': async b => ({ view: game.view(store.load(b.id)) }),
  'POST /api/delete': async b => { store.remove(b.id); return { ok: true }; },
  'POST /api/act': async b => {
    const s = store.load(b.id);
    const extra = await game.act(s, b.action || {});
    store.save(s);
    return { view: game.view(s), ...extra };
  },
  'POST /api/history': async b => game.historyView(store.load(b.id)),
  'GET /api/config': async () => {
    const c = llm.config();
    return { llm: c.llm ? { provider: c.llm.provider, baseUrl: c.llm.baseUrl, model: c.llm.model, hasKey: !!c.llm.apiKey } : null, history: c.history || { online: false } };
  },
  'POST /api/config': async b => {
    const c = llm.config();
    if (b.llm) {
      const old = c.llm || {};
      c.llm = { provider: b.llm.provider || 'openai', baseUrl: b.llm.baseUrl || '', model: b.llm.model || '', apiKey: b.llm.apiKey || old.apiKey || '' };
      if (b.llm.clear) delete c.llm;
    }
    if (b.history) c.history = { online: !!b.history.online };
    llm.saveConfig(c);
    return { ok: true, llm: llm.enabled() };
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
  let p = url.pathname === '/' ? '/index.html' : url.pathname;
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
