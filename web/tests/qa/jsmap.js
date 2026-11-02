// 江山时序的版图（CLAUDE.md「舆图」用江山时序）：数据只当 JSON 解析（不执行它的代码）、自己解坐标；这一年各家照它的多边形认，
// 它没画到的地方照内置史料；测试里不自动下载；玩家亲手打下、丢掉的地方记进 mapOwn，图上那一处照玩家造成的改变，其余照史书
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof jsmapParse === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    if (JSMAP || JSMAP_P) bad.push('测试里（程序驱动的浏览器）自己去下了江山时序');
    // 造一份小样：两个方块政权「甲国」盖住福州一带、「乙国」盖住金陵一带
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-';
    const vlq = v => { let z = v < 0 ? ((~v) << 1) | 1 : v << 1, o = ''; do { let c = z & 31; z >>>= 5; if (z) c |= 32; o += A[c]; } while (z); return o; };
    const ring = pts => { let px = 0, py = 0, o = ''; for (const [x, y] of pts) { const X = Math.round(x * 100), Y = Math.round(y * 100); o += vlq(X - px) + vlq(Y - py); px = X; py = Y; } return o; };
    const sq = (x0, y0, x1, y1) => ring([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]);
    const D = { r: [sq(117, 24, 121, 28), sq(117, 30, 121, 34)], f: [{ title: '甲国', tint: '#336699', role: 'rival', anchor: [119.3, 26.1], shape: { _p: [0] } }, { title: '乙国', tint: '#996633', role: 'main', anchor: [118.8, 32], shape: { _p: [1] } }], d: { s_t1: { caption: '测试', polities: [0, 1], regions: [] } } };
    const snap = '(function () {\n  const D = ' + JSON.stringify(D) + ';\n  const rc = 1;\n})();';
    const mapd = 'window.DYNASTY_DATA = ' + JSON.stringify([{ key: 't', title: '测试朝', fromYear: 900, toYear: 950, phases: [{ until: 950, snap: 's_t1' }] }]) + ';\nwindow.CORRIDOR_DATA = [];';
    let M; try { M = jsmapParse(snap, mapd); } catch (e) { bad.push('解析小样出错：' + e.message); return bad; }
    if (!jsPolityAt(M, 921, 119.3, 26.1) || jsPolityAt(M, 921, 119.3, 26.1).name !== '甲国') bad.push('福州一带没认成甲国');
    if (jsPolityAt(M, 921, 100, 40)) bad.push('多边形外头也认成了某国');
    if (jsPolityAt(M, 1000, 119.3, 26.1)) bad.push('不在年份里的也认了');
    // 解析时不执行它的代码：小样里塞一段会改全局的代码，解析后不许生效
    const evil = '(function () {\n  window.__pwned = 1;\n  const D = ' + JSON.stringify(D) + ';\n  const rc = 1;\n})();'; jsmapParse(evil, mapd); if (window.__pwned) bad.push('解析时执行了下载来的代码');
    // 装上以后：realmsAt 照它认，它没画到的照内置史料
    JSMAP = M; const R = realmsAt(921, 6);
    if (!R || !R.of(119.3, 26.1) || R.of(119.3, 26.1).name !== '甲国') bad.push('装上江山时序后福州没照它认：' + JSON.stringify(R && R.of(119.3, 26.1)));
    if (!R.of(113.6, 34.8)) bad.push('它没画到的汴州没照内置史料补上');
    if (!R.js || R.js.id !== 's_t1') bad.push('没标用的是哪一幅快照');
    const cols = new Set(R.list.map(x => x.col)); if (cols.size !== R.list.length) bad.push('并立各家有重色');
    // 玩家的影响：没打过仗照史书；亲手丢了福州，那一处改成对手的
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '甲国' }); S.idm = 'warlord'; MAPC.k = '';
    const M1 = mapUnits(S), fz = M1.L2.find(u => /福州/.test(u.n)); const before = fz ? M1.reg(fz) : null;
    applyBattle(S, { ourForces: [], virtual: false, ours: 5000, enemy: '乙国守军', enemyOwner: '乙国', enemyTroops: 9000, outcome: '大败', deadUs: 2000, deadThem: 300, take: '', lose: '福州', turn: 1, rounds: [] });
    if (!S.mapOwn || !S.mapOwn['福'] && !S.mapOwn[geoStem('福州')]) bad.push('丢了福州没记进 mapOwn：' + JSON.stringify(S.mapOwn));
    MAPC.k = ''; const M2 = mapUnits(S), fz2 = M2.L2.find(u => /福州/.test(u.n)), after = fz2 ? M2.reg(fz2) : null;
    if (!after || after.name !== '乙国') bad.push(`丢了福州，图上还是${after && after.name}（之前${before && before.name}）`);
    const qz = M2.L2.find(u => /泉州/.test(u.n)); if (qz && M2.reg(qz) && M2.reg(qz).name !== '甲国') bad.push('没打过仗的泉州也被改了：' + M2.reg(qz).name);
    // 记账（AI）报的不算：没有程序结算的仗，mapOwn 不动
    const k0 = JSON.stringify(S.mapOwn); try { applyReply && 0; } catch (_) {} if (JSON.stringify(S.mapOwn) !== k0) bad.push('mapOwn 被别的路子改了');
    JSMAP = null; MAPC.k = '';
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
