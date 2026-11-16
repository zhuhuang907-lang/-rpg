// 价目单位（真模型实测 930 年洛阳：价目照文填、单位记贯，一家一月吃穿一千八百贯、开局挨饿）：程序认出来折回；正常的贯、两价目不动
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof econUnitFix === 'function');
  const r = await p.evaluate(() => {
    const bad = { v: 2, y: 930, unit: '贯', basis: '米每石约300文', rice: 300, wage: 20, landPrice: 2500, yield: 2, rentRate: 0.5, feast: 800, base: { rice: 300, wage: 20 } };
    const ok1 = { v: 2, y: 930, unit: '贯', rice: 0.3, wage: 0.02, landPrice: 2.5, yield: 2 }, ok2 = { v: 2, y: 1757, unit: '两', rice: 1.6, wage: 0.05, landPrice: 8, yield: 2 }, wen = { v: 2, y: 1100, unit: '文', rice: 800, wage: 60, yield: 2 };
    const f = [econUnitFix(bad), econUnitFix(ok1), econUnitFix(ok2), econUnitFix(wen)];
    // 旧存档：econOf 第一次用时折回；一家吃穿不再上千贯
    S = newSave({ name: '张守诚', gender: '男', age: 35, role: '绸缎商人', gregorianYear: 930, month: 2, day: 15, place: '洛阳', polity: '后唐' }); S.money = { unit: '贯', cash: 120 };
    S.econ = { v: 2, y: 930, pl: geoCenter(S), unit: '贯', rice: 300, wage: 20, landPrice: 2500, yield: 2, rentRate: 0.5, cloth: 150, pay: 150, payOff: 400 };
    S.household = [{ relation: '妻', name: '程兰芝', age: 33 }, { relation: '子', name: '张湛', age: 12 }];
    const e = econOf(S); let need = null; try { need = hhNeed(S); } catch (x) { need = 'ERR ' + x.message; }
    return { f, bad, ok1, need, rice: e && e.rice };
  });
  if (!r.f[0] || r.bad.rice !== 0.3 || r.bad.wage !== 0.02 || r.bad.base.rice !== 0.3 || r.bad.yield !== 2 || r.bad.rentRate !== 0.5) errs.push('照文填的贯价没折回（或把亩产、租率也折了）：' + JSON.stringify(r.bad));
  if (r.f[1] || r.f[2] || r.f[3]) errs.push('正常的价目被误折：' + JSON.stringify(r.f));
  if (r.rice !== 0.3) errs.push('旧存档的价目没在第一次用时折回：' + r.rice);
  if (!(typeof r.need === 'number' && r.need < 30)) errs.push('一家三口一月吃穿还是天价：' + r.need);
  console.log('ECON', JSON.stringify({ need: r.need })); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
