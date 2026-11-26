const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof regRuler === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 234, month: 6, day: 1, place: '洛阳', polity: '魏' });
    const R = realmsAt(234, 6);
    return R.list.filter(x => /吴|魏|蜀汉/.test(x.name)).map(x => ({ name: x.name, rr: realmRuler(x.name, 234.416), reg: regRuler(S, x), clock: S.clock }));
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
