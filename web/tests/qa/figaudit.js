// 930 人物体检：名臣谱年岁/已故、同名重复、君主别名
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 7, day: 3, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王';
    const F = (() => { try { return figRoster(S); } catch (e) { return []; } })();
    const ages = F.filter(x => x.st !== '已故').map(x => ({ n: x.name, t: x.t, st: x.st })).filter(x => /[0-9]+岁/.test(x.t));
    const bad = F.filter(x => /已故/.test(x.st) && /卒于(9[3-9]\d|1\d{3})年/.test(x.t));
    const names = F.map(x => x.name), dup = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
    const R = (() => { try { return rulersAt(930, S).filter(x => /闽/.test(x.polity)).map(x => x.polity + ':' + x.name + (x.title ? '(' + x.title + ')' : '')); } catch (e) { return [String(e)]; } })();
    const H = arr(S.household).map(m => m.relation + ':' + m.name + (m.age != null ? '=' + m.age : ''));
    return { figN: F.length, badDead: bad.slice(0, 10).map(x => x.name + ' ' + x.t), dup: dup.slice(0, 10), rulers: R, household: H };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
