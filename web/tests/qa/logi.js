// 后勤与地盘染色（需求台账 R-155；2026-11-08 玩家：「那地盘和后勤呢，有染色吗，有整个后勤系统吗，类似钢铁雄心和骑马与砍杀」）
// 全真点：军务页后勤栏（太仓、修转运仓、从太仓调粮、征发民夫）；粮沿路网运、路远耗多、敌军截在路上就断；每月从仓里扣粮；图上画仓、兵牌补给圆点；地盘大的整片罩色；敌军粮道被截
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof logiHtml === 'function');
  const bad = [], ev = f => p.evaluate(f), click = async (sel, what) => { const el = await p.$(sel); if (!el) { bad.push('没有「' + what + '」按钮'); return false; } await p.click(sel); await p.waitForTimeout(120); return true; };
  await ev(() => { S = newSave({ name: '李世民', gender: '男', age: 30, role: '皇帝', real: true, gregorianYear: 630, month: 6, day: 1, place: '长安', polity: '唐' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.realm = { capital: '长安', granary: 500000, treasury: 5000000 }; S.money = { cash: 0, unit: '贯' }; S.prices = [{ item: '米', price: 0.5, per: '石' }]; S.territory = [{ place: '长安' }, { place: '洛阳' }, { place: '华州' }, { place: '成都' }];
    S.forces = [{ name: '左卫军', owner: '你', leader: '李靖', troops: 10000, quality: '中', at: '长安', status: '驻扎', morale: 70, grain: 0 }, { name: '剑南军', owner: '你', leader: '', troops: 8000, quality: '中', at: '成都', status: '驻扎', morale: 70, grain: 0 }];
    VIEW = 'game'; TAB = 'army'; SIDE_FOLD = false; render(); });
  if (!/后勤/.test(await ev(() => document.body.innerText))) bad.push('军务页没有后勤栏');
  // 远近：京城边上的不耗，成都要走蜀道、耗得多、补给差
  { const r = await ev(() => { const a = supCalc(S, S.forces[0]), c = supCalc(S, S.forces[1]); return { a, c }; });
    if (!r.a || r.a.k !== 1 || r.a.loss !== 0) bad.push('京城边上的兵马补给不满：' + JSON.stringify(r.a)); if (!r.c || !(r.c.loss > 0.2) || !(r.c.k < 0.8)) bad.push('成都离太仓走蜀道，运粮没耗、补给没变差：' + JSON.stringify(r.c)); }
  // 修转运仓（真点）、从太仓调粮（真点）
  await ev(() => { const sel = document.querySelector('#depPlace'); if (sel) { if (sel.tagName === 'SELECT' && ![...sel.options].some(o => o.value === '成都')) sel.add(new Option('成都', '成都')); sel.value = '成都'; } });
  if (await click('[data-logi="build"]:not([data-place])', '修转运仓')) { const r = await ev(() => ({ d: arr(S.depots), t: S.realm.treasury })); if (!r.d.some(d => d.place === '成都' && d.lv === 1) || !(r.t < 5000000)) bad.push('修转运仓没修成或没花钱：' + JSON.stringify(r)); }
  await p.fill('[data-shipn="成都"]', '50000').catch(() => bad.push('成都仓没有调粮的输入框'));
  if (await click('[data-logi="ship"][data-place="成都"]', '从太仓调粮')) { const r = await ev(() => ({ g: (S.depots.find(d => d.place === '成都') || {}).grain, t: S.realm.granary })); if (!(r.g > 0) || !(r.t <= 450000) || !(r.g < 50000)) bad.push('从太仓调粮没进仓、或路上没耗：' + JSON.stringify(r)); }
  { const r = await ev(() => { delete S.forces[1].sup; return supCalc(S, S.forces[1]); }); if (!r || r.from !== '成都' || r.k !== 1) bad.push('成都修了仓、存了粮，剑南军还从远处运：' + JSON.stringify(r)); }
  // 每月从仓里扣粮
  { const r = await ev(() => { const g0 = S.depots.find(d => d.place === '成都').grain; armyMonthly(S, 1); return { g0, g1: S.depots.find(d => d.place === '成都').grain }; }); if (!(r.g1 < r.g0)) bad.push('一个月过去成都仓的粮没扣：' + JSON.stringify(r)); }
  // 敌军截在路上：粮道断
  { const r = await ev(() => { S.forces.push({ name: '郑军', owner: '郑', troops: 20000, at: '潼关', foe: true, status: '驻守' }); S.forces.push({ name: '东征军', owner: '你', troops: 5000, at: '洛阳', status: '驻扎', morale: 70, grain: 0 }); const f = S.forces.find(x => x.name === '东征军'); const sp = supCalc(S, f), sl = supplyLine(S, f); const out = armyMonthly(S, 1); return { sp, sl, out: out.join('；') }; });
    if (!r.sp || !r.sp.cut || !/郑军/.test(r.sp.foe)) bad.push('潼关有敌军，长安往洛阳的粮道没断：' + JSON.stringify(r.sp)); if (!(r.sl.k < 0.6)) bad.push('粮道断了打仗补给没打折：' + JSON.stringify(r.sl)); if (!/东征军.*断/.test(r.out)) bad.push('粮道断了月报没写东征军断粮：' + r.out.slice(0, 300)); }
  // 征发民夫（真点）：路耗减
  { await ev(() => { TAB = 'army'; render(); }); const l0 = await ev(() => { delete S.forces[1].sup; S.depots = []; return supCalc(S, S.forces[1]).loss; });
    if (await click('[data-logi="porter"]', '征发民夫')) { const r = await ev(() => { delete S.forces[1].sup; return { till: S.porterTill, l: supCalc(S, S.forces[1]).loss }; }); if (r.till == null || !(r.l < l0)) bad.push('征发民夫路耗没减：' + JSON.stringify({ l0, r })); } }
  // 图上：仓、补给圆点
  { const r = await ev(() => { S.depots = [{ place: '成都', lv: 1, grain: 20000 }]; for (const f of S.forces) delete f.sup; TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 106, lat: 32 }; MAPZ.span = 5; MAPC.k = ''; render(); const sv = document.querySelector('.smap'); return { dep: sv.querySelectorAll('g.depot').length, dot: sv.querySelectorAll('circle.supdot').length }; });
    if (r.dep < 2) bad.push('图上没画仓（太仓、成都仓）：' + r.dep); if (r.dot < 1) bad.push('图上兵牌没有补给圆点'); }
  // 地盘大的整片罩色（崇祯）
  { const r = await ev(() => { S = newSave({ name: '朱由检', gender: '男', age: 30, role: '皇帝', real: true, gregorianYear: 1640, month: 6, day: 1, place: '北京', polity: '明' }); S.chat = [{ role: 'gm', text: '开场' }]; VIEW = 'game'; TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'world'; MAPC.k = ''; render(); const sv = document.querySelector('.smap'); return { fill: sv.querySelectorAll('.domfill path').length, line: sv.querySelectorAll('.domline').length, dom: domainSet(S, mapUnits(S)).set.size }; });
    if (r.dom > 15 && !r.fill && !r.line) bad.push('一方之主地盘大，图上看不出哪是你的：' + JSON.stringify(r)); }
  // 敌军粮道也会被截
  { const r = await ev(() => { S = newSave({ name: '李世民', gender: '男', age: 30, role: '皇帝', real: true, gregorianYear: 630, month: 6, day: 1, place: '长安', polity: '唐' }); S.wars = [{ with: '郑', state: '交战', since: 1, won: 0, lost: 0, took: [] }];
      S.forces = [{ name: '左卫军', owner: '你', troops: 3000, at: '陕州', status: '驻扎' }, { name: '郑军', owner: '郑', troops: 5000, at: '洛阳', status: '行军', foe: true, march: { from: '洛阳', to: '长安', li: 800, done: 0, pace: 35 } }];
      let n = []; for (let i = 0; i < 6; i++) n = n.concat(foeMarchTick(S, 4)); const g = S.forces.find(x => x.name === '郑军'); return { cut: g.cutTill, n: n.join('；') }; });
    if (r.cut == null) bad.push('我军截在敌军身后，敌军粮道没断：' + r.n.slice(0, 200)); }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
