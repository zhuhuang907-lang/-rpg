const { chromium } = require('playwright');
const PLAY = 'file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto(PLAY); await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  const out = {};
  const load = async (y, c, span) => p.evaluate(({ y, c, span }) => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
    VIEW = 'game'; TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = c; MAPZ.span = span; MAPZ.big = false; MAPZ.sel = ''; MAPZ.follow = false; render();
  }, { y, c, span });
  await p.waitForTimeout(700);
  const clickUnit = async (u) => {
    const pos = await p.evaluate((u) => {
      const svg = document.querySelector('svg.smap'), M = mapUnits(S), x = M.L2.find(z => z.n === u); if (!svg || !x) return null;
      const pt = svg.createSVGPoint(), W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
      pt.x = 10 + (x.lon - MAPC.box.x0) / (MAPC.box.x1 - MAPC.box.x0) * (W - 20); pt.y = 10 + (MAPC.box.y1 - x.lat) / (MAPC.box.y1 - MAPC.box.y0) * (H - 20);
      const sp = pt.matrixTransform(svg.getScreenCTM()); return { x: sp.x, y: sp.y };
    }, u);
    if (!pos) return null; await p.mouse.click(pos.x, pos.y); await p.waitForTimeout(500);
    return p.evaluate(() => ({ sel: MAPZ.sel, txt: (document.querySelector('#mapInfo') || {}).innerText || '' }));
  };
  // 1800: 直隶 group, 朝鲜 vassal
  await load(1800, { lon: 118, lat: 35 }, 8);
  const units1800 = await p.evaluate(() => { const M = mapUnits(S); return M.L2.filter(u => u.lat).map(u => u.n + '=' + ((M.reg(u) || {}).name || '') + ':' + ((M.reg(u) || {}).kind || '')).slice(0, 60); });
  out.u1800 = units1800;
  out.c1800 = await clickUnit('顺天府');
  await load(1800, { lon: 126, lat: 38 }, 5);
  out.foreign1800 = await clickUnit('朝鲜汉阳');
  out.foreign1800b = await clickUnit('琉球首里');
  // 930 vassals
  await load(930, { lon: 119, lat: 30 }, 6);
  out.wuyue = await clickUnit('杭州');
  out.min = await clickUnit('福州');
  // 190 warlord
  await load(190, { lon: 115, lat: 37 }, 8);
  out.yuan = await clickUnit('魏郡');
  // 1000/1400 groups
  await load(1000, { lon: 115, lat: 34 }, 8); out.song = await clickUnit('开封府');
  await load(1400, { lon: 116, lat: 36 }, 8); out.ming = await clickUnit('济南府');
  // layers and big wheel
  await load(1800, { lon: 113, lat: 34 }, 8);
  out.layers0 = await p.evaluate(() => [...document.querySelectorAll('[data-maplay]')].map(x => ({ k: x.dataset.maplay, on: x.checked })));
  await p.click('[data-maplay="road"]'); await p.waitForTimeout(400);
  out.layers1 = await p.evaluate(() => [...document.querySelectorAll('[data-maplay]')].map(x => ({ k: x.dataset.maplay, on: x.checked })));
  await p.click('[data-mapbig="1"]'); await p.waitForTimeout(700);
  const span0 = await p.evaluate(() => MAPZ.span);
  await p.evaluate(() => document.querySelector('svg.smap').dispatchEvent(new WheelEvent('wheel', { deltaY: -200, bubbles: true, cancelable: true })));
  await p.waitForTimeout(600);
  out.bigWheel = { span0, span1: await p.evaluate(() => MAPZ.span), big: await p.evaluate(() => MAPZ.big) };
  console.log(JSON.stringify({ out, errs }, null, 1));
  await b.close();
})();
