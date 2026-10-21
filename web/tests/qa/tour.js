const { chromium } = require('playwright');
const W = Number(process.argv[2] || 1300), H = Number(process.argv[3] || 900), TAG = process.argv[4] || 'd';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const shot = async n => p.screenshot({ path: `shots/${TAG}-${n}.png`, fullPage: false });
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.waitForTimeout(1200);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await shot('00home');
  const idle = async (ms = 60000) => { try { await p.waitForFunction(() => !document.querySelector('.thinking'), null, { timeout: ms }); } catch (_) {} };
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  await p.waitForTimeout(700); await shot('01opening-wait');
  await idle(); await p.waitForTimeout(500); await shot('02opened');
  const acts = ['找程立德问亏空的事', '去运司衙门找人', '戏外：一引盐赚多少？', '在家歇着，过一个月'];
  for (let i = 0; i < acts.length; i++) {
    await p.fill('#said', acts[i]); await p.click('#bSend');
    await p.waitForTimeout(400); await shot(`1${i}a-wait`);
    await idle(); await p.waitForTimeout(400); await shot(`1${i}b-done`);
    const em = await p.$$eval('.err', xs => xs.map(x => x.textContent.slice(0, 120))); if (em.length) errs.push('turn ' + i + ' 报错：' + em.join(' | '));
  }
  const gm = await p.$$eval('.msg.gm .text', xs => xs.length); console.log('GM MESSAGES', gm); if (gm < 5) errs.push('只有 ' + gm + ' 条回复（应有 5 条）');
  const tabs = await p.$$eval('[data-tab]', xs => xs.map(x => x.dataset.tab));
  for (const t of tabs) { await p.click(`[data-tab="${t}"]`); await p.waitForTimeout(300); await shot('2tab-' + t); }
  console.log('tabs', tabs.join(','));
  console.log('ERRS', JSON.stringify(errs, null, 1));
  await b.close();
})();
