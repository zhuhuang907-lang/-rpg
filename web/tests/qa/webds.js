// 网页版（没有本机游戏程序，浏览器直接连 DeepSeek）：
// 在线打开和把网页存到电脑上双击打开（file://）两种；没 Key 开始不了；坏 Key 说清是 Key 不对；好 Key 说已接上；
// 开局、接着玩一回、刷新后还在。DeepSeek、维基、博查由检测转到本机的假服务
const { chromium } = require('playwright');
const path = require('path');
const MOCK = 'http://127.0.0.1:' + (process.env.MOCK_PORT || 3793);
const PAGE = process.env.WEB_URL || 'http://127.0.0.1:' + (process.env.WEB_PORT || 8795) + '/index.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errs = [];
  for (const url of [PAGE, 'file://' + path.resolve(process.env.WEB_FILE || '../../index.html')]) {
    const tag = url.startsWith('file:') ? '双击打开' : '在线打开';
    const ctx = await b.newContext(); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(tag + ' page: ' + e.message)); p.on('dialog', d => d.accept());
    const bad = m => errs.push(tag + '：' + m);
    let ds = 0;
    const fwd = async route => {
      const r = route.request(), u = new URL(r.url());
      if (r.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST' } });
      if (/deepseek/.test(u.host)) ds++;
      try { const resp = await route.fetch({ url: MOCK + u.pathname + u.search }); await route.fulfill({ response: resp, headers: { ...resp.headers(), 'access-control-allow-origin': '*' } }); }
      catch (_) { await route.abort(); }
    };
    await ctx.route(/api\.deepseek\.com|zh\.wikipedia\.org|zh\.wikisource\.org|api\.bocha|www\.wikidata\.org|query\.wikidata\.org/, fwd);
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|cbdb\.fas\.harvard\.edu|tgaz|maps\.cga/, r => r.abort());
    const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !document.querySelector('.thinking') && !KEYSAVING, null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
    await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2500);
    if ((await p.evaluate(() => MODE)) !== 'web') { bad('没进网页版：' + await p.evaluate(() => MODE)); await ctx.close(); continue; }
    if (!(await p.$('#kIn'))) bad('看不到填 DeepSeek Key 的框');
    if (!(await p.$eval('#bStart', x => x.disabled))) bad('没 Key 时「开始」不该能点');
    await p.fill('#kIn', 'sk-bad99999999'); await p.click('#bKeySave'); await idle(60000);
    if (!/Key 不对/.test(await p.evaluate(() => KEYMSG))) bad('坏 Key 没说清：' + await p.evaluate(() => KEYMSG));
    await p.fill('#kIn', ' sk-test1234 '); await p.click('#bKeySave'); await idle(60000);
    if (!/✓ 已保存，已接上/.test(await p.evaluate(() => KEYMSG))) bad('好 Key 没接上：' + await p.evaluate(() => KEYMSG));
    if (await p.$eval('#bStart', x => x.disabled)) bad('有 Key 了「开始」还是点不了');
    await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
    if (!(await idle()) || !(await p.$('#said'))) { bad('开局没出来：' + await p.evaluate(() => [...document.querySelectorAll('.err')].map(e => e.innerText).join(' | '))); await ctx.close(); continue; }
    const t0 = await p.evaluate(() => S.turn);
    await p.fill('#said', '去钞关打听今年的盐引价钱'); await p.click('#bSend');
    if (!(await idle())) bad('接着玩卡住了');
    if ((await p.evaluate(() => S.turn)) <= t0) bad('接着玩没写出新的一回：' + await p.evaluate(() => [...document.querySelectorAll('.err')].map(e => e.innerText).join(' | ')));
    const id = await p.evaluate(() => S.id);
    await p.reload(); await p.waitForTimeout(2500);
    if (!(await p.evaluate(i => S && S.id === i, id))) bad('刷新后这一局没接上');
    const vis = await p.evaluate(() => document.body.innerText); const leak = vis.match(/undefined|NaN|\[object Object\]|【幕后】/g); if (leak) bad('页面有怪字：' + [...new Set(leak)].join(','));
    if (!ds) bad('没有直连 DeepSeek');
    console.log(tag, 'DS CALLS', ds);
    await ctx.close();
  }
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
