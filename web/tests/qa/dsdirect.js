// 游戏程序连不上 DeepSeek（这里把它要连的地址指到一个不通的端口，模拟被防火墙、杀毒软件、代理拦住），浏览器能连：
// ① 以前存过 Key、这台浏览器里没有：直接开局也能写出来（自动改由浏览器直连）；
// ② 重新粘贴 Key 保存：试连报「已接上」，不报连不上；③ 刷新后接着玩还走浏览器直连
// 浏览器那头的 api.deepseek.com 由检测转到本机的假 DeepSeek
const { chromium } = require('playwright');
const MOCK = 'http://127.0.0.1:' + (process.env.MOCK_PORT || 3793);
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const ctx = await b.newContext(); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('dialog', d => d.accept());
  const bad = m => errs.push(m);
  let direct = 0;
  await ctx.route('https://api.deepseek.com/**', async route => {
    direct++;
    const r = route.request(); const u = MOCK + new URL(r.url()).pathname;
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'POST' } });
    // 检测收尾关浏览器时还有转发到一半的请求：接住，不让它把整项检测弄成失败
    try { const resp = await route.fetch({ url: u }); await route.fulfill({ response: resp, headers: { ...resp.headers(), 'access-control-allow-origin': '*' } }); }
    catch (_) { await route.abort().catch(() => {}); }
  });
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  // ① 存过 Key，直接开局
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) bad('游戏程序连不上时开局没出来：' + await p.evaluate(() => [...document.querySelectorAll('.err')].map(e => e.innerText).join(' | ')));
  if (!(await p.evaluate(() => DS_DIRECT))) bad('没有自动改由浏览器直连');
  if (!direct) bad('浏览器没有直连 DeepSeek');
  // ② 重新粘贴 Key 保存
  await p.click('[data-tab="set"]').catch(() => {}); await p.waitForTimeout(300);
  await p.evaluate(() => { localStorage.removeItem('hrpg:dsdirect'); DS_DIRECT = false; });
  await p.click('#bKeyOpen').catch(() => {}); await p.fill('#kIn', 'sk-test1234'); await p.click('#bKeySave');
  await p.waitForFunction(() => !KEYSAVING, null, { timeout: 120000 }).catch(() => {});
  const msg = await p.evaluate(() => KEYMSG);
  if (!/已接上/.test(msg)) bad('重新保存 Key 后没说接上了：' + msg);
  if (/连不上|没通/.test(msg)) bad('浏览器连得上却还报连不上：' + msg);
  // ③ 刷新后接着玩
  await p.reload(); await p.waitForTimeout(1500);
  await p.click('[data-tab="board"]').catch(() => {});
  const t0 = await p.evaluate(() => S && S.turn), d0 = direct;
  await p.fill('#said', '去钞关打听今年的盐引价钱'); await p.click('#bSend');
  if (!(await idle())) bad('直连接着玩卡住了');
  if ((await p.evaluate(() => S.turn)) <= t0) bad('直连接着玩没写出新的一回：' + await p.evaluate(() => [...document.querySelectorAll('.err')].map(e => e.innerText).join(' | ')));
  if (direct <= d0) bad('刷新后没有接着走浏览器直连');
  console.log('DIRECT CALLS', direct);
  console.log('ERRS', JSON.stringify(errs));
  await ctx.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {});
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
