// 930 闽王：补齐国用账/兵马/物价后，后勤、外交、联姻逐项真调
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王';
    S.realm = { treasury: 120000, granary: 300000, revenue: 90000, outlay: 80000, army: 30000, capital: '福州' };
    S.territory = ['福州', '建州', '泉州', '漳州', '汀州'].map(x => ({ place: x, pop: 60000, troops: 5000, grain: 40000, loyalty: 60 }));
    S.forces = [{ name: '威武军', leader: '王延钧', at: '福州', troops: 12000, grain: 8000, morale: 65, train: 55, orgNow: 70, quality: '中', units: [], status: '驻守' }];
    S.prices = [{ item: '米', price: 400, per: '石' }];
    const out = {};
    out.logiOK = logiOK(S); out.rice = ricePrice(S); out.depots = depotsOf(S).map(d => d.place + '/' + N0(d.grain));
    out.rev = annualRev(S); out.sup = supCalc(S, S.forces[0]);
    out.build = (() => { const x = depotBuild(S, '建州'); return { r: x, msg: ORGMSG }; })();
    out.forage = (() => { const x = forage(S, '威武军'); return { r: x, msg: ORGMSG }; })();
    out.porter = (() => { const x = porterCall(S); return { r: x, msg: ORGMSG }; })();
    out.logiHtml = logiHtml(S).length;
    // 外交
    out.dipRole = dipRole(S); out.powers = realmPowers(S).length;
    out.xiuhao = (() => { const x = dipAct(S, '吴', '修好'); return { r: x, msg: ORGMSG, pend: S.diplo && S.diplo['吴'] && S.diplo['吴'].pend }; })();
    out.lianyinNoKid = (() => { const x = dipAct(S, '吴越', '联姻'); return { r: x, msg: ORGMSG }; })();
    out.household = arr(S.household).map(m => m.relation + ':' + m.name + (m.age != null ? '(' + m.age + ')' : ''));
    out.kidOK = arr(S.household).some(m => /子|女/.test(m.relation || '') && !m.dead && !/已嫁|已娶/.test(m.note || ''));
    // 月度外交回报：把使者提前到期
    if (S.diplo && S.diplo['吴'] && S.diplo['吴'].pend) S.diplo['吴'].pend.due = Math.floor(ymOf(S.clock));
    const dm = dipMonthly(S); out.dipMonthly = dm;
    out.marryAsk = (() => { try { return 'async'; } catch (e) { return String(e); } })();
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  console.log('ERRS ' + JSON.stringify(errs.slice(0, 5)));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
