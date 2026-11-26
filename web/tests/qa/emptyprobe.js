const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    const boxes = { 西域: [70, 35, 100, 50], 辽东: [119, 38, 128, 44], 蒙古: [90, 42, 122, 52], 青藏: [75, 25, 105, 40], 河西: [92, 35, 104, 43], 云南: [97, 21, 106, 29], 交州: [102, 18, 109, 24] };
    const out = {};
    for (const y of [756, 760, 763, 790, 820, 880, 907, 930, 960, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900]) {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      const M = mapUnits(S), G = geoYear(y), R = realmsAt(y, 6), cnt = {}, by = {};
      for (const u of M.L2) { if (!u.lat) continue; const g = M.reg(u); const k = g ? g.name : '无'; cnt[k] = (cnt[k] || 0) + 1; for (const [bn, box] of Object.entries(boxes)) if (u.lon >= box[0] && u.lon <= box[2] && u.lat >= box[1] && u.lat <= box[3]) (by[bn] = by[bn] || []).push(u.n + '=' + k); }
      out[y] = { nL2: M.L2.length, realms: R ? R.list.map(x => x.name).length : 0, boxes: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.length + ':' + v.slice(0, 6).join(' ')])), Gwest: G.filter(u => u.lon < 105 && u.lat > 35 && u.lat < 50).map(u => u.name + '[' + u.type + ']').slice(0, 20) };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
