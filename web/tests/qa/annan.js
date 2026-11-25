const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 950, month: 6, day: 1, place: '洛阳', polity: '唐' });
    const M = mapUnits(S);
    return ['交州', '爱州', '峰州', '汤州', '演州', '安武州', '武峨州'].map(n => { const u = M.L2.find(x => x.n === n); return u ? n + ' ' + u.lon.toFixed(2) + ',' + u.lat.toFixed(2) : n + ' 无'; });
  });
  console.log(r.join('\n'));
  await b.close();
})();
