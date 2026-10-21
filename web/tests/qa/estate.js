// 立家业：流民开局，现钱不能离谱；家底要逐项写（模拟 AI 第一次故意给流民八万文，程序要退回重立）
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '靖康元年东京城外的流民'); await p.click('#bStart');
  for (let i = 0; i < 300 && await p.evaluate(() => BUSY || VIEW !== 'game'); i++) await p.waitForTimeout(1000);
  const rich = await p.evaluate(() => ({ cash: S.money.cash, assets: arr(S.estate.assets).length, standing: S.estate.standing || '' }));
  // 再把身份换成流民，单独跑一次立家业：模拟 AI 第一次故意给八万文，程序必须退回重立
  await p.evaluate(async () => { S.protagonist.role = '东京城外的流民'; S.money.cash = null; await buildEstate(S); });
  console.log('RICH', JSON.stringify(rich));
  const r = await p.evaluate(() => ({ role: S.protagonist.role, cash: S.money.cash, unit: S.money.unit, assets: arr(S.estate.assets).length, standing: S.estate.standing || '' }));
  const ok = errs.length === 0 && rich.assets >= 1 && rich.standing && r.cash != null && r.cash <= 8000 && r.assets >= 1 && /流民/.test(r.standing) && require('fs').readFileSync('estate.log', 'utf8').includes('retry');
  console.log('ESTATE', JSON.stringify(r)); console.log(ok ? 'ESTATE OK' : 'ESTATE FAIL', errs);
  await b.close(); process.exit(ok ? 0 : 1); })();
