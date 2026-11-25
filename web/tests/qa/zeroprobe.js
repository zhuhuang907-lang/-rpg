const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const out = {};
    for (const y of [389, 394, 479, 584, 619, 639, 644, 899, -206, -196, -111, 529, 534]) {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      const R = realmsAt(y, 6), M = mapUnits(S), cnt = {};
      for (const u of M.L2) { if (!u.lat) continue; const g = M.reg(u); if (g) cnt[g.name] = (cnt[g.name] || 0) + 1; }
      out[y] = {
        realms: R ? R.list.map(x => x.name + '(' + x.kind + ')') : null,
        zero: R ? R.list.map(x => x.name).filter(n => !cnt[n]) : null,
        nL2: M.L2.length, era: M.era ? M.era.id : '', units: M.L2.filter(u => u.lat && /夜郎|滇|闽越|东瓯|邛都|筰都|前秦|宋|西梁|楚|薛延陀|卢龙|居延/.test(u.n)).map(u => u.n + '=' + ((M.reg(u) || {}).name || '无')),
      };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
