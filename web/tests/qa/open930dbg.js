// 930 开局调试：点开始后等 40 秒，把页面错误、提示、S 打出来
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = [], cons = []; p.on('pageerror', e => errs.push(e.message.slice(0, 300))); p.on('console', m => { if (m.type() === 'error') cons.push(m.text().slice(0, 200)); });
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/');
  await p.waitForTimeout(1200); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  await p.fill('#qText', '930年 闽王 王延钧'); await p.click('#bStart');
  await p.waitForTimeout(40000);
  const st = await p.evaluate(() => ({
    hasSaid: !!document.querySelector('#said'), hasStart: !!document.querySelector('#bStart'),
    err: (document.querySelector('.err') || {}).innerText || '', body: document.body.innerText.slice(0, 1800),
    S: typeof S !== 'undefined' && S ? { name: S.protagonist && S.protagonist.name, y: S.clock && S.clock.y, polity: S.place && S.place.polity, turn: S.turn } : null,
    ORG: typeof ORGMSG !== 'undefined' ? String(ORGMSG) : '', ERR: typeof ERRMSG !== 'undefined' ? String(ERRMSG) : '', BUSY: typeof BUSY !== 'undefined' ? BUSY : null
  }));
  console.log(JSON.stringify({ st, errs, cons }, null, 1));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
