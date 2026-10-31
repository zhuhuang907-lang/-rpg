// 舆图：真实地形底图、河流（黄河下游按年代走故道）、运河、关隘；开局联网+DS 核定政区（政权—省—府州，本省到县）；
// 相邻州县照地形判通不通（虚线、经关、山路、不通打叉）；地盘、各方着色；点一处出详情和通路；放大到一省见县；就地下军令
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  const SHOT = n => process.env.SHOT ? p.locator('.smap').screenshot({ path: process.env.SHOT + '/' + n + '.png' }).catch(() => {}) : null;
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !BG && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  // 开局后台就把政区查好（政权—省—府州，本省到县）
  await p.waitForFunction(() => S.admin && S.admin.counties && Object.keys(S.admin.counties).length, null, { timeout: 120000 }).catch(() => bad('开局后没去查政区'));
  const ad = await p.evaluate(() => ({ y: S.admin && S.admin.y, n2: S.admin ? S.admin.units.filter(u => u.lv === 2).length : 0, loc: S.admin ? S.admin.units.filter(u => u.lv === 2 && u.lat).length : 0, un: S.admin ? S.admin.units.filter(u => !u.lat).map(u => u.n + '/' + u.p).join() : '', prov: provOfPlace(S, geoCenter(S)), cty: S.admin ? (S.admin.counties['江苏'] || []).map(c => c.n + (c.lat ? '' : '?')).join() : '', yz: (() => { const u = S.admin && S.admin.units.find(u => u.n === '扬州府'); return u ? [u.lon, u.lat] : null; })() }));
  if (ad.n2 < 30 || ad.loc < ad.n2 - 3) bad('政区府州没定好坐标：' + JSON.stringify(ad));
  if (ad.prov !== '江苏') bad('主角所在的省认错：' + ad.prov);
  if (!/江都县,甘泉县/.test(ad.cty) || /\?/.test(ad.cty.split(',').slice(0, 3).join())) bad('本省的县没查到或没坐标：' + ad.cty);
  if (!ad.yz || Math.abs(ad.yz[0] - 119.4) > 0.3 || Math.abs(ad.yz[1] - 32.4) > 0.3) bad('扬州府坐标错（同名地方挑错了）：' + ad.yz);
  // 谭图府、省界：开局就从官方源（测试里是假服务给的假界）下好
  await p.waitForFunction(() => POLY['qing-1820'] || POLY_ERR['qing-1820'], null, { timeout: 60000 }).catch(() => {});
  { const e = await p.evaluate(() => POLY_ERR['qing-1820'] || (POLY['qing-1820'] ? '' : '没下')); if (e) bad('府界没下成：' + e); }
  // 头一回打开舆图：先看自己这一带，到县（府州照真界，名字写在地块上，治所单标）
  const r0 = await p.evaluate(() => { TAB = 'map'; SIDE_FOLD = false; MAPZ.inited = false; render(); const sv = document.querySelector('.smap'); return { m: MAPZ.mode, cty: [...sv.querySelectorAll('rect[data-mapu]')].map(e => e.dataset.mapu), lbl: sv.textContent, poly: [...sv.querySelectorAll('path[data-mapu]')].map(e => e.dataset.mapu), area: [...sv.querySelectorAll('.arealbl')].map(e => e.textContent), views: document.querySelectorAll('[data-mapview]').length }; });
  if (r0.m !== 'near' || r0.cty.length < 12 || !r0.cty.includes('江都县') || !/甘泉|仪征/.test(r0.lbl) || !r0.poly.includes('扬州府') || !r0.area.includes('扬州府') || !r0.views) bad('舆图开头不是本地到县：' + JSON.stringify({ ...r0, lbl: r0.lbl.slice(0, 200) }));
  { const c = await p.evaluate(() => { const sv = document.querySelector('.smap'); const l = sv.querySelector('.cntyline'); return { d: l ? l.getAttribute('d').length : 0, x: /✕/.test(sv.textContent) }; });
    if (c.d < 50) bad('府州里的县与县之间没画虚线：' + JSON.stringify(c)); if (c.x) bad('不通的地方还画了线、打了叉（玩家说不通的不画）'); }
  await SHOT('near0');
  const r = await p.evaluate(() => { TAB = 'map'; SIDE_FOLD = false; MAPZ.inited = true; MAPZ.mode = 'world'; MAPZ.lay.terr = true; /* 地形默认关（照谭图），这里先开着验地形底图（CLAUDE.md 舆图「照谭图的样子画，不留白」） */ render(); const sv = document.querySelector('.smap'); return { tabs: tabsFor(S).map(x => x[0]).join(), img: !!sv.querySelector('image'), dots: sv.querySelectorAll('circle[data-mapu]').length, provs: [...sv.querySelectorAll('[data-mapprov]')].map(x => x.textContent), river: [...sv.querySelectorAll('polyline title')].map(t => t.textContent).join('|'), pass: [...sv.querySelectorAll('title')].filter(t => /^山海关|^潼关|^居庸关/.test(t.textContent)).length, road: sv.querySelectorAll('polyline[stroke-dasharray="4 3"]').length, block: [...sv.querySelectorAll('title')].filter(t => /隔山不通/.test(t.textContent)).length, txt: document.body.innerText }; });
  if (!/map/.test(r.tabs)) bad('没有舆图页');
  if (!r.img) bad('没有地形底图');
  if (r.dots < 30) bad('府州画得太少：' + r.dots);
  if (!r.provs.includes('江苏') || r.provs.some(x => /行省|布政|^(唐|清)$/.test(x))) bad('省名不对：' + r.provs.join());
  if (!/长江/.test(r.river) || !/黄河故道（夺淮）/.test(r.river)) bad('长江或乾隆年间的黄河（夺淮故道）没画：' + r.river.slice(0, 300));
  if (/大运河/.test(r.river) === false) bad('乾隆年间的大运河没画');
  if (r.pass < 2) bad('关隘没画');
  if (r.road < 10) bad('相通的州县没画虚线：' + r.road);
  const lk = await p.evaluate(() => { const L = (a, b) => (linkOf(S, a, b, 1757) || {}).k; return { yj: L({ n: '扬州', lon: 119.43, lat: 32.39 }, { n: '江宁', lon: 118.78, lat: 32.05 }), xh: L({ n: '西安', lon: 108.94, lat: 34.27 }, { n: '汉中', lon: 107.02, lat: 33.07 }), cd: L({ n: '成都', lon: 104.06, lat: 30.67 }, { n: '汉中', lon: 107.02, lat: 33.07 }), hm: L({ n: '加德满都', lon: 85.32, lat: 27.71 }, { n: '日喀则', lon: 88.88, lat: 29.27 }), tw: L({ n: '泉州', lon: 118.59, lat: 24.9 }, { n: '台湾府', lon: 120.2, lat: 23.0 }) }; });
  if (lk.yj !== 'plain' || lk.xh === 'plain' || lk.cd === 'plain' || lk.hm !== 'block' || lk.tw !== 'sea') bad('通路判断不对：' + JSON.stringify(lk));
  const ms = await p.evaluate(() => { MAPC.k = ''; MAPC.links = {}; MAPC.img = {}; const t = performance.now(); render(); return performance.now() - t; });
  if (ms > 2500) bad('画舆图太慢：' + Math.round(ms) + 'ms');
  // 没核定政区时（退回地名库全部州府，两百多处）也不能卡
  const ms2 = await p.evaluate(() => { const A = S.admin; S.admin = null; MAPC.k = ''; MAPC.links = {}; MAPC.img = {}; const t = performance.now(); render(); const r = performance.now() - t; S.admin = A; MAPC.k = ''; render(); return r; });
  if (ms2 > 4000) bad('全国州府时画舆图太慢：' + Math.round(ms2) + 'ms');
  console.log('MS2', Math.round(ms2));
  console.log('MS', Math.round(ms), JSON.stringify(lk));
  if (!/政区：联网查证|政区：照史书推定|政区：谭其骧/.test(r.txt)) bad('没说政区从哪来');
  await SHOT('world');
  // 地盘、各方、兵马、战场
  await p.evaluate(() => { S.idm = 'warlord'; S.territory = [{ place: '扬州府', pop: 500000, troops: 3000, grain: 20000, loyalty: 60 }]; S.powers = [{ name: '两江督标', leader: '尹继善', seat: '江宁府', land: '苏州府、常州府', troops: '2万', stance: '提防' }]; S.forces = [{ name: '扬州营', leader: S.protagonist.name, troops: 3000, at: '扬州府', status: '驻守' }]; S.battles = [{ when: '三月', place: '镇江府', outcome: '小胜' }]; render(); });
  const r2 = await p.evaluate(() => ({ own: document.querySelectorAll('.smap [fill="var(--zhu)"]').length, txt: document.querySelector('.smap').textContent, leg: [...document.querySelectorAll('.mlegend')].map(x => x.innerText).join(' ') }));
  if (r2.own < 1) bad('地盘没着色');
  if (!/扬州营 3,000/.test(r2.txt)) bad('兵马没标出来');
  if (!/⚔/.test(r2.txt) || !/★/.test(r2.txt)) bad('战场、你在哪没标');
  if (!/两江督标/.test(r2.leg) || !/清/.test(r2.leg)) bad('图例不全：' + r2.leg);
  if (!/弘历/.test(r2.leg) || !/◉ 府州治所/.test(r2.leg)) bad('图例里的君主没照史料核、或没标治所：' + r2.leg);
  { const w = await p.evaluate(() => { const sv = document.querySelector('.smap'); return { area: [...sv.querySelectorAll('.arealbl')].map(e => e.textContent), foot: document.body.innerText.includes('CHGIS Version 6') }; }); if (!w.area.includes('扬州府') || !w.foot) bad('天下图上府州名没写在地块上、或没注明府界出处：' + JSON.stringify(w).slice(0, 200)); }
  // 兵马归谁调：你的部将领的也归你调；别家的只能看（CLAUDE.md 兵马）
  { const m = await p.evaluate(() => { const keep = S.forces; S.people['王得禄'] = { role: '把总', tie: '部将', seen: S.turn }; S.forces = keep.concat([{ name: '亲兵营', leader: '王得禄', troops: '800', at: '扬州府' }, { name: '督标', leader: '尹继善', owner: '两江督标', troops: '20000', at: '江宁府' }]);
      const r = { sub: myForce(S, S.forces.find(f => f.name === '亲兵营')), other: myForce(S, S.forces.find(f => f.name === '督标')), go: !!armyAct(S, 'march', { force: '亲兵营', target: '仪征县' }), no: !armyAct(S, 'march', { force: '督标', target: '仪征县' }) };
      S.forces = keep; S.armyPending = []; delete S.people['王得禄']; return r; });
    if (!m.sub || !m.go) bad('部将领的兵调不动：' + JSON.stringify(m)); if (m.other || !m.no) bad('别家的兵也能调：' + JSON.stringify(m)); }
  await p.click('.smap circle[data-mapu="江宁府"]');
  const info = await p.evaluate(() => document.querySelector('.affair').innerText);
  if (!/治所：上元县/.test(info) || !/界址照谭图/.test(info)) bad('点了府州没说治所在哪：' + info.slice(0, 200));
  if (!/江宁府/.test(info) || !/两江督标/.test(info) || !/离你约\d+里/.test(info) || !/通往：/.test(info) || !/海拔/.test(info)) bad('点了没出详情、通路：' + info);
  // 行军：从你所在到这里的路网路线、各档步调天数，图上画出路线；「去这里」把路线和步调写进下一步；主角有自己的印章图标；清代用谭图省府县层
  const rt = await p.evaluate(() => ({ info: document.querySelector('.affair').innerText, pace: document.querySelectorAll('[data-mappace] option').length, line: [...document.querySelectorAll('.smap polyline title')].some(t => /去江宁府/.test(t.textContent)), seal: !!document.querySelector('.smap .mepin'), foot: document.body.innerText.includes('谭其骧') }));
  if (!/取道|约\d+里/.test(rt.info) || !/常行/.test(rt.info) || rt.pace < 2) bad('点了一处没给出路线和步调：' + rt.info.slice(0, 300));
  if (!rt.line) bad('图上没画出路线');
  if (!rt.seal) bad('主角没有自己的图标');
  if (!rt.foot) bad('清代没用谭图的省府县层');
  await p.evaluate(() => { const t = document.querySelector('#said'); if (t) t.value = ''; });
  await p.click('[data-mapgoto]');
  const said = await p.evaluate(() => (document.querySelector('#said') || {}).value || '');
  if (!/动身去江宁府（约\d+里/.test(said)) bad('「去这里」没把路线写进下一步：' + said);
  await p.click('[data-mapgo="攻"]');
  { const ln = await p.evaluate(() => arr(S.armyPending).map(x => x.line).join()); if (!/扬州营进攻江宁府，约\d+里/.test(ln) || !/约\d+日可到/.test(ln)) bad('军令没带路线和步调：' + ln); }
  // 放大到江苏：县、驿道、渡口
  await p.click('.smap [data-mapprov="江苏"]');
  await p.waitForFunction(() => !REG_P, null, { timeout: 60000 }).catch(() => {});
  const r3 = await p.evaluate(() => { render(); const sv = document.querySelector('.smap'); return { m: MAPZ.mode, cty: [...sv.querySelectorAll('rect[data-mapu]')].map(x => x.dataset.mapu), road: [...sv.querySelectorAll('title')].filter(t => /驿道/.test(t.textContent)).length, ferry: /⛴/.test(sv.textContent), back: !!document.querySelector('#bMapWorld') }; });
  if (r3.m !== 'prov' || !r3.back || !r3.cty.includes('江都县') || !r3.cty.includes('上元县')) bad('放大到江苏没见县：' + JSON.stringify(r3).slice(0, 300));
  if (!r3.road || !r3.ferry) bad('驿道、渡口没画：' + JSON.stringify(r3).slice(0, 200));
  await SHOT('prov');
  // 图层开关
  await p.click('[data-maplay="terr"]'); if (await p.evaluate(() => !!document.querySelector('.smap image'))) bad('关了地形还在');
  await p.click('[data-maplay="terr"]');
  await p.click('#bMapWorld'); if ((await p.evaluate(() => MAPZ.mode)) !== 'world') bad('回不到天下');
  // 写戏材料里有政区和此地通路
  const blk = await p.evaluate(() => regimeBlock(S)); if (!/江苏/.test(blk) || !/此地往四邻/.test(blk)) bad('政区、通路没进写戏材料：' + blk.slice(0, 300));
  // 五代十国：逐年查，分政权着色画国界；北宋以前黄河走东汉故道、没有元明清大运河，有通济渠
  await p.evaluate(() => { S.clock.y = 950; S.clock.yearLabel = '后汉乾祐三年'; S.place.polity = '后汉'; render(); });
  await p.waitForFunction(() => S.admin && S.admin.y === 950 && !REG_P, null, { timeout: 120000 }).catch(() => bad('换了年代没重查政区'));
  const q2 = await p.evaluate(() => { render(); const sv = document.querySelector('.smap'); return { leg: [...document.querySelectorAll('.mlegend')].map(x => x.innerText).join(' '), svg: sv.textContent, five: S.admin.regimes.some(r => r.name === '五代'), river: [...sv.querySelectorAll('polyline title')].map(t => t.textContent).join('|') }; });
  for (const n of ['南唐', '吴越', '后蜀', '后汉']) if (!q2.leg.includes(n) || !q2.svg.includes(n)) bad('五代十国没画出' + n);
  if (q2.five) bad('把「五代」当成了一个政权');
  if (!/东汉至北宋/.test(q2.river) || /夺淮/.test(q2.river) || /会通河/.test(q2.river) || !/通济渠/.test(q2.river)) bad('950年的黄河、运河不对：' + q2.river.slice(0, 300));
  // 不是清代的年份也照谭图历代府州界画真界，填色按政权（CLAUDE.md「舆图」）
  await p.waitForFunction(() => TS || TS_ERR, null, { timeout: 60000 }).catch(() => {});
  { const t = await p.evaluate(() => { MAPC.k = ''; render(); const sv = document.querySelector('.smap'), h = sv.querySelector('path[data-mapu="杭州"]'), wy = (((realmsAt(S.clock.y, S.clock.m) || { list: [] }).list.find(r => r.name === '吴越')) || S.admin.regimes.find(r => r.name === '吴越') || {}).col;   /* 分立政权的颜色照内置史料（CLAUDE.md 舆图「每个时期都分政权画」） */ return { err: TS_ERR, h: !!h, fill: h && h.getAttribute('fill'), wy, foot: document.body.innerText.includes('历代府州界') }; });
    if (t.err || !t.h || !t.foot) bad('950年没照谭图历代府州界画：' + JSON.stringify(t)); else if (t.fill !== t.wy) bad('杭州的地块没按吴越着色：' + JSON.stringify(t)); }
  await p.click('.smap circle[data-mapu="杭州"]').catch(() => bad('950年图上没有杭州'));
  if (!/吴越/.test(await p.evaluate(() => (document.querySelector('.affair') || {}).innerText || ''))) bad('点杭州没说归吴越');
  await SHOT('w950');
  const vis = await p.evaluate(() => document.body.innerText); if (/NaN|undefined|\[object/.test(vis)) bad('页面有坏字');
  console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message.slice(0, 300)])); process.exit(1); });
