// 联网查证存档复用（R-243）：同一条查询第二次直接从本机缓存出，不再花博查、维基；没查到的不存
const http = require('http');
const PORT = process.env.GAME_PORT || 8751;
const post = (p, b) => new Promise((ok, no) => { const d = JSON.stringify(b); const r = http.request({ host: '127.0.0.1', port: PORT, path: p, method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(d) } }, res => { let t = ''; res.on('data', c => t += c); res.on('end', () => { try { ok(JSON.parse(t)); } catch (e) { no(e); } }); }); r.on('error', no); r.end(d); });
(async () => {
  const errs = [];
  const q = '安禄山 范阳';
  const t0 = Date.now(); const a = await post('/api/lookup', { queries: [q], world: [q] }); const t1 = Date.now();
  const b = await post('/api/lookup', { queries: [q], world: [q] }); const t2 = Date.now();
  const ia = ((a.results || [])[0] || {}).items || [], ib = ((b.results || [])[0] || {}).items || [];
  if (!ia.length) errs.push('第一次就没查到（假搜索没起）：' + JSON.stringify(a).slice(0, 200));
  else if (JSON.stringify(ia) !== JSON.stringify(ib)) errs.push('第二次结果和第一次不一样');
  console.log('LOOKCACHE', JSON.stringify({ first: t1 - t0, second: t2 - t1 }));
  if (ia.length && !(t2 - t1 < Math.max(50, (t1 - t0) / 2))) errs.push('第二次没走缓存（没变快）');
  console.log('ERRS', JSON.stringify(errs)); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify([String(e)])); process.exit(1); });
