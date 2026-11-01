// 每个时期都分政权画（CLAUDE.md 舆图「每个时期都要分政权画」）：五代十国长安一带不空、各国和中原王朝不同色；DeepSeek 把十国并成一家也照内置史料分开；各时期要紧城池归对政权
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof mapUnits === 'function' && typeof realmsAt === 'function');
  const out = await p.evaluate(() => {
    const bad = [], C = { 长安: [108.94, 34.27], 洛阳: [112.45, 34.62], 开封: [114.35, 34.79], 太原: [112.55, 37.87], 幽州: [116.4, 39.9], 成都: [104.07, 30.66], 江陵: [112.19, 30.35], 扬州: [119.44, 32.39], 南京: [118.78, 32.05], 杭州: [120.17, 30.29], 福州: [119.3, 26.08], 长沙: [112.98, 28.2], 广州: [113.26, 23.13], 襄阳: [112.15, 32.03], 汉中: [107.03, 33.07], 昆明: [102.71, 25.05] };
    const want = {
      230: { 洛阳: '魏', 成都: '蜀汉', 南京: '吴', 广州: '吴', 襄阳: '魏', 汉中: '蜀汉' },
      400: { 长安: '后秦', 太原: '北魏', 南京: '东晋', 成都: '东晋' },
      560: { 长安: '北周', 洛阳: '北齐', 南京: '陈', 江陵: '后梁（西梁）', 成都: '北周' },
      934: { 长安: '后唐', 洛阳: '后唐', 太原: '后唐', 成都: '后蜀', 江陵: '荆南', 扬州: '吴', 杭州: '吴越', 福州: '闽', 长沙: '楚', 广州: '南汉', 昆明: '大义宁' },
      955: { 长安: '后周', 太原: '北汉', 幽州: '辽', 成都: '后蜀', 南京: '南唐', 杭州: '吴越', 广州: '南汉', 长沙: '武平军（周行逢）' },
      1100: { 开封: '宋', 幽州: '辽', 昆明: '大理' },
      1150: { 开封: '金', 杭州: '南宋', 成都: '南宋', 昆明: '大理' },
      1360: { 南京: '朱元璋', 成都: '夏（明玉珍）', 长沙: '汉（陈友谅）', 幽州: '元' },
      1675: { 昆明: '周（吴三桂）', 福州: '靖南王耿精忠', 幽州: '清' },
      1855: { 南京: '太平天国', 幽州: '清' }
    };
    for (const [y, W] of Object.entries(want)) { const R = realmsAt(+y, 6); if (!R) { bad.push(y + '年没认出是分立年代'); continue; }
      for (const [k, n] of Object.entries(W)) { const v = R.of(C[k][0], C[k][1]); if (!v || v.name !== n) bad.push(`${y}年${k}应归${n}，图上归${v ? v.name : '没人'}`); }
      const cols = R.list.map(x => x.col); if (new Set(cols).size !== cols.length) bad.push(y + '年并立的政权有撞色'); }
    // 934：长安一带的州府都画出来、都上了色；和吴越、南唐那些不同色
    const mk = (y, extra) => Object.assign(newSave({ name: '冯道', gender: '男', age: 53, role: '后唐宰相', real: true, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '后唐' }), extra || {});
    let s = mk(934), M = mapUnits(s);
    const near = M.L2.filter(u => Math.abs(u.lon - 108.94) < 1.2 && Math.abs(u.lat - 34.27) < 1);
    if (near.length < 3) bad.push('934 年长安一带的州府没画出来：' + near.map(u => u.n)); if (near.some(u => !M.reg(u))) bad.push('934 年长安一带有州府没上色');
    const col = n => (M.A.regimes.find(r => r.name === n) || {}).col; if (!col('后唐') || col('后唐') === col('吴越') || col('后唐') === col('吴')) bad.push('中原王朝和十国同色');
    const share = M.L2.filter(u => M.reg(u)).length / M.L2.length; if (share < 0.9) bad.push(`934 年只有 ${Math.round(share * 100)}% 的州府上了色`);
    // DeepSeek 把十国并成一家（split:false、只报后唐几个州）：照样照内置史料分开、底子照样有全部州府
    s = mk(934, { admin: { y: 934, pol: '后唐', split: false, at: 1, regimes: [{ name: '后唐', col: '#c0504d' }], units: [{ lv: 2, n: '河南府', r: '后唐', lon: 112.38, lat: 34.67 }, { lv: 2, n: '杭州', r: '后唐', lon: 120.17, lat: 30.29 }], counties: {} } });
    M = mapUnits(s); const hz = M.L2.find(u => u.n === '杭州');
    if (!M.builtin || !hz || (M.reg(hz) || {}).name !== '吴越') bad.push('DeepSeek 把吴越并进后唐，图上就跟着错');
    if (M.L2.length < 150) bad.push('DeepSeek 只报了两个州，图上就只有两个州：' + M.L2.length);
    // 贞明七年（921）的图（CLAUDE.md 舆图「唐五代的州府要齐、称号用当年的」；2026-11-01 玩家：「错误太多……没有涂色的地方……行政单位表达是错误的」）
    { const s9 = mk(921, { protagonist: { name: '王审知', gender: '男', age: 59, role: '闽王' }, place: { full: '福州', polity: '闽' } }); s9.place.polity = '闽'; MAPZ.mode = 'world'; const M9 = mapUnits(s9), nm = new Set(M9.L2.map(u => u.n)), of = n => { const u = M9.L2.find(x => x.n === n); return u ? (M9.reg(u) || {}).name || '没人' : '图上没有'; };
      for (const n of ['开封府', '宋州', '青州', '齐州', '曹州', '幽州', '代州', '云州', '相州', '梓州', '夔州', '阆州', '润州', '虔州', '蔡州', '赵州', '滑州']) if (!nm.has(n)) bad.push('921 年图上没有' + n);
      for (const n of ['宣化府', '大兴府', '保安州', '平阳府', '南阳府', '庆远府', '兖州府', '汴州', '豫州', '雍州', '岐州', '黔州督护府']) if (nm.has(n)) bad.push('921 年图上出现了当时没有的「' + n + '」');
      const W9 = { 开封府: '后梁', 青州: '后梁', 滑州: '后梁', 房州: '后梁', 太原府: '晋', 幽州: '晋', 凤翔府: '岐', 成都府: '前蜀', 夔州: '前蜀', 江陵府: '荆南', 潭州: '楚', 桂州: '楚', 广州: '南汉', 福州: '闽', 泉州: '闽', 杭州: '吴越', 江都府: '吴', 润州: '吴', 虔州: '吴', 镇州: '赵（王镕）', 定州: '北平王（王处直）', 夏州: '定难军（党项拓跋氏）', 灵州: '朔方军（韩逊）' };
      for (const [n, r] of Object.entries(W9)) if (of(n) !== r) bad.push(`921 年${n}应归${r}，图上是${of(n)}`);
      const none = M9.L2.filter(u => !M9.reg(u)).map(u => u.n); if (none.length) bad.push('921 年有州府没上色：' + none.join('、'));
      const R9 = realmsAt(921, 6), rr = n => regRuler(s9, R9.list.find(x => x.name === n));
      for (const [n, k] of [['吴', '杨溥（吴王）'], ['楚', '马殷（楚王）'], ['闽', '王审知（闽王）'], ['吴越', '钱镠（吴越王）'], ['后梁', '朱友贞（梁帝）'], ['晋', '李存勖（晋王）'], ['岐', '李茂贞（岐王）'], ['荆南', '高季昌（荆南节度使、渤海王）']]) if (rr(n) !== k) bad.push(`921 年${n}的君主应写「${k}」，写成「${rr(n)}」`);
      if (R9.list.some(x => /睿帝|武穆|太祖|高祖|末帝/.test(rr(x.name)))) bad.push('921 年君主写成了死后的庙号谥号');
      const C9 = Object.fromEntries(R9.list.map(x => [x.name, x.col])), dist = (a, b) => { const h = x => [1, 3, 5].map(k => parseInt(x.slice(k, k + 2), 16)); const A = h(a), B = h(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
      for (const [a, b] of [['吴', '楚'], ['吴', '吴越'], ['楚', '南汉'], ['闽', '吴越'], ['闽', '吴'], ['后梁', '晋'], ['前蜀', '岐'], ['南汉', '静海军（交州）']]) if (dist(C9[a], C9[b]) < 90) bad.push(`921 年${a}和${b}挨着、颜色太像（${C9[a]} ${C9[b]}）`); }
    MAPZ.mode = 'prov';
    // 照谭图的样子：地形默认关；放大到本地也没有空白（离治所远的铺外境浅色）
    if (MAPZ.lay.terr !== false) bad.push('地形默认开着，山影盖住颜色（谭图不打山影）');
    { S = mk(934); MAPZ.inited = false; MAPC.k = ''; const h = mapTab(S); if (!/#d9cfb4|<rect/.test(h)) bad.push('放大图没有铺底'); }
    // 统一年代照旧（不当成分立）
    { const R = realmsAt(1750, 6); /* 周边各族也画（CLAUDE.md 舆图「周边各族也画、也能玩」）：乾隆十五年内地归清，准噶尔在西北 */ if (!R || (R.of(118.78, 32.05) || {}).name !== '清' || (R.of(87.6, 43.8) || {}).name !== '准噶尔') bad.push('乾隆十五年内地不归清、或准噶尔没画'); }
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
