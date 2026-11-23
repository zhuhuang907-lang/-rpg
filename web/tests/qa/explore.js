// 人工巡游：真开一局，逐页签、逐交互截图＋记 JS 错（给「游戏几乎玩不了」的全面排查用）
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.env.SHOT_DIR || '.';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGE: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CON: ' + m.text().slice(0, 180)); });
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8742) + '/');
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2000);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  const idle = async (ms = 120000) => { try { await p.waitForFunction(() => !BUSY && !BG && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); } catch (_) {} };
  for (let k = 0; k < 5 && !(await p.$('#said')); k++) { await idle(); const rb = await p.$('#bRetry'); if (rb) await rb.click().catch(() => {}); }
  await p.waitForTimeout(800);
  const shot = async n => { await p.screenshot({ path: OUT + '/' + n + '.png', fullPage: false }); };
  await shot('00-开局');
  // 页签列表
  const tabs = await p.evaluate(() => { const bar = document.querySelector('#tabs') || document.querySelector('.tabs') || document.body; return [...document.querySelectorAll('[data-tab]')].map(b => ({ t: b.dataset.tab, txt: b.innerText.trim().slice(0, 6), vis: !!b.offsetParent })); });
  console.log('TABS', JSON.stringify(tabs));
  for (const t of tabs) {
    try { await p.evaluate(tt => { const b = [...document.querySelectorAll('[data-tab]')].find(x => x.dataset.tab === tt); if (b) b.click(); }, t.t); await p.waitForTimeout(700); await shot('tab-' + t.t); } catch (e) { errs.push('tab ' + t.t + ': ' + e.message.slice(0, 100)); }
  }
  // 舆图交互
  try {
    await p.evaluate(() => { const b = [...document.querySelectorAll('[data-tab]')].find(x => x.dataset.tab === 'geo' || x.dataset.tab === 'map'); if (b) b.click(); });
    await p.waitForTimeout(1500);
    await shot('map-世界图');
    // 点一个城
    const dot = await p.$('[data-mapu]');
    if (dot) { await dot.click({ force: true }); await p.waitForTimeout(700); await shot('map-点城'); }
    // 空地点击
    const sv = await p.$('svg.smap'); if (sv) { const bb = await sv.boundingBox(); await p.mouse.click(bb.x + bb.width * 0.4, bb.y + bb.height * 0.45); await p.waitForTimeout(700); await shot('map-点空地'); }
    // 放大
    const zi = await p.$('[data-mapzoom="in"]'); if (zi) { await zi.click(); await p.waitForTimeout(700); await shot('map-放大'); }
    // 点兵牌
    const fg = await p.$('[data-mapforce]'); if (fg) { await fg.click({ force: true }); await p.waitForTimeout(700); await shot('map-点兵'); }
  } catch (e) { errs.push('MAP: ' + e.message.slice(0, 150)); }
  // 输入一句话 + 过日子
  try {
    await p.fill('#said', '去仪征看看盐栈'); await p.keyboard.press('Enter');
    await idle(); await p.waitForTimeout(600); await shot('写一句话');
  } catch (e) { errs.push('SAY: ' + e.message.slice(0, 150)); }
  // 结算按钮、过日子
  try {
    const bs = await p.$('#bSettle'); if (bs) { await bs.click().catch(() => {}); await idle(); await p.waitForTimeout(600); await shot('结算'); }
  } catch (e) { errs.push('SETTLE: ' + e.message.slice(0, 150)); }
  console.log('ERRS', JSON.stringify(errs.slice(0, 20)));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
