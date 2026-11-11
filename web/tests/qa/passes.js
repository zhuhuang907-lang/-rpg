// 关卡与古道（R-192~196）：数据真实齐全、行军走古道变慢写明「循某道」、交战红圈上舆图、新占城金圈、粮道画线断了变红
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const bad = [];
  // 1. 数据完整性（不动 playwright）：坐标在域内、起止年不倒置、无重名、每个大时代都有关
  const T = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../terrain.json'), 'utf8'));
  const P = T.passes || [], C = T.corridors || [];
  if (P.length < 70) bad.push('关卡不该只有 ' + P.length + ' 个');
  const names = new Set();
  for (const p of P) {
    if (!(p.lon > 73 && p.lon < 136 && p.lat > 17 && p.lat < 54)) bad.push('坐标出域：' + p.n);
    if (!(p.from <= p.to)) bad.push('起止年倒置：' + p.n);
    if (names.has(p.n)) bad.push('重名：' + p.n);
    names.add(p.n);
  }
  for (const c of C) { if (!Array.isArray(c.pts) || c.pts.length < 2) bad.push('古道没有折线：' + c.n); if (!(c.slow > 1)) bad.push('古道 slow 该 >1：' + c.n); }
  const cnt = {}; for (const p of P) { const y = p.from < 0 ? -200 : p.from; for (const e of [-200, 200, 600, 1000, 1400, 1800]) if (p.from <= e && p.to >= e) cnt[e] = (cnt[e] || 0) + 1; }
  for (const e of [-200, 200, 600, 1000, 1400, 1800]) if ((cnt[e] || 0) < 15) bad.push(e + '年前后只剩' + (cnt[e] || 0) + '个关，太稀');
  // 2. 页面集成
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof corridorsIn === 'function' && typeof warRoute === 'function' && typeof stratMap === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    // corridorsIn 按年代：1068 有金牛道、崤函道；-300 崤函在；1900 无褒斜（to 1300）
    const y0 = { clock: { y: 1068, m: 3, d: 1 } };
    const cs = corridorsIn(1068).map(c => c.n);
    if (!cs.includes('金牛道') || !cs.includes('崤函道')) bad.push('1068 该有金牛道崤函道：' + cs);
    if (corridorsIn(-300).every(c => c.n !== '崤函道')) bad.push('前300 该有崤函道');
    if (corridorsIn(1900).some(c => c.n === '褒斜道')) bad.push('1900 不该再有褒斜道（to 1300）');
    // corridorOf：汉中到成都一线的点落在金牛道上
    const co = corridorOf({ lon: 105.55, lat: 32.28 }, 1068);
    if (!co || co.n !== '金牛道') bad.push('剑门附近的点该认出金牛道：' + (co && co.n));
    if (corridorOf({ lon: 116.4, lat: 39.9 }, 1068)) bad.push('北京附近不该认出走廊');
    // warRoute：汉中→成都 走金牛道、里程被 slow 拉长、wrTxt 写「循金牛道」；需要 atlas（play.html 内置 core.json + 地形，可以直接算）
    S = newSave({ name: '王二', gender: '男', age: 30, role: '太守', gregorianYear: 1068, month: 3, day: 1, place: '汉中', polity: '北宋' });
    let R = null; try { R = SH(() => warRoute(S, '汉中', '成都', { men: 5000 }), 'warRoute'); } catch (e) { bad.push('warRoute 抛错：' + e.message); }
    if (!R || !R.legs) bad.push('汉中→成都没算出路（atlas 未就绪或地名没定位）');
    else {
      if (!arr(R.corridors).includes('金牛道')) bad.push('该认出金牛道：' + JSON.stringify(R.corridors));
      const t = wrTxt(R); if (!/循\S*道/.test(t)) bad.push('wrTxt 没写循某道：' + t);
      const flat = R.legs.reduce((a, l) => a + l.li, 0);
      if (R.eff <= flat) bad.push('古道 slow 没把有效路程拉长：eff=' + R.eff + ' li=' + flat);
    }
    // routeRisk 写「循某道」
    if (R && R.legs) { const risks = routeRisk(S, R, { troops: 5000 }, '成都'); if (!risks.join('').match(/循\S*道/)) bad.push('routeRisk 没写循某道：' + risks.join('；').slice(0, 80)); }
    // 3. 舆图 SVG：交战红圈、新占城金圈、粮道线
    S.forces = [{ name: '左军', leader: '王二', troops: 3000, at: '汉中', morale: 60, orgNow: 70, grain: 500, status: '驻防' }];
    S.battles = [{ turn: S.turn, when: '熙宁元年三月', place: '汉中', enemy: '叛军', outcome: '胜', deadUs: 100, deadThem: 300, ours: 3000 }];
    S.mapOwn = { 汉中: { owner: '你', turn: S.turn, why: '打下' } };
    S.depots = [{ place: '汉中', grain: 5000, main: true }];
    let svg='',merr=''; try { svg = stratMap(S); } catch (e) { merr = (e && e.message || String(e)).slice(0, 120); }
    if (merr) bad.push('stratMap 抛错：' + merr);
    if (!svg || !/class="battlepulse"/.test(svg)) bad.push('舆图上没有交战脉冲红圈');
    if (!svg.includes('⚔')) bad.push('舆图上没有交战标记');
    if (!svg.includes('e8b021') || !svg.includes('这一回')) bad.push('新占的城没有金圈高亮');
    if (!/粮道：汉中运粮/.test(svg)) bad.push('舆图上没有画粮道线');
    if (!svg.includes('金牛道')) bad.push('舆图上没有画古道走廊');
    return bad;
  });
  console.log('ERRS', JSON.stringify([...errs, ...bad, ...out]));
  await b.close(); process.exit(errs.length || out.length || bad.length ? 1 : 0);
})();
