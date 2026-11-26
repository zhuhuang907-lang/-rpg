const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  await p.evaluate(() => { S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' }); S.idm = 'emperor'; S.protagonist.role = '闽王'; VIEW = 'game'; render(); });
  await p.waitForTimeout(800);
  const a = await p.evaluate(() => ({ tab: TAB, sideH: document.querySelector('.side').clientHeight, tabs: [...document.querySelectorAll('.side .tabs button')].map(x => x.textContent).slice(0, 20) }));
  // tap the map tab by text
  const tab = p.locator('.side .tabs button', { hasText: '舆图' }).first();
  await tab.click({ force: true }); await p.waitForTimeout(800);
  const c = await p.evaluate(() => { const svg = document.querySelector('svg.smap'), side = document.querySelector('.side'); return { tab: TAB, svg: !!svg, rect: svg && svg.getBoundingClientRect().toJSON(), sideH: side && side.clientHeight, bodyH: document.body.scrollHeight, ctl: [...document.querySelectorAll('[data-mapzoom]')].map(x => ({ d: x.getBoundingClientRect().toJSON(), v: !!(x.offsetWidth || x.offsetHeight) })) }; });
  await p.screenshot({ path: 'C:/Users/DELL/AppData/Local/Temp/zcode-work/mobile_map2.png', fullPage: true });
  console.log(JSON.stringify({ a, c, errs }, null, 1));
  await b.close();
})();
