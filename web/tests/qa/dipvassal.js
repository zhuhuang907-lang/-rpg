const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王';
    S.diplo = S.diplo || {}; S.diplo['吴越'] = { att: 60, ties: ['臣属'], contract: '常' };
    const M = mapUnits(S); const u = M.L2.find(x => x.n === '杭州') || M.L2.find(x => /越州|苏州/.test(x.n));
    const v = u && M.reg(u);
    const V = (() => { try { return realmVassals(S).map(x => x.name); } catch (_) { return ['ERR']; } })();
    return { unit: u && u.n, reg: v && { name: v.name, vassal: !!v.vassal, parent: v.parent, col: v.col }, vassals: V, regimes: arr(M.A && M.A.regimes).filter(x => /吴越/.test(x.name)).map(x => ({ name: x.name, vassal: !!x.vassal, parent: x.parent })) };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
