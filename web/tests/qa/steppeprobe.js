const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    const out = {};
    for (const y of [530, 640, 800, 1000, 1250]) {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      const G = geoYear(y), M = mapUnits(S);
      out[y] = { G: G.filter(u => /居延|鄂尔浑|土拉河|色楞格|薛延陀|和林/.test(u.name)).map(u => u.name + '[' + u.type + '] ' + u.from + '-' + u.to),
        L2: M.L2.filter(u => /居延|鄂尔浑|土拉河|色楞格|薛延陀|和林/.test(u.n)).map(u => u.n + '=' + ((M.reg(u) || {}).name || '无')) };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
