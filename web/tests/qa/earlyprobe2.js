const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof geoYear === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const A = geoData();
    const C = A.filter(u => /郡$/.test(u.name) && u.to === 0 && u.from <= 0);
    const li = A.filter(u => u.name === '辽东郡');
    const g = geoYear(200);
    return { count: C.length, sample: C.slice(0, 6).map(u => u.name + ':' + typeof u.to + ':' + u.to), li: li.map(u => u.name + ' ' + u.from + '-' + u.to + ' ' + u.type), g200: g.filter(u => /辽东|玄菟|乐浪/.test(u.name)).map(u => u.name + ' ' + u.from + '-' + u.to), cache: !!GEO_Y[200] };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
