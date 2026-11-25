const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 300)));
  p.on('dialog', d => { errs.push('dialog:' + d.message().slice(0, 100)); d.dismiss(); });
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/');
  await p.waitForTimeout(1500);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '930年 闽王 王延钧');
  await p.click('#bStart');
  await p.waitForTimeout(45000);
  const r = await p.evaluate(() => ({ view: typeof VIEW !== 'undefined' ? VIEW : '?', err: typeof ERRMSG !== 'undefined' ? ERRMSG : '?', busy: typeof BUSY !== 'undefined' ? BUSY : '?', text: document.body.innerText.slice(0, 1200), said: !!document.querySelector('#said'), q: !!document.querySelector('#qText') }));
  console.log(JSON.stringify({ r, errs }, null, 1));
  await b.close();
})();
