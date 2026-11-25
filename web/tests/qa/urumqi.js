const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof geoYear === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const A = geoData().filter(u => /乌鲁木齐|乌噜木齐|迪化/.test(u.name));
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 1780, month: 6, day: 1, place: '洛阳', polity: '清' });
    const M = mapUnits(S), G = geoYear(1780);
    return { A, G: G.filter(u => /乌鲁木齐|乌噜木齐|迪化/.test(u.name)), L2: M.L2.filter(u => /乌鲁木齐|乌噜木齐|迪化/.test(u.n)) };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
