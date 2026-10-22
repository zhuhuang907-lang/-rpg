// 截图巡检：开一局玩几回合，每个册子在电脑和手机宽度下各截一张，给人眼看
const { chromium } = require('playwright');
const OUT = process.env.SHOTS || 'shots';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + '/00-home.png', fullPage: true });
  const idle = () => p.waitForFunction(() => !BUSY, null, { timeout: 300000, polling: 300 });
  await p.fill('#qText', process.env.WHO || '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/01-opening-wait.png' });
  await p.waitForSelector('#said', { timeout: 300000 }); await idle();
  await p.screenshot({ path: OUT + '/02-opening.png', fullPage: true });
  for (const t of (process.env.TURNS || '去仪征看看盐栈|找程立德问亏空的事|戏外：一引盐赚多少？|在江都募四百乡勇|上城守城|给运司书吏送二百两').split('|')) {
    await p.fill('#said', t); await p.click('#bSend'); await p.waitForTimeout(1200);
    if (t === '上城守城') await p.screenshot({ path: OUT + '/03-turn-wait.png' });
    await idle(); await p.waitForTimeout(300);
  }
  await p.screenshot({ path: OUT + '/04-after.png', fullPage: false });
  const tabs = await p.$$eval('[data-tab]', xs => [...new Set(xs.map(x => x.dataset.tab))]);
  for (const t of tabs) { await p.click(`[data-tab="${t}"]`).catch(() => {}); await p.waitForTimeout(300); const side = await p.$('.side, aside, #side'); await (side || p).screenshot({ path: `${OUT}/10-tab-${t}.png` }).catch(async () => p.screenshot({ path: `${OUT}/10-tab-${t}.png` })); }
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '/20-mobile-main.png' });
  for (const t of tabs.slice(0, 4)) { await p.click(`[data-tab="${t}"]`).catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/21-mobile-${t}.png` }); }
  console.log('TABS', tabs.join(','), 'ERRS', JSON.stringify(errs));
  await b.close();
})();
