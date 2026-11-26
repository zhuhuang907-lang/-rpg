const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 884, month: 6, day: 1, place: '洛阳', polity: '唐' });
    const R = realmsAt(884, 6), o = {};
    for (const x of R.list) o[x.name] = { col: x.col, parent: x.parent, kind: x.kind, vassal: !!x.vassal };
    return o;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
