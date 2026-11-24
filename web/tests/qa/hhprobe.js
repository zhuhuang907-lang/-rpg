const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' });
    return arr(S.household).map(m => ({ rel: m.relation, name: m.name, age: m.age, dead: !!m.dead, note: m.note }));
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
