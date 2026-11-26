const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    const out = {};
    for (const y of [620, 700, 756, 820, 1000, 1100, 1300, 1400, 1500, 1700, 1800]) {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      const M = mapUnits(S), c = {};
      for (const u of M.L2) { if (!u.lat) continue; const pv = M.prov(u) || ''; c[pv] = (c[pv] || 0) + 1; }
      out[y] = { n: M.L2.length, top: Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 12) };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
