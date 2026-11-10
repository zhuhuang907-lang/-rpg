// 后勤补全（R-169）：太仓不再只出不进——夏税秋粮照朝代有几成征本色、经漕运入太仓（京城被围运不进）；
// 粮道断了、随军粮不够的兵马能就地征粮（真点）：自家地盘掉民心，别家地盘那家记恨，同处半年内再征减半，一月一回；敌军远来也逃散病亡；后勤栏写每月吃多少、够几个月
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof forage === 'function');
  const bad = [], ev = (f, a) => p.evaluate(f, a), click = async (sel, what) => { const el = await p.$(sel); if (!el) { bad.push('没有「' + what + '」按钮'); return false; } await p.click(sel); await p.waitForTimeout(150); return true; };
  const setup = y => ev(y => { S = newSave({ name: '某帝', gender: '男', age: 30, role: '皇帝', real: true, gregorianYear: y, month: 6, day: 1, place: '开封', polity: '宋' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.realm = { capital: '开封', granary: 100000, treasury: 5000000 }; S.money = { cash: 0, unit: '贯' }; S.prices = [{ item: '米', price: 1, per: '石' }]; S.territory = [{ place: '开封' }, { place: '洛阳' }];
    S.fisc = { kind: 'realm', unit: '贯', base: { tianfu: 12000000 }, pol: { tax: '常', yan: '照旧', coin: '足值', cp: false, yao: '常' }, works: [], kc: { due: 0, paid: 0 }, price: 100 }; S.gov = { scope: 'realm', stats: { 民心: 60, 太仓粮: 100000 }, keys: ['民心', '太仓粮'] };
    S.forces = [{ name: '禁军', owner: '你', leader: '某将', troops: 20000, at: '开封', status: '驻扎', morale: 70, grain: 0 }]; S.powers = [{ name: '西夏', leader: '李元昊', seat: '兴庆府', stance: '敌', troops: 50000 }];
    VIEW = 'game'; TAB = 'army'; SIDE_FOLD = false; render(); }, y);
  // 夏税：本色入太仓，那几成不算进现钱
  await setup(1050);
  { const r = await ev(() => { const g0 = S.realm.granary; fiscalMonthly(S); const a = { g: S.realm.granary - g0, tf: S.fisc.last.R['田赋'], why: S.fisc.last.why ? S.fisc.last.why['田赋'] : '' }; return a; });
    if (!(r.g > 0) || !/本色/.test(r.why) || !/漕运/.test(r.why)) bad.push('北宋夏税没有本色经漕运入太仓：' + JSON.stringify(r)); }
  { const r = await ev(() => { S.fisc.ym = null; S.realm.granary = 100000; S.forces.push({ name: '敌骑', owner: '西夏', troops: 30000, at: '开封', foe: true }); const g0 = S.realm.granary; S.clock.y++; fiscalMonthly(S); const d = S.realm.granary - g0; S.forces.pop(); S.fisc.ym = null; S.realm.granary = 100000; S.clock.y++; fiscalMonthly(S); return { besieged: d, normal: S.realm.granary - 100000 }; });
    if (!(r.besieged > 0 && r.besieged < r.normal * 0.5)) bad.push('京城被围，本色还照常运进太仓：' + JSON.stringify(r)); }
  // 后勤栏写每月吃多少、够几个月；随军粮不够才给就地征粮
  await setup(1050); await ev(() => { S.forces[0].at = '洛阳'; S.forces[0].grain = 0; S.realm.granary = 0; delete S.forces[0].sup; render(); });
  { const t = await ev(() => document.body.innerText); if (!/每月约吃.*够0个月/.test(t)) bad.push('后勤栏没写每月吃多少、够几个月'); }
  { const r0 = await ev(() => ({ g: S.forces[0].grain, m: S.gov.stats['民心'] }));
    if (await click('[data-logi="forage"][data-f="禁军"]', '就地征粮')) { const r = await ev(() => ({ g: S.forces[0].grain, m: S.gov.stats['民心'], msg: ORGMSG })); if (!(r.g > 0) || !(r.m < r0.m)) bad.push('在自家洛阳就地征粮没得粮或民心没掉：' + JSON.stringify(r)); }
    const g1 = await ev(() => S.forces[0].grain); await ev(() => render()); const el = await p.$('[data-logi="forage"][data-f="禁军"]'); if (el) { await p.click('[data-logi="forage"][data-f="禁军"]'); await p.waitForTimeout(120); }
    if ((await ev(() => S.forces[0].grain)) !== g1) bad.push('一个月里征了两回粮');
    const r2 = await ev(() => { S.clock.m++; const a = S.forces[0].grain; forage(S, '禁军'); return { got: S.forces[0].grain - a, full: Math.round(20000 * 0.5) }; }); if (!(r2.got > 0 && r2.got <= r2.full * 0.5)) bad.push('同一处半年内再征没减半：' + JSON.stringify(r2)); }
  // 敌军远来逃散
  { const r = await ev(() => { S.forces.push({ name: '夏军', owner: '西夏', troops: 40000, at: '洛阳', foe: true, status: '进犯' }); S.logiYM = null; const out = logiMonthly(S); return { t: S.forces.find(f => f.name === '夏军').troops, out }; });
    if (!(r.t < 40000) || !r.out.some(x => /夏军远来/.test(x))) bad.push('西夏兵远来千里不缺粮：' + JSON.stringify(r)); }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
