// 档案馆：每一回全文另存（桌面版存进游戏文件夹），刷新后还在；按人名翻出相关旧事交给推演和写正文；照档案写成史书、小说，能下载
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await (await b.newContext({ acceptDownloads: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('dialog', d => d.accept());
  const bad = m => errs.push(m);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  for (const t of ['找程立德问亏空的事', '去钞关打听今年的盐引价钱', '在家歇着']) { await p.fill('#said', t); await p.click('#bSend'); if (!(await idle())) bad('接着玩卡住了：' + t); }
  const id = await p.evaluate(() => S.id), turn = await p.evaluate(() => S.turn);
  await p.waitForTimeout(800);
  const srv = await p.evaluate(async id => (await api('/api/arc-get', { id })).recs.filter(r => r.kind === 'turn').length, id);
  if (srv < 3) bad('档案没存进游戏文件夹：只有 ' + srv + ' 回');
  await p.reload(); await p.waitForTimeout(1500);
  await p.click('[data-tab="arc"]').catch(() => bad('没有档案馆这一页')); await p.waitForTimeout(1500);
  const n = await p.evaluate(() => ARC.count(S));
  if (n < 3) bad('刷新后档案馆只有 ' + n + ' 回（应有 ' + turn + ' 回左右）');
  const full = await p.evaluate(() => ARC.all().filter(r => r.kind === 'turn').every(r => r.text && r.text.length > 50));
  if (!full) bad('档案里有回合没存正文全文');
  // 翻旧事：当作已经是第三十回，问到程立德，要翻出早先跟他的来往
  const rc = await p.evaluate(() => { const s = { ...S, turn: 30, people: { ...S.people, 程立德: { role: '账房' } } }; return archiveBlock(s, '再去找程立德'); });
  if (!/程立德/.test(rc) || !/档案馆里与这一回相关的旧事/.test(rc)) bad('档案馆没翻出相关旧事：' + rc.slice(0, 120));
  const vis = await p.evaluate(() => document.body.innerText);
  if (!/已记 \d+ 回/.test(vis)) bad('档案馆页没显示记了几回');
  // 编书是可选的：没点就没有书、按钮收在折叠栏里
  if ((await p.evaluate(() => bookChs(S, 'hist').length + bookChs(S, 'novel').length)) > 0) bad('没点编书却有书');
  if (await p.locator('[data-book="hist"]').first().isVisible().catch(() => false)) bad('编书按钮没收进「可选」折叠栏');
  await p.evaluate(() => document.querySelectorAll('.pane details.custom').forEach(d => { d.open = true; }));
  // 写成史书、小说，下载
  for (const k of ['hist', 'novel']) {
    await p.evaluate(() => document.querySelectorAll('.pane details.custom').forEach(d => { d.open = true; }));
    await p.locator(`[data-book="${k}"]`).first().click().catch(e => bad('写书按钮点不了：' + e.message.slice(0, 60)));
    try { await p.waitForFunction(() => !BOOK, null, { timeout: 120000 }); } catch (_) { bad('写书卡住'); }
    await p.waitForTimeout(300);
    const chs = await p.evaluate(k => bookChs(S, k).length, k);
    if (chs < 1) bad(k + ' 没写出章节：' + await p.evaluate(() => ERRMSG));
    try { const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.locator(`[data-bookdl="${k}"]`).first().click()]); const fs = require('fs'); const t = fs.readFileSync(await dl.path(), 'utf8'); if (t.length < 200 || !/汪景和/.test(t)) bad(k + ' 下载的书是空的'); } catch (e) { bad(k + ' 没下载：' + e.message.slice(0, 80)); }
  }
  await p.reload(); await p.waitForTimeout(1500); await p.click('[data-tab="arc"]').catch(() => {}); await p.waitForTimeout(1500);
  if ((await p.evaluate(() => bookChs(S, 'hist').length)) < 1) bad('刷新后写好的史书没了');
  const leak = (await p.evaluate(() => document.body.innerText)).match(/undefined|NaN|\[object Object\]/g); if (leak) bad('档案馆页有怪字：' + [...new Set(leak)].join(','));
  // 游戏里直接删这一局：顶上「删除这一局」→ 确认 → 回首页，它的档案馆一起删掉
  await p.locator('#delThis [data-askdel]').first().click().catch(e => bad('游戏里没有「删除这一局」：' + e.message.slice(0, 60)));
  await p.waitForTimeout(200); await p.evaluate(() => render()); await p.waitForTimeout(150);
  await p.locator('#delThis [data-del]').first().click().catch(e => bad('「删除这一局」的确认点不了：' + e.message.slice(0, 60)));
  await p.waitForTimeout(1500);
  if (await p.evaluate(() => VIEW === 'game' && !!S)) bad('删了这一局还停在游戏里');
  if ((await p.evaluate(async () => (await store.list()).length)) !== 0) bad('删了这一局，存档列表里还有');
  const left = await p.evaluate(async id => (await api('/api/arc-get', { id })).recs.length, id);
  if (left) bad('删了这一局，它的档案馆还在：' + left + ' 条');
  console.log('ARC', n, 'SRV', srv);
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
