// 存档：开两局；回首页能看到两份；读回第一份接着玩；删一份（先问确定）；后台在做事时也能删、能切；游戏里也能直接切换存档
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const idle = () => p.waitForFunction(() => !BUSY, null, { timeout: 120000, polling: 300 }).catch(() => bad('卡住了'));
  const open = async q => { await p.fill('#qText', q); await p.click('#bStart'); await p.waitForSelector('#said', { timeout: 300000 }); await idle(); return p.evaluate(() => S.id); };
  const home = async () => { await p.click('#bHome'); await p.waitForTimeout(400); await p.waitForFunction(() => document.querySelectorAll('[data-load]').length > 0 || /还没有存档/.test(document.body.innerText), null, { timeout: 15000 }).catch(() => bad('首页存档列表没出来')); };
  const a = await open('乾隆二十二年扬州的盐商');
  await home(); const b2 = await open('靖康元年东京城外的流民');
  await home();
  const ids = await p.$$eval('[data-load]', xs => xs.map(x => x.dataset.load));
  if (!ids.includes(a) || !ids.includes(b2)) bad('首页没有列出两份存档：' + JSON.stringify(ids));
  // 后台还在做事（BG）时切换、删除也要能用
  await p.click(`[data-load="${a}"]`); await p.waitForTimeout(500);
  if (await p.evaluate(() => S && S.id) !== a) bad('读不回第一份存档');
  await home();
  await p.click(`[data-askdel="${b2}"]`); await p.waitForTimeout(150);
  await p.evaluate(() => render()); await p.waitForTimeout(150);   // 后台做完一步会重画页面：「确定删掉？」不能跟着消失
  const dl = p.locator(`[data-del="${b2}"]`); if (!(await dl.count())) bad('点「删除」后的「确定删掉？」被重画冲掉了'); else { await dl.first().click(); await p.waitForTimeout(800); }
  const ids2 = await p.$$eval('[data-load]', xs => xs.map(x => x.dataset.load));
  if (ids2.includes(b2)) bad('删掉的存档还在列表里'); if (!ids2.includes(a)) bad('没删的那份不见了');
  await p.reload(); await p.waitForTimeout(1500); await p.click('#bHome').catch(() => {}); await p.waitForTimeout(800);
  const ids3 = await p.$$eval('[data-load]', xs => xs.map(x => x.dataset.load)); if (ids3.includes(b2)) bad('刷新后删掉的存档又回来了');
  // 游戏里直接切换：设置里有存档列表
  await p.click(`[data-load="${a}"]`).catch(() => {}); await p.waitForTimeout(500); const c = await (async () => { await home(); return open('崇祯元年的崇祯皇帝'); })();
  await p.click('[data-tab="set"]').catch(() => {}); await p.waitForTimeout(400);
  const swl = p.locator(`.side [data-load="${a}"]`); try { await swl.first().waitFor({ timeout: 8000 }); } catch (_) { /* 下面报 */ } if (!(await swl.count())) bad('游戏里「设置」没有切换存档'); else { await swl.first().click(); await p.waitForTimeout(600); if (await p.evaluate(() => S.id) !== a) bad('游戏里切换存档没切过去'); }
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
