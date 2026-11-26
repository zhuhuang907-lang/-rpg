const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof geoYear === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    const out = {}; for (const y of [220, 234, 263]) { S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '成都', polity: '蜀汉' }); const G = geoYear(y), M = mapUnits(S); const near = A => A.filter(u => u.lat && u.lon > 102 && u.lon < 110 && u.lat > 25 && u.lat < 33).map(u => (u.n || u.name) + '=' + ((M.reg(u) || {}).name || '无')).slice(0, 80); out[y] = { G: near(G), L2: near(M.L2) }; } return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
