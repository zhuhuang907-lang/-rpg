const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1300, height: 900 } });
  await ctx.exposeBinding('mockLLM', async (_, m) => { const r = await fetch('http://127.0.0.1:' + (process.env.MOCK_PORT || 3418) + '/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: JSON.parse(m), max_tokens: 4000 }) }); const j = await r.json(); return j.choices[0].message.content; });
  await ctx.addInitScript(() => {
    window.claude = { use: async name => {
      if (name === 'sample') return async (input, opts) => { window.__opts = Object.assign(window.__opts || {}, { model: opts && opts.model, effort: opts && opts.effort });
        const messages = Array.isArray(input) ? input : [{ role: 'user', content: String(input) }];
        const text = await window.mockLLM(JSON.stringify(messages));
        if (opts && opts.onText) opts.onText({ text });
        return { text };
      };
      if (name === 'user') return null;
      return null;
    } };
  });
  let wikiHits = 0;
  await ctx.route('https://zh.wikipedia.org/**', async route => { wikiHits++; const u = new URL(route.request().url()); const q = u.searchParams.get('srsearch') || u.searchParams.get('gsrsearch') || '';
    const body = u.searchParams.get('list') === 'search' ? { query: { search: [{ title: q.split(' ')[0] + '（条目）', snippet: '<span class=\"searchmatch\">' + q + '</span> 的史事摘要' }] } } : { query: { pages: { 1: { title: q + '（条目）', extract: q + '：维基正文……'.repeat(30) } } } };
    await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify(body) }); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); let ext = false; p.on('console', m => { if (m.type() !== 'error') return; const t = m.text(); if (/cbdb\.fas\.harvard|wikipedia\.org|wikisource\.org|bocha/i.test(t)) { ext = true; return; } if (ext && /Failed to load resource: net::ERR_FAILED/.test(t)) { ext = false; return; } errs.push('console: ' + t); });   // 外部查证站点连不上只是网络问题，游戏会跳过
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  console.log('start disabled?', await p.evaluate(() => document.querySelector('#bStart') && document.querySelector('#bStart').disabled));
  await p.fill('#qText', '天宝十四载范阳的一个小校'); await p.click('#bStart');
  try { await p.waitForSelector('#said', { timeout: 90000 }); } catch (_) {}
  await p.waitForTimeout(1000);
  await p.screenshot({ path: 'shots/cm-open.png' });
  console.log('game?', !!(await p.$('#said')), 'err box:', await p.evaluate(() => [...document.querySelectorAll('.err')].map(e => e.innerText).join('|')));
  if (await p.$('#said')) { await p.fill('#said', '去见长官'); await p.click('#bSend'); await p.waitForFunction(() => !document.querySelector('.thinking'), null, { timeout: 90000 }).catch(() => {}); console.log('turn ok?', await p.evaluate(() => document.querySelectorAll('.msg.gm').length), await p.evaluate(() => [...document.querySelectorAll('.err')].map(e => e.innerText).join('|'))); }
  console.log('OPTS', JSON.stringify(await p.evaluate(() => window.__opts)));
  console.log('wikiHits', wikiHits, 'feed/refs', await p.evaluate(() => [...document.querySelectorAll('.book summary')].map(e => e.innerText).join(' | ')));
  console.log('ERRS', errs); await b.close();
})();
