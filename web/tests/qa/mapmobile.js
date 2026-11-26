const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 7, day: 3, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王'; VIEW = 'game'; TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 118, lat: 27 }; MAPZ.span = 4; MAPZ.big = false; MAPZ.follow = false; render();
  });
  await p.waitForTimeout(900);
  await p.locator('.side .tabs button', { hasText: '舆图' }).first().click({ force: true }); await p.waitForTimeout(800);
  const pos = await p.evaluate(() => {
    const svg = document.querySelector('svg.smap'), M = mapUnits(S), u = M.L2.find(x => x.n === '福州') || M.L2[0]; if (!svg || !u) return null;
    const pt = svg.createSVGPoint(), W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
    pt.x = 10 + (u.lon - MAPC.box.x0) / (MAPC.box.x1 - MAPC.box.x0) * (W - 20); pt.y = 10 + (MAPC.box.y1 - u.lat) / (MAPC.box.y1 - MAPC.box.y0) * (H - 20);
    const sp = pt.matrixTransform(svg.getScreenCTM()); return { x: sp.x, y: sp.y, n: u.n, rect: svg.getBoundingClientRect().toJSON() };
  });
  if (pos) await p.touchscreen.tap(pos.x, pos.y);
  await p.waitForTimeout(600);
  const info = await p.evaluate(() => ({ sel: MAPZ.sel, txt: (document.querySelector('#mapInfo') || {}).innerText || '', span: MAPZ.span, big: MAPZ.big, bodyW: document.documentElement.scrollWidth }));
  const z = await p.evaluate(() => ({ span: MAPZ.span, ctl: [...document.querySelectorAll('[data-mapzoom]')].map(x => ({ r: x.getBoundingClientRect().toJSON(), vis: !!(x.offsetWidth || x.offsetHeight) })), side: document.querySelector('.side') && document.querySelector('.side').getBoundingClientRect().toJSON() }));
  console.log(JSON.stringify({ pos, info, zoom: z, errs }, null, 1));
  await b.close();
})();
