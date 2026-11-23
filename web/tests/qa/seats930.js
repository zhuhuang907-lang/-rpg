// 930 势力表里的都城：西川、东川应各是成都府、梓州
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof realmPowers === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王';
    return realmPowers(S).filter(x => /西川|东川|定难|朔方|静海|闽|吴|楚/.test(x.name)).map(x => x.name + ' | 首领' + (x.leader || '?') + ' | 都' + (x.seat || '?') + ' | ' + (x.land || '') + ' | 兵' + (x.troops || '?'));
  });
  console.log(r.join('\n'));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
