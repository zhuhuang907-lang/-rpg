const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof geoYear === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 1674, month: 6, day: 1, place: '桂林', polity: '清' });
    const G = geoYear(1674), M = mapUnits(S);
    return { G: G.filter(u => Math.hypot(u.lon - 110.29, u.lat - 25.28) < 1).map(u => u.name + '[' + u.type + ']'), L2: M.L2.filter(u => Math.hypot(u.lon - 110.29, u.lat - 25.28) < 1).map(u => u.n + '=' + ((M.reg(u) || {}).name || '无')) };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
