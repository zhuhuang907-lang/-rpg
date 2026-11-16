// 后台整理的本机缓存（R-243）：同样的问题第二次直接从本机出、不再请模型；不让缓存的（写戏、裁定）照旧问
const http = require('http');
const PORT = process.env.GAME_PORT || 8751;
const post = (p, b) => new Promise((ok, no) => { const d = JSON.stringify(b); const r = http.request({ host: '127.0.0.1', port: PORT, path: p, method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(d) } }, res => { let t = ''; res.on('data', c => t += c); res.on('end', () => { try { ok(JSON.parse(t)); } catch (e) { no(e); } }); }); r.on('error', no); r.end(d); });
const wait = async job => { for (let i = 0; i < 120; i++) { const j = await post('/api/llm-job', { job }); if (j.status && j.status !== 'running') return j; await new Promise(r => setTimeout(r, 250)); } return {}; };
(async () => {
  const errs = [];
  const body = { messages: [{ role: 'user', content: '你是一位严谨的历史地理学者。测试缓存：公元930年河南府的四邻。只输出一个 JSON 对象。' }], json: true, temperature: 0.1, maxTokens: 800 };
  const a = await post('/api/llm-start', { ...body, cache: true }); const ja = await wait(a.job);
  await new Promise(r => setTimeout(r, 1800));   // 等它写进本机
  const b = await post('/api/llm-start', { ...body, cache: true }); const jb = await wait(b.job);
  const c = await post('/api/llm-start', { ...body }); await wait(c.job);
  if (!ja.text) errs.push('第一次没答出来：' + JSON.stringify(ja).slice(0, 200));
  if (!b.cached || jb.text !== ja.text) errs.push('同样的问题第二次没走缓存：' + JSON.stringify(b));
  if (c.cached) errs.push('没让缓存的也走了缓存');
  console.log('ERRS', JSON.stringify(errs)); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify([String(e)])); process.exit(1); });
