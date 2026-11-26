const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 756, month: 6, day: 1, place: '洛阳', polity: '唐' });
    TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'world'; MAPZ.follow = false; render();
    const M = mapUnits(S), R = realmsAt(756, 6), cols = {};
    for (const x of R.list) cols[x.name] = { col: x.col, parent: x.parent, kind: x.kind, vassal: !!x.vassal };
    const svg = document.querySelector('svg.smap');
    const fills = {};
    for (const n of ['太原府', '凤翔府', '江陵府', '洪州', '广州', '幽州']) { const el = svg && svg.querySelector(`path[data-mapu="${n}"]`); fills[n] = el ? el.getAttribute('fill') : null; }
    return { cols, fills, pats: svg ? [...svg.querySelectorAll('pattern')].map(x => x.id) : [] };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
