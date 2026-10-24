// 网页版账号：名字 + 密码，不用邮箱手机号；甲的 Key、存档乙看不到；密码不对进不去；同名不能再注册；退出再登录，自己的都还在；
// 第一个注册的账号接手这个浏览器里以前没登录时的存档
const { chromium } = require('playwright');
const MOCK = 'http://127.0.0.1:' + (process.env.MOCK_PORT || 3793);
const PAGE = process.env.WEB_URL || 'http://127.0.0.1:' + (process.env.WEB_PORT || 8795) + '/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const ctx = await b.newContext(); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('dialog', d => d.accept());
  const bad = m => errs.push(m);
  await ctx.route(/api\.deepseek\.com|zh\.wikipedia\.org|zh\.wikisource\.org|api\.bocha|wikidata\.org/, async route => {
    const r = route.request(), u = new URL(r.url());
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST' } });
    try { const resp = await route.fetch({ url: MOCK + u.pathname + u.search }); await route.fulfill({ response: resp, headers: { ...resp.headers(), 'access-control-allow-origin': '*' } }); } catch (_) { await route.abort(); }
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|cbdb\.fas|tgaz|maps\.cga/, r => r.abort());
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !document.querySelector('.thinking') && !KEYSAVING, null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  const acct = async (name, pw, reg) => { await p.fill('#aName', name); await p.fill('#aPw', pw); await p.click(reg ? '#bRegister' : '#bLogin'); await p.waitForTimeout(2500); };
  const logout = async () => { await p.click('#bHome').catch(() => {}); await p.waitForTimeout(500); await p.click('#bLogout'); await p.waitForTimeout(2500); };
  await p.goto(PAGE); await p.evaluate(() => localStorage.clear());
  // 以前没登录时留下的一份存档：第一个账号接手
  await p.evaluate(() => { localStorage.setItem('hrpg:dskey', 'sk-test1234'); localStorage.setItem('hrpg:save:sOLD', JSON.stringify({ v: 2, id: 'sOLD', title: '以前的局', turn: 3, protagonist: { name: '旧人', role: '' }, clock: { y: 1600, m: 1, d: 1 }, place: { full: '苏州' }, chat: [] })); localStorage.setItem('hrpg:index', JSON.stringify([{ id: 'sOLD', title: '以前的局', updatedAt: 1 }])); });
  await p.reload(); await p.waitForTimeout(2500);
  if (!(await p.$('#aName'))) { bad('没有先让登录'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  await acct('甲', 'ab', true); if (!/至少 4 位/.test(await p.evaluate(() => ACCTMSG))) bad('密码太短没拦');
  await acct('甲', 'abcd', true);
  if ((await p.evaluate(() => WHO)) !== '甲') bad('甲注册后没登录上');
  if (!(await p.evaluate(() => KEY.has))) bad('第一个账号没接手以前的 Key');
  if (!(await p.$('[data-load="sOLD"]'))) bad('第一个账号没接手以前的存档');
  // 甲开一局
  await p.fill('#qText', '万历年间苏州的绣娘'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) bad('甲开局没出来');
  const idA = await p.evaluate(() => S && S.id);
  await logout();
  if (!(await p.$('#aName'))) bad('退出后没回到登录');
  await acct('甲', 'zzzz', true); if (!/已经有人用了/.test(await p.evaluate(() => ACCTMSG))) bad('同名还能再注册');
  await acct('乙', 'efgh', true);
  if ((await p.evaluate(() => WHO)) !== '乙') bad('乙注册后没登录上');
  if (await p.evaluate(() => KEY.has)) bad('乙看得到甲的 Key');
  if (await p.$(`[data-load="${idA}"]`) || await p.$('[data-load="sOLD"]')) bad('乙看得到甲的存档');
  if (!(await p.$eval('#bStart', x => x.disabled))) bad('乙没填 Key 也能开始');
  await logout();
  await acct('甲', 'wrong', false); if (!/密码不对/.test(await p.evaluate(() => ACCTMSG))) bad('密码不对没拦');
  if (await p.evaluate(() => WHO)) bad('密码不对也登录上了');
  await acct('丙', 'abcd', false); if (!/没有这个账号/.test(await p.evaluate(() => ACCTMSG))) bad('没有的账号没说清');
  await acct('甲', 'abcd', false);
  if ((await p.evaluate(() => WHO)) !== '甲') bad('甲登录不上');
  if (!(await p.evaluate(() => KEY.has))) bad('甲再登录 Key 没了');
  await p.click('#bHome').catch(() => {}); await p.waitForTimeout(600);
  if (!(await p.$(`[data-load="${idA}"]`))) bad('甲再登录存档没了');
  const raw = await p.evaluate(() => localStorage.getItem('hrpg:accounts'));
  if (/abcd|efgh/.test(raw)) bad('浏览器里存了原密码');
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
