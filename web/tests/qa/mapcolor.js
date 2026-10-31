// 舆图着色（CLAUDE.md「舆图」势力各自着色；2026-10-30 玩家：「染色也是完全失灵」）：
// 清代用谭图真界时，同一年有好几家政权（南明、三藩、太平天国）也要照政权上色；你的地盘上色；
// 别家的地盘写到省一级的照省上色；起义、聚众据地的画，商帮、派系不画
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof stratMap === 'function' && typeof mapUnits === 'function');
  const out = await p.evaluate(() => {
    const bad = [], mk = o => Object.assign({ id: 'm', v: 2, turn: 3, title: 't', protagonist: { name: '甲', role: '江宁的商人', age: 30 }, idm: 'commoner', clock: { y: 1855, m: 3, d: 1, yearLabel: '咸丰五年' }, place: { full: '江宁府上元县', polity: '清' }, people: {}, household: [], chat: [], powers: [], territory: [], forces: [], world: { events: [], upcoming: [] } }, o);
    if (!eraLayer(mk({}))) { bad.push('清代谭图真界没载进来，测不了'); return bad; }
    const EL = eraLayer(mk({})), at = n => EL.L2.find(u => u.n === n);
    const jn = at('江宁府'), sz = at('苏州府'), xy = at('襄阳府'), wc = at('武昌府');
    if (!jn || !sz) { bad.push('谭图里找不到江宁府、苏州府'); return bad; }
    // 1 两家政权：江宁归太平天国、苏州归清
    S = mk({ admin: { y: 1855, pol: '清', split: true, at: 1, regimes: [{ name: '清', col: '#c0504d' }, { name: '太平天国', col: '#3b6fb5' }], units: [{ lv: 2, n: '江宁府', r: '太平天国', lon: jn.lon, lat: jn.lat }, { lv: 2, n: '苏州府', r: '清', lon: sz.lon, lat: sz.lat }], counties: {} } });
    MAPZ.mode = 'world'; const M = mapUnits(S);
    const r1 = M.reg(jn), r2 = M.reg(sz);
    if (!r1 || r1.name !== '太平天国' || !r2 || r2.name !== '清') bad.push('谭图真界下好几家政权时，府州没认出归哪家：' + JSON.stringify([r1 && r1.name, r2 && r2.name]));
    let html = ''; try { html = stratMap(S); } catch (e) { bad.push('画图报错 ' + e.message); }
    { const tc = ((realmsAt(1855, S.clock.m) || { list: [] }).list.find(x => x.name === '太平天国') || {}).col || '#3b6fb5'; if (!html.includes(tc)) bad.push('太平天国的颜色没画上'); }   /* 2026-10-31 起分立政权的颜色照内置史料定（CLAUDE.md 舆图「每个时期都要分政权画」） */
    // 2 你的地盘：真颜色，不是 CSS 变量
    S = mk({ idm: 'warlord', protagonist: { name: '甲', role: '据有襄阳的军头' }, territory: [{ place: '襄阳府' }], forces: [{ name: '甲军', leader: '甲', troops: 5000 }] });
    try { html = stratMap(S); } catch (e) { bad.push('画图报错 ' + e.message); }
    if (!html.includes('fill="var(--zhu)"')) bad.push('你的地盘没上色');
    // 3 别家地盘写到省一级的：那一省的府州都上色；起义的画，商帮不画
    S = mk({ powers: [{ name: '白莲教众', leader: '王聪儿', seat: '襄阳', land: '湖北' }, { name: '盐商公所', leader: '江春', seat: '扬州', land: '扬州' }] });
    if (!powerLand(S, S.powers[0])) bad.push('聚众据地的白莲教众没画'); if (powerLand(S, S.powers[1])) bad.push('商帮也当成地盘画了'); if (powerLand(S, { name: '两江督标', seat: '江宁府', land: '苏州府' })) bad.push('官军营伍（督标）也当成地盘画了');
    const own3 = mapOwners(S); const M3 = mapUnits(S); const ownOf = u => own3.get(geoStem(u.n)) || (u.p && own3.get(geoStem(u.p))) || null;
    if (wc && !ownOf(wc)) bad.push('地盘写「湖北」，武昌府没上色');
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
