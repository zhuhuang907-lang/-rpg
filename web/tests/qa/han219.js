const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 219, month: 6, day: 1, place: '许', polity: '汉' });
    const M = mapUnits(S), R = realmsAt(219, 6);
    const near = M.L2.filter(u => Math.hypot(u.lon - 113.82, u.lat - 34.03) < 1.2).map(u => u.n + '=' + ((M.reg(u) || {}).name || '无'));
    return { realms: R.list.map(x => x.name), near };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
