const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    const out = {};
    for (const y of [756, 759, 800]) {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      const G = geoYear(y), M = mapUnits(S), R = realmsAt(y, 6);
      const near = A => A.filter(u => u.lat && Math.hypot(u.lon - 102.51, u.lat - 31.91) < 1.5).map(u => (u.n || u.name) + '=' + ((M.reg(u) || {}).name || '无'));
      out[y] = { G: near(G), L2: near(M.L2), list: R ? R.list.filter(x => /女国/.test(x.name)).map(x => x.name) : null };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
