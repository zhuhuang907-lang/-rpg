const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof geoYear === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const q = (y, xy) => {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      const G = geoYear(y), M = mapUnits(S), R = realmsAt(y, 6);
      const near = (arr2, n, lon, lat) => arr2.filter(u => (u.lon != null) && Math.hypot((u.lon - lon) * Math.cos(lat * Math.PI / 180), u.lat - lat) < 0.8).map(u => (u.n || u.name) + '[' + (u.t || u.type) + '] ' + u.lon.toFixed(2) + ',' + u.lat.toFixed(2)).slice(0, 8);
      return { y, GI: near(G, 'G', xy[0], xy[1]), L2: near(M.L2, 'L', xy[0], xy[1]), reg: near(M.L2, 'L', xy[0], xy[1]).map(nm => { const u = M.L2.find(x => x.n === nm.split('[')[0]); const g = u && M.reg(u); return nm.split('[')[0] + '=' + (g ? g.name : '无'); }) };
    };
    return { a: q(584, [112.19, 30.35]), b: q(619, [115.9, 28.67]), c: q(389, [106.6, 35.4]), d: q(899, [116.4, 39.9]) };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
