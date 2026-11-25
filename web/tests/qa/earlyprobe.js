const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof geoYear === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 200, month: 6, day: 1, place: '洛阳', polity: '唐' });
    const G = geoYear(200), U = stratUnits(S), M = mapUnits(S);
    const f = n => G.filter(u => u.name === n).map(u => `${u.name}[${u.type}] ${u.from}-${u.to} @${u.lon.toFixed(2)},${u.lat.toFixed(2)} ${u.b || ''}`);
    const L = n => M.L2.filter(u => u.n === n).map(u => `${u.n} @${u.lon.toFixed(2)},${u.lat.toFixed(2)}`);
    return {辽东: f('辽东郡'), 玄菟: f('玄菟郡'), 乐浪: f('乐浪郡'), 带方: f('带方郡'), prefs: U.prefs.filter(u => /辽东|玄菟|乐浪|带方/.test(u.name)).map(u => u.name), l2: L('辽东郡')};
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
