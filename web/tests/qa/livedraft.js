// 边写边显示：写稿、核对时页面上能看到初稿（标明是初稿），写完换成定稿；初稿里不露幕后
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(s => { localStorage.clear(); localStorage.setItem('hrpg:tscale', s); }, String(0.1 * Number(process.env.LAT || 1))); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart'); await p.waitForSelector('#said', { timeout: 300000 }); await p.waitForFunction(() => !BUSY, null, { timeout: 300000 });
  // 用要紧的一步（走全套：写稿、综合审稿、记账）；家常的一步走快路、没有单独的核对，由 light.js 测
  await p.fill('#said', '去仪征盐栈查账，追问那二百引盐的去向，要掌柜当面对质'); await p.click('#bSend');
  let sawDraft = false, sawVerify = false, leak = false;
  for (let i = 0; i < 400; i++) {
    const st = await p.evaluate(() => ({ busy: BUSY, ph: PHASE, live: (document.querySelector('#draftLive') || {}).innerText || '' }));
    if (st.live.length > 20) { sawDraft = true; if (/【幕后】/.test(st.live)) leak = true; if (st.ph === 'verify') { if (!sawVerify) await p.screenshot({ path: (process.env.SHOTS || '.') + '/livedraft.png' }); sawVerify = true; } }
    if (!st.busy && i > 3) break; await p.waitForTimeout(250);
  }
  if (!sawDraft) bad('写稿时看不到初稿'); if (!sawVerify) bad('核对期间初稿没留在页面上'); if (leak) bad('初稿里露了幕后');
  const fin = await p.evaluate(() => !document.querySelector('#draftLive') && S.chat[S.chat.length - 1].role === 'gm');
  if (!fin) bad('写完后初稿没换成定稿');
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
