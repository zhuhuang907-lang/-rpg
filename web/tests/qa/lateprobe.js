const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const out = {};
    for (const [y, xy] of [[1619, [123.4, 41.8]], [1639, [123.4, 41.8]], [1664, [120.2, 23.0]], [1369, [116.0, 42.4]], [1369, [102.8, 47.2]], [1674, [120.2, 23.0]]]) {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      const G = geoYear(y), M = mapUnits(S), R = realmsAt(y, 6);
      const near = A => A.filter(u => u.lat && Math.hypot((u.lon - xy[0]) * Math.cos(xy[1] * Math.PI / 180), u.lat - xy[1]) < 1.2).map(u => (u.n || u.name) + '=' + ((M.reg(u) || {}).name || '无') + '[' + (u.t || u.type) + ']').slice(0, 12);
      out[y + '@' + xy] = { realms: R ? R.list.map(x => x.name).filter(n => /后金|清|明|东宁|明郑|北元|察哈尔/.test(n)) : null, G: near(G), L2: near(M.L2) };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
