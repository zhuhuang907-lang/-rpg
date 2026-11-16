// 统治者筹钱的路（R-242 第二步）：加派、预征、卖官、鬻度牒、借商、括户清丈、裁冗减俸、和籴；真点按钮；钱到库打折扣（腐败截留、威望）；
// 不能连着办；度牒唐中叶以前没有；加派三个月后逃户、民心低激起民变；括户半年后田赋丁役长；预征的秋粮照扣；借商半年商税少；减俸官俸少
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1800 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof fundRaise === 'function');
  const setup = (y, pol, name) => p.evaluate(([y, pol, name]) => { S = newSave({ name, gender: '男', age: 30, role: '皇帝', real: true, gregorianYear: y, month: 7, day: 1, place: '开封', polity: pol }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.money = { cash: 5000, unit: '两' }; S.econ = { v: 2, y, pl: geoCenter(S), unit: '两', rice: 2, wage: 0.05, landPrice: 5, cloth: 0.5, yield: 2, rentRate: 0.5 };
    S.realm = { treasury: 1000000, granary: 2000000 }; S.fisc = { kind: 'realm', unit: '两', base: { tianfu: 6000000, dingyi: 1200000, shang: 2000000, feng: 1200000 }, pol: { tax: '常', yan: '照旧', coin: '足值', cp: false, yao: '常' }, works: [], kc: { due: 0, paid: 0 }, price: 100 };
    S.gov = { scope: 'realm', stats: { 民心: 45, 腐败: 50, 治安: 50, 灾情: 20, 威望: 50 }, keys: ['民心', '腐败', '治安', '灾情', '威望'] };
    VIEW = 'game'; TAB = 'board'; SIDE_FOLD = false; render(); return [...document.querySelectorAll('[data-fund]')].map(b => b.dataset.fund); }, [y, pol, name]);
  let ks = await setup(1640, '明', '朱由检');
  if (ks.length < 7) errs.push('明末筹钱的路不全：' + ks);
  const tr = () => p.evaluate(() => S.realm.treasury);
  // 加派：真点，进钱但不足名义（截留），民心降；连点被拦
  let t0 = await tr(); await p.click('button[data-fund="加派"]'); let t1 = await tr(); const g = await p.evaluate(() => S.gov.stats);
  if (!(t1 > t0) || t1 - t0 >= 6000000 * 0.25) errs.push('加派没进钱，或一文不少全到库：' + (t1 - t0)); if (!(g.民心 < 45)) errs.push('加派民心没降');
  await p.click('button[data-fund="加派"]'); if (!/再办/.test(await p.evaluate(() => ORGMSG))) errs.push('加派能连着办');
  // 截留：腐败高的到库少
  const leak = await p.evaluate(() => { const one = fu => { S.fisc.fundYM = {}; S.gov.stats.腐败 = fu; const a = S.realm.treasury; fundRaise(S, '卖官'); return S.realm.treasury - a; }; return { clean: one(10), dirty: one(90) }; });
  if (!(leak.clean > leak.dirty)) errs.push('吏治清浊到库一样：' + JSON.stringify(leak));
  // 其余真点一遍
  for (const k of ['预征', '借商', '括户', '减俸', '和籴', '度牒']) { const el = await p.$(`button[data-fund="${k}"]`); if (!el) { errs.push('没有「' + k + '」按钮'); continue; } await p.evaluate(() => { S.fisc.fundYM = {}; }); await p.click(`button[data-fund="${k}"]`); }
  const st = await p.evaluate(() => ({ pre: S.fisc.preTaken, shang: S.fisc.shangCutTill, feng: S.fisc.fengCut, ding: S.fisc.dingCut, after: arr(S.fisc.after).map(x => x.eff) }));
  if (!st.pre || !st.shang || !st.feng || !st.ding || !st.after.includes('kuo')) errs.push('预征、借商、减俸、度牒、括户没记账：' + JSON.stringify(st));
  // 月结：借商商税少、减俸官俸少；三个月后逃户（民心压低激民变）；半年后括户长赋
  const mo = await p.evaluate(() => { const F = S.fisc; S.gov.stats.民心 = 25; S.gov.stats.威望 = 60; const out = []; for (let i = 0; i < 7; i++) { S.clock.m = S.clock.m % 12 + 1; if (S.clock.m === 1) S.clock.y++; F.ym = null; out.push(...fiscalMonthly(S)); if (i === 0) { var sh = F.last.why['商税'] || '', fe = F.last.X['官俸']; } }
    return { out, sh, fe, boost: F.taxBoost, press: arr(S.press).some(x => /民变/.test(x.title)) }; });
  if (!/借商/.test(mo.sh || '')) errs.push('借商以后商税没少');
  if (!(mo.fe < 1200000 / 12)) errs.push('减俸以后官俸没少：' + mo.fe);
  if (!mo.out.some(x => /逃户/.test(x)) || !mo.press) errs.push('加派三个月后没逃户、民心低没民变：' + JSON.stringify(mo.out));
  if (!(mo.boost > 0)) errs.push('括户半年后田赋丁役没长：' + JSON.stringify(mo));
  // 北魏 500：没有度牒
  ks = await setup(500, '北魏', '元恪'); if (ks.includes('度牒')) errs.push('北魏就有鬻度牒了');
  console.log('FUND', JSON.stringify({ leak })); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
