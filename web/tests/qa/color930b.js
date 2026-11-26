const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 930, month: 6, day: 1, place: '洛阳', polity: '后唐' });
    TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 113, lat: 33 }; MAPZ.span = 8; MAPZ.follow = false; render();
    const R = realmsAt(930, 6), cols = {};
    for (const x of R.list) if (/后唐|魏博|成德|卢龙|义武|宣武|凤翔|吴越|楚|荆南|闽|南汉|定难|朔方|归义/.test(x.name)) cols[x.name] = { col: x.col, parent: x.parent, kind: x.kind, vassal: !!x.vassal };
    const svg = document.querySelector('svg.smap');
    const pats = svg ? [...svg.querySelectorAll('pattern')].map(x => ({ id: x.id, fill: (x.querySelector('rect') || {}).getAttribute && x.querySelector('rect').getAttribute('fill') })) : [];
    return { cols, pats, errs: [] };
  });
  console.log(JSON.stringify({ ...r, pageErrs: errs }, null, 1));
  await b.close();
})();
