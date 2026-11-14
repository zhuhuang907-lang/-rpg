// 桌面版：本机服务存 GLM 的 Key、试连、照页面说的把这一件转给 GLM，不说的照旧走 DeepSeek（需求台账 R-135）
const fs = require('fs');
(async () => {
  const port = (v, d) => { const n = parseInt(v, 10); return n >= 1024 && n <= 65535 ? n : d; };   // 端口只认 1024—65535 的整数，地址只连本机
  const G = 'http://127.0.0.1:' + port(process.env.GAME_PORT, 8741), M = port(process.env.MOCK_PORT, 3741), bad = [];
  const post = (u, b) => fetch(G + u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }).then(r => r.json());
  const k = await post('/api/glm-key', { apiKey: 'glm-test-key', baseUrl: `http://127.0.0.1:${M}/glm`, model: 'glm-test' });
  if (!k.ok || !k.test || !k.test.ok) bad.push('存 GLM Key、试连没通：' + JSON.stringify(k));
  const st = await fetch(G + '/api/quick-status').then(r => r.json());
  if (!st.glm || !st.glm.has || st.glm.model !== 'glm-test' || st.glm.tail !== '-key') bad.push('状态里看不到 GLM：' + JSON.stringify(st.glm));
  if (JSON.stringify(st).includes('glm-test-key')) bad.push('状态里露出了整个 GLM Key');
  const run = async provider => { const r = await post('/api/llm-start', { messages: [{ role: 'user', content: '只回答两个字：正常' }], maxTokens: 400, json: false, provider }); for (let i = 0; i < 60; i++) { const j = await post('/api/llm-job', { job: r.job }); if (j.status && j.status !== 'running') return j; await new Promise(z => setTimeout(z, 300)); } return { status: 'timeout' }; };
  fs.writeFileSync('calls.log', '');
  const a = await run('glm'), b = await run('');
  const log = fs.readFileSync('calls.log', 'utf8').trim().split('\n').filter(Boolean).map(l => l.split('\t'));
  if (a.status !== 'done') bad.push('交给 GLM 的没写成：' + JSON.stringify(a));
  if (b.status !== 'done') bad.push('交给 DeepSeek 的没写成：' + JSON.stringify(b));
  if (!log.some(l => /\/glm\/chat\/completions/.test(l[5]) && l[8] === 'glm-test')) bad.push('交给 GLM 的没发到 GLM 的地址、型号：' + JSON.stringify(log));
  if (!log.some(l => !/\/glm\//.test(l[5]) && /deepseek/.test(l[8] || ''))) bad.push('没说交给 GLM 的也去了 GLM：' + JSON.stringify(log));
  const c = await post('/api/glm-key', { clear: true }); const st2 = await fetch(G + '/api/quick-status').then(r => r.json());
  if (st2.glm.has) bad.push('清除 GLM Key 没清掉');
  const d = await run('glm'); if (d.status === 'done') bad.push('清了 GLM Key 还能交给 GLM');
  console.log('ERRS', JSON.stringify(bad)); process.exit(bad.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
