// 交互验一遍：换页滚动位置、点地图、放大缩小、大图收放、查账册、换一局
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 7, day: 3, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王'; S.turn = 5;
    S.realm = { treasury: 118000, granary: 286000, revenue: 90000, outlay: 80000, army: 30000, capital: '福州' };
    S.territory = ['福州', '建州', '泉州', '漳州', '汀州'].map(x => ({ place: x, pop: 60000, troops: 5000, grain: 40000, loyalty: 60 }));
    S.forces = [{ name: '威武军', leader: '王延钧', at: '建州', troops: 11000, grain: 6000, morale: 62, train: 55, orgNow: 66, quality: '中', units: [], status: '驻守' }];
    S.prices = [{ item: '米', price: 400, per: '石' }, { item: '绢', price: 800, per: '匹' }];
    S.chat = [{ role: 'gm', text: '开场' }]; VIEW = 'game'; TAB = 'board'; MAPZ.inited = false; render();
  });
  const out = {};
  // A 换页滚动位置
  await p.evaluate(() => { TAB = 'power'; render0(); const s = document.querySelector('.side'); if (s) s.scrollTop = 900; });
  await p.waitForTimeout(200);
  await p.click('[data-tab="people"]');
  await p.waitForTimeout(300);
  out.scrollReset = await p.evaluate(() => { const s = document.querySelector('.side'); return { top: s && s.scrollTop, tab: TAB }; });
  // B 点地图上的州
  await p.click('[data-tab="map"]');
  await p.waitForTimeout(600);
  out.mapClick = await p.evaluate(() => { const el = document.querySelector('svg.smap [data-mapu="建州"]'); if (!el) return { found: false }; el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return { found: true }; });
  await p.waitForTimeout(400);
  out.mapInfo = await p.evaluate(() => ({ sel: MAPZ.sel, txt: (document.querySelector('#mapInfo') || {}).innerText ? document.querySelector('#mapInfo').innerText.slice(0, 120) : '' }));
  // C 放大缩小
  const span0 = await p.evaluate(() => MAPZ.span);
  await p.click('[data-mapzoom="in"]'); await p.waitForTimeout(500);
  const span1 = await p.evaluate(() => MAPZ.span);
  await p.click('[data-mapzoom="out"]'); await p.waitForTimeout(500);
  out.zoom = { span0, span1, span2: await p.evaluate(() => MAPZ.span) };
  // D 大图收放
  await p.click('[data-mapbig="1"]'); await p.waitForTimeout(800);
  out.bigOn = await p.evaluate(() => ({ big: MAPZ.big, has: !!document.querySelector('.mapwrap.big') }));
  await p.click('[data-mapbig="1"]'); await p.waitForTimeout(800);
  out.bigOff = await p.evaluate(() => ({ big: MAPZ.big, has: !!document.querySelector('.mapwrap.big') }));
  // E 查账册
  await p.fill('#sideFind', '王延钧'); await p.press('#sideFind', 'Enter'); await p.waitForTimeout(500);
  out.find = await p.evaluate(() => ({ q: FIND_Q, hit: !!document.querySelector('.findHit'), tab: TAB }));
  // F 换一局
  await p.click('#bHome'); await p.waitForTimeout(600);
  out.home = await p.evaluate(() => ({ view: VIEW, hasStart: !!document.querySelector('#bStart') }));
  console.log(JSON.stringify({ out, errs }, null, 1));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
