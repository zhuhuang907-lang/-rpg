const { chromium } = require('playwright');
const PLAY = 'file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const out = {}, errsAll = [];
  for (const y of [190, 500, 930, 1800]) {
    const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
    await p.goto(PLAY);
    await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
    await p.evaluate((y) => {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      VIEW = 'game'; TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 113, lat: 33 }; MAPZ.span = 7; MAPZ.big = false; MAPZ.follow = false; render();
    }, y);
    await p.waitForTimeout(700);
    const o = {};
    o.unit = await p.evaluate(() => {
      const M = mapUnits(S), svg = document.querySelector('svg.smap'); if (!svg) return null;
      const W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height, rr = svg.getBoundingClientRect();
      const pt = svg.createSVGPoint();
      const at = u => { pt.x = 10 + (u.lon - MAPC.box.x0) / (MAPC.box.x1 - MAPC.box.x0) * (W - 20); pt.y = 10 + (MAPC.box.y1 - u.lat) / (MAPC.box.y1 - MAPC.box.y0) * (H - 20); return pt.matrixTransform(svg.getScreenCTM()); };
      const cand = M.L2.filter(u => u.lat && u.lon > MAPC.box.x0 && u.lon < MAPC.box.x1 && u.lat > MAPC.box.y0 && u.lat < MAPC.box.y1).map(u => ({ u, p: at(u) })).find(x => x.p.x > rr.left + 20 && x.p.x < rr.right - 20 && x.p.y > rr.top + 20 && x.p.y < rr.bottom - 20);
      if (!cand) return null; const sp = cand.p, u = cand.u;
      return { n: u.n, lon: u.lon, lat: u.lat, x: sp.x, y: sp.y, reg: (M.reg(u) || {}).name, parent: (M.reg(u) || {}).parent, kind: (M.reg(u) || {}).kind };
    });
    if (o.unit) { await p.mouse.click(o.unit.x, o.unit.y); await p.waitForTimeout(500); o.info = await p.evaluate(() => ({ sel: MAPZ.sel, txt: (document.querySelector('#mapInfo') || {}).innerText || '' })); }
    // zoom in/out and big map
    o.zoom = await p.evaluate(() => ({ s0: MAPZ.span, big: MAPZ.big }));
    await p.click('[data-mapzoom="in"]'); await p.waitForTimeout(400);
    o.zoom.s1 = await p.evaluate(() => MAPZ.span);
    await p.click('[data-mapbig="1"]'); await p.waitForTimeout(800);
    o.big = await p.evaluate(() => ({ big: MAPZ.big, wrap: !!document.querySelector('.mapwrap.big'), span: MAPZ.span }));
    await p.click('[data-mapbig="1"]'); await p.waitForTimeout(600);
    // layers
    o.layers = await p.evaluate(() => [...document.querySelectorAll('[data-maplay]')].map(x => ({ k: x.dataset.maplay, on: x.checked })));
    // legend size/overflow
    o.layout = await p.evaluate(() => { const s = document.querySelector('.side'), l = document.querySelector('.mlegend'), svg = document.querySelector('svg.smap'); return { sideScroll: s.scrollHeight, sideClient: s.clientHeight, legendH: l ? l.offsetHeight : 0, svg: !!svg, bodyW: document.documentElement.scrollWidth, winW: innerWidth }; });
    out[y] = o; errsAll.push({ y, errs }); await p.close();
  }
  // mobile
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const me = []; m.on('pageerror', e => me.push(e.message.slice(0, 200)));
  await m.goto(PLAY); await m.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  await m.evaluate(() => { S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' }); S.idm = 'emperor'; S.protagonist.role = '闽王'; VIEW = 'game'; TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 118, lat: 27 }; MAPZ.span = 4; render(); });
  await m.waitForTimeout(900);
  out.mobile = await m.evaluate(() => { const s = document.querySelector('.side'), svg = document.querySelector('svg.smap'); return { svg: !!svg, bodyW: document.documentElement.scrollWidth, winW: innerWidth, sideW: s ? s.clientWidth : 0, tabs: document.querySelectorAll('.side .tabs button').length, legend: !!document.querySelector('.mlegend') }; });
  errsAll.push({ y: 'mobile', errs: me }); await m.close();
  console.log(JSON.stringify({ out, errsAll }, null, 1));
  await b.close();
})();
