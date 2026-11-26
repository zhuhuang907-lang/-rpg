// 靖康富商子弟五十回真玩查出的（R-280，2026-11-27 项目主人：「请你确认这种基层作战线和上升授官不崩」）：
// 家当照贯写依据、数目当文记（二百亩田值四千文）；宋代底账米价照邻区内插成一石一百文、一万文；主角小队随大军守城不判成单打（见 r279.js 第十八条）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof buildEstate0 === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    // 一、家当照贯写的依据，本位是文：折成文
    S = newSave({ name: '沈怀远', gender: '男', age: 20, role: '东京绸缎行富商之子', gregorianYear: 1126, month: 1, day: 15, place: '东京开封府', polity: '宋' }); S.chat = [{ role: 'gm', text: '开场' }];
    const R = { unit: '文', cash: 150000, standing: '富商', assets: [{ name: '城郊田产', qty: '200亩', value: 4000, note: '上等良田，每亩约2贯，200亩约400贯' }, { name: '绸缎存货', qty: '约300匹', value: 1500, note: '按每匹约5贯计，300匹约1500贯' }, { name: '宅院', qty: '1座', value: 300000, note: '两进院落，估值300贯' }, { name: '马', qty: '1匹', value: 30000, note: '' }], income: [{ item: '铺面利钱', amount: 50, note: '月入约五十贯' }], expense: [], debts: [] };
    window.callClaude = async () => ({ text: JSON.stringify(R) });
    try { await buildEstate0(S, '开场', ''); } catch (e) { bad.push('立家底出错：' + (e && (e.message || e.code))); }
    const A = Object.fromEntries(arr(S.estate.assets).map(x => [x.name, x.value]));
    if (A['城郊田产'] !== 400000 || A['绸缎存货'] !== 1500000) bad.push('照贯写的家当没折成文：' + JSON.stringify(A));
    if (A['宅院'] !== 300000 || A['马'] !== 30000) bad.push('本来就照文填对的被改了：' + JSON.stringify(A));
    if ((arr(S.estate.income)[0] || {}).amount !== 50000) bad.push('月入照贯写的没折：' + JSON.stringify(S.estate.income));
    // 二、宋代底账米价不再是一石一百文、一万文
    const L = PRESETLIB.filter(R => R.range && R.range[0] <= 1126 && R.range[1] >= 1126).flatMap(R => arr(R.prices)).filter(x => x.from === 1120 && /河南|江南/.test(x.region));
    for (const x of L) if (x.rice < 500 || x.rice > 5000) bad.push('宋末底账米价离谱：' + x.region + ' ' + x.rice);
    if (!L.length) bad.push('宋末底账没查到');
    return bad;
  });
  const bad = out.concat(errs);
  console.log('ERRS', JSON.stringify(bad));
  await b.close();
  if (bad.length) { console.log('!! 不合格'); process.exit(1); }
  console.log('靖康真玩查出的修好');
})();
