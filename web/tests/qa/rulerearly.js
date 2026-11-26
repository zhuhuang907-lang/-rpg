const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof realmsAt === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    const out = {};
    for (const y of [190, 200, 208, 220, 234, 250, 420]) { S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '汉' }); const R = realmsAt(y, 6); out[y] = R.list.filter(x => /汉|曹操|袁绍|魏|蜀汉|吴|东晋|北魏|宋/.test(x.name)).map(x => x.name + '=' + (regRuler(S, x) || '无')).slice(0, 12); } return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
