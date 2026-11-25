// 地图滚轮/拖动细查
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 7, day: 3, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王'; S.territory = ['福州', '建州', '泉州'];
    S.chat = [{ role: 'gm', text: '开场' }]; VIEW = 'game'; TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 117.6, lat: 27.8 }; MAPZ.span = 3.4; MAPZ.big = false; render();
  });
  await p.waitForTimeout(900);
  const out = {};
  // Ctrl+滚轮（直接派发到 SVG，确保目标就是地图）
  out.ctrlWheel = await p.evaluate(async () => {
    const sv = document.querySelector('svg.smap'); const s0 = MAPZ.span;
    sv.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 600));
    return { s0, s1: MAPZ.span };
  });
  // 普通滚轮：地图不吃，侧栏滚动
  out.plainWheel = await p.evaluate(async () => {
    const sv = document.querySelector('svg.smap'), sd = document.querySelector('.side'); sd.scrollTop = 120; const s0 = MAPZ.span;
    sv.dispatchEvent(new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 200));
    return { s0, s1: MAPZ.span, side: sd.scrollTop };
  });
  // 拖动：图心应改变，选中不应改变
  const box = await p.evaluate(() => { const r = document.querySelector('svg.smap').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.evaluate(() => { MAPZ.sel = ''; MAPZ.c = { lon: 117.6, lat: 27.8 }; MAPZ.span = 3.4; render(); });
  await p.waitForTimeout(600);
  const c0 = await p.evaluate(() => ({ ...MAPZ.c }));
  await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.mouse.move(box.x - 80, box.y + 20, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(700);
  out.drag = { c0, c1: await p.evaluate(() => ({ ...MAPZ.c })), sel: await p.evaluate(() => MAPZ.sel) };
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
