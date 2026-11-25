const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const out = {};
    for (const [y, box] of [[200, [119, 39, 127, 43]], [320, [119, 39, 127, 43]], [194, [102, 28, 109, 34]], [1780, [85, 42, 90, 45]]]) {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      const M = mapUnits(S), R = realmsAt(y, 6);
      out[y] = { realms: R ? R.list.map(x => x.name) : null, units: M.L2.filter(u => u.lat && u.lon >= box[0] && u.lon <= box[2] && u.lat >= box[1] && u.lat <= box[3]).map(u => { const g = M.reg(u); return u.n + '=' + (g ? g.name : '无'); }) };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
