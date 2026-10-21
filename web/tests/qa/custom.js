const { chromium } = require('playwright');
(async () => {
  const W = Number(process.argv[2] || 1300), H = Number(process.argv[3] || 900), TAG = process.argv[4] || 'd';
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  
  await p.selectOption('#cEra', '唐前期'); await p.fill('#cYear', '天宝十四载'); await p.fill('#cPolity', '唐'); await p.fill('#cPlace', '范阳');
  await p.selectOption('#cKind', '武将、军士'); await p.fill('#cRole', '节度使帐下小校'); await p.selectOption('#cGender', '男'); await p.fill('#cAge', '24');
  await p.fill('#cFamily', '父亲是幽州老卒，战死在奚人手里'); await p.fill('#cMore', '识得几个字，弓马娴熟');
  await p.screenshot({ path: `shots/${TAG}-cform.png`, fullPage: true });
  await p.click('#bCustomStart');
  await p.waitForSelector('#said', { timeout: 120000 }); await p.waitForTimeout(800);
  await p.screenshot({ path: `shots/${TAG}-intro.png` });
  for (let i = 0; i < 4; i++) { await p.fill('#said', '去查账' + i); await p.click('#bSend'); await p.waitForFunction(() => !document.querySelector('.thinking'), null, { timeout: 90000 }); }
  await p.waitForTimeout(500); await p.screenshot({ path: `shots/${TAG}-goals.png` });
  console.log('ERRS', errs); await b.close();
})();
