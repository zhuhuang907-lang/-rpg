// 按钮效果普查（审查用）：一方之主各页每个按钮点一下，比账前账后：账上变了 / 只写进输入框 / 什么都没变
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof dipAct === 'function');
  const setup = () => p.evaluate(() => { S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' }); S.chat = [{ role: 'gm', text: '开场' }];
    S.money = { cash: 300000, unit: '贯' }; S.realm = { treasury: 800000, granary: 500000 }; S.fisc = { kind: 'realm', base: { tianfu: 600000, shang: 200000, jun: 300000, feng: 100000 }, pol: { tax: '常', yan: '照旧', coin: '足值', cp: false, yao: '常' }, works: [], price: 100, granary: 0, kc: { due: 0, paid: 0 }, log: [] };
    S.forces = [{ name: '威武军', leader: '王审知', owner: '你', troops: 15000, morale: 65, orgNow: 70, train: 60, grain: 120000, at: '福州', status: '驻守' }]; S.renown = 300; S.policyPts = 20;
    S.econ = { unit: '贯', rice: 1.2, wage: 0.1, landPrice: 8, yield: 2, rentRate: 0.5, caravan: 500, ransom: 300, protect: 20, cloth: 1, interest: 0.03, myLand: 0, feast: 60, opera: 30, incense: 10, doctor: 20, pay: 1, payOff: 3, juan: 5 };
    S.popEst = { k: popKey(S), m: { 福州: { pop: 300000, nong: 50, shang: 50, cheng: 50 } } }; ORGMSG = ''; ERRMSG = '';
    callClaude = async () => ({ text: '{}' }); VIEW = 'game'; SIDE_FOLD = false; });
  const res = {};
  for (const tab of ['board', 'power', 'court', 'army', 'career', 'estate', 'trade']) {
    await setup(); await p.evaluate(t => { TAB = t; render0(); }, tab);
    const n = await p.$$eval('.side button', xs => xs.length); res[tab] = [];
    for (let i = 0; i < n; i++) {
      await setup(); await p.evaluate(t => { TAB = t; render0(); }, tab);
      const info = await p.evaluate(i => { const x = document.querySelectorAll('.side button')[i]; if (!x) return null; const lab = (x.textContent || '').trim().slice(0, 16), ds = JSON.stringify(x.dataset).slice(0, 80); window.__dig = () => JSON.stringify([S.money, S.realm, arr(S.forces).map(f => [f.name, f.troops, f.at, f.status, f.train, f.grain, arr(f.units).length]), S.territory, S.wars, S.warAsk, Object.entries(S.diplo || {}).map(([k, v]) => [k, v.att, v.ties, v.pend]), S.lulin, arr(S.acts).length, arr(S.chronicle).length, S.fisc && [S.fisc.pol, arr(S.fisc.works).length], S.tech, S.tacBook, S.campaigns, S.org && S.org.nodes && S.org.nodes.length, S.policyPts, S.edicts, S.reforms, S.renown, S.myAdm, S.shops, S.estate, S.career, S.press]); window.__b4 = window.__dig(); window.__said = ($('#said') || {}).value || ''; window.__msg = ORGMSG || ''; return { lab, ds, dis: x.disabled }; }, i);
      if (!info || info.dis || /^(＋|－|⛶|跟着我|大图|收回)/.test(info.lab)) continue;
      try { await p.evaluate(i => document.querySelectorAll('.side button')[i].click(), i); await p.waitForTimeout(250); } catch (e) { res[tab].push({ ...info, r: '出错 ' + e.message.slice(0, 60) }); continue; }
      const r = await p.evaluate(() => { const ch = window.__dig() !== window.__b4, said = (($('#said') || {}).value || '') !== window.__said, msg = (ORGMSG || '') !== window.__msg; return ch ? '账上变了' : said ? '只写进输入框' : msg ? '只出一句话：' + (ORGMSG || '').slice(0, 40) : '什么都没变'; });
      res[tab].push({ ...info, r });
    }
  }
  require('fs').writeFileSync(process.env.OUT || 'btnaudit.json', JSON.stringify({ res, errs }, null, 1)); console.log('done', errs.length); await b.close();
})();
