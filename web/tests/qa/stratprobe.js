const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 1664, month: 6, day: 1, place: '洛阳', polity: '清' });
    const U = stratUnits(S), M = mapUnits(S), G = geoYear(1664);
    const f = A => A.filter(u => /承天|天兴|万年|奉天|辽阳/.test(u.name || u.n)).map(u => (u.name || u.n) + '[' + (u.type || u.t) + '] ' + (u.lon) + ',' + (u.lat));
    return { prefs: f(U.prefs), L2: f(M.L2), G: f(G), cnt: U.prefs.length, l2n: M.L2.length, mode: MAPZ.mode };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
