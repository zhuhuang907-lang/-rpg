// 舆图与皇帝兵马（R-282，2026-11-27 项目主人截图：「义义武镇」「楚楚·荆南南」字叠两层、楚和荆南并成一国、蜀国里写着唐朝的道名、成都府压着国名；
// 明朝同一国两种颜色；「明朝是卫所制，怎么才这么几个兵」）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof jsmapParse === 'function' && typeof realmsAt === 'function');
  const out = await p.evaluate((DBG) => { const process = { env: { DBG } };
    const bad = [];
    // 江山时序把楚、荆南画成一块「楚 · 荆南」：拆回两家
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-';
    const vlq = v => { let z = v < 0 ? ((~v) << 1) | 1 : v << 1, o = ''; do { let c = z & 31; z >>>= 5; if (z) c |= 32; o += A[c]; } while (z); return o; };
    const ring = pts => { let px = 0, py = 0, o = ''; for (const [x, y] of pts) { const X = Math.round(x * 100), Y = Math.round(y * 100); o += vlq(X - px) + vlq(Y - py); px = X; py = Y; } return o; };
    const sq = (x0, y0, x1, y1) => ring([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]);
    const D = { r: [sq(108.5, 24, 115, 31.2), sq(110, 32.5, 120, 38)], f: [{ title: '楚 · 荆南', tint: '#993366', role: 'rival', anchor: [112.9, 28.2], shape: { _p: [0] } }, { title: '后梁', tint: '#c19a5b', role: 'main', anchor: [113.6, 34.8], shape: { _p: [1] } }], d: { s_t: { caption: '测试', polities: [0, 1], regions: [] } } };
    const snap = '(function () {\n  const D = ' + JSON.stringify(D) + ';\n  const rc = 1;\n})();';
    const mapd = 'window.DYNASTY_DATA = ' + JSON.stringify([{ key: 't', title: '五代十国', fromYear: 907, toYear: 960, phases: [{ until: 960, snap: 's_t' }] }]) + ';\nwindow.CORRIDOR_DATA = [];';
    JSMAP = jsmapParse(snap, mapd); MAPC.k = '';
    const R = realmsAt(910, 3);
    if (!R) bad.push('910 年没认出并立各家'); else {
      if (R.list.some(x => /·/.test(x.name) && /楚/.test(x.name))) bad.push('「楚 · 荆南」还当成一国：' + R.list.map(x => x.name).join());
      const cs = R.of(112.98, 28.2), jl = R.of(112.19, 30.35);
      if (!cs || cs.name !== '楚') bad.push('潭州没归楚：' + (cs && cs.name));
      if (!jl || jl.name !== '荆南') bad.push('江陵没归荆南：' + (jl && jl.name));
      if (cs && jl && cs.col === jl.col) bad.push('楚和荆南同一个颜色'); }
    // 天下图：各国名字只写一遍、不互相压着；分立年代不写上一代的道名
    S = newSave({ name: '张三', gender: '男', age: 30, role: '布商', gregorianYear: 910, month: 3, day: 15, place: '成都', polity: '前蜀' });
    S.chat = [{ role: 'gm', text: '开场' }]; VIEW = 'game'; TAB = 'map'; SIDE_FOLD = false; MAPZ.inited = true; MAPZ.mode = 'world'; MAPC.k = ''; render0();
    const sv = document.querySelector('.smap');
    if (!sv) bad.push('舆图没画出来'); else {
      const T = [...sv.querySelectorAll('text[font-weight="700"]')].filter(e => !e.closest('g[data-mapu]') && e.getAttribute('font-size') >= 13);
      const cnt = {}; for (const e of T) cnt[e.textContent] = (cnt[e.textContent] || 0) + 1;
      const dup = Object.entries(cnt).filter(([n, k]) => k > 1 && n.length > 0); if (dup.length) bad.push('天下图上国名写了两遍（叠影）：' + dup.map(x => x.join('×')).join('、'));
      const BB = T.map(e => [e.textContent + (process.env.DBG ? '{' + e.getAttribute('font-size') + ',' + e.getAttribute('fill-opacity') + ',' + e.getAttribute('x') + '}' : ''), e.getBBox()]); const ov = [];
      for (let i = 0; i < BB.length; i++) for (let j = i + 1; j < BB.length; j++) { const [a, A1] = BB[i], [c, B1] = BB[j]; const w = Math.min(A1.x + A1.width, B1.x + B1.width) - Math.max(A1.x, B1.x), h = Math.min(A1.y + A1.height, B1.y + B1.height) - Math.max(A1.y, B1.y); if (w > 4 && h > 4) ov.push(a + '/' + c + (process.env.DBG ? JSON.stringify([A1, B1].map(q => [q.x, q.y, q.width, q.height].map(Math.round))) : '')); }
      if (ov.length) bad.push('国名、镇名互相压着：' + ov.slice(0, 6).join('、'));
      const prov = [...sv.querySelectorAll('[data-mapprov]')].map(e => e.textContent).filter(t => /道$/.test(t)); if (prov.length) bad.push('五代天下图还写着唐朝的道名：' + prov.join('、')); }
    JSMAP = null; MAPC.k = '';
    // 明朝皇帝：国土照本国一色画，不单挑十几个府另涂；兵马照卫所制
    S = newSave({ name: '朱厚熜', gender: '男', age: 15, role: '皇帝', gregorianYear: 1521, month: 4, day: 22, place: '北京', polity: '明', real: true }); S.idm = 'emperor';
    S.admin = Object.assign(S.admin || {}, { regimes: [{ name: '明', col: '#c19a5b' }, { name: '北元（鞑靼）', col: '#557799' }] });
    S.territory = [{ place: '大同府', pop: 500000, troops: 30000 }, { place: '西安府', pop: 900000, troops: 20000 }];
    const own = mapOwners(S); if ([...own.values()].some(o => o.who === '你')) bad.push('皇帝挑出来的几个府另涂了「你的地盘」色，一国两色');
    if (ownPaint(S)) bad.push('皇帝的国土还单涂');
    { const W = newSave({ name: '某甲', gender: '男', age: 40, role: '割据一方的军阀', gregorianYear: 1640, month: 1, day: 1, place: '襄阳', polity: '明' }); W.idm = 'warlord'; W.territory = [{ place: '襄阳府' }]; if (!ownPaint(W)) bad.push('割据的地盘不涂了（该涂）'); }
    S.realm = { treasury: 1000000, revenue: 4000000, army: 150000 }; S.forces = [['宣大军', 30000, '大同'], ['蓟镇军', 30000, '蓟州'], ['辽东军', 60000, '辽阳'], ['陕西边军', 30000, '固原']].map(([n, t, a]) => ({ name: n, leader: '某', troops: t, at: a, status: '驻守' }));
    const EA = empArmy(1521); if (!EA || !/卫所/.test(EA.sys) || !/九边/.test(EA.sys)) bad.push('明朝兵制没写卫所、九边');
    if (!dataDoubts(S).some(x => /兵制/.test(x))) bad.push('明朝皇帝只有十五万兵没报不合兵制：' + JSON.stringify(dataDoubts(S)));
    if (!realmGap(S)) bad.push('旧存档明朝皇帝只有几支兵，不重立国势');
    S.realm.milSys = 3; if (realmGap(S) && arr(S.forces).some(f => myForce(S, f))) bad.push('照兵制立过一次了还反复重立');
    if (!/卫所/.test(String(buildRealm).match(/empArmy\(y\)\.sys/) ? EA.sys : '')) bad.push('立国势的要求里没带本朝兵制');
    return bad;
  }, process.env.DBG || '');
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
