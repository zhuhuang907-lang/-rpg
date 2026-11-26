const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof realmGroupAt === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 234, month: 6, day: 1, place: '成都', polity: '蜀汉' });
    const M = mapUnits(S), G = realmGroupAt('南中', 234);
    return { g: G, rows: (() => { try { return realmRows().filter(x => /南中|蜀汉/.test(x.n)).map(x => [x.n, x.y0, x.y1, x.i, x.pts.length]); } catch (e) { return String(e); } })(), near: M.L2.filter(u => /建宁|兴古|永昌|云南|牂柯|朱提/.test(u.n)).map(u => [u.n, (M.reg(u) || {}).name]) };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
