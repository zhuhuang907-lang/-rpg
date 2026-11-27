// 新舆图（R-283，2026-11-27 项目主人：「能不能用好点的地图工具啊，你自己接入好吗」）：开源引擎 MapLibre GL，名字自动避让；
// 一国一色（R-058）：藩镇、州路随本国一色；真点「换新图」→ 引擎从本地 vendor 载进来、画出各国各州；国名、州名不重复；点图选中府州、详情出来；放大按钮、大图按钮能用；再点换回旧图
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof glMount === 'function');
  { const c = await p.evaluate(() => { const R = realmsAt(910, 3); const subs = R.list.filter(x => x.parent && x.kind && x.kind !== '附'); const bad2 = subs.filter(x => { const pr = R.list.find(y => y.name === x.parent); return pr && pr.col !== x.col; }).map(x => x.name); return { n: subs.length, bad2 }; }); if (c.bad2.length) bad('本国里的藩镇、州路另一种颜色（一国两色）：' + c.bad2.join('、')); }
  await p.evaluate(() => { localStorage.clear(); S = newSave({ name: '张三', gender: '男', age: 30, role: '布商', gregorianYear: 910, month: 3, day: 15, place: '成都', polity: '前蜀' }); S.chat = [{ role: 'gm', text: '开场' }]; VIEW = 'game'; TAB = 'map'; SIDE_FOLD = false; MAPZ.inited = true; MAPZ.mode = 'world'; SETTINGS.mapgl = false; render0(); });
  if (!(await p.$('svg.smap'))) bad('默认没画旧图');
  const gb = await p.$('[data-mapgl]'); if (!gb) { bad('没有「换新图」按钮'); } else {
    await gb.click();
    try { await p.waitForFunction(() => GLMAP && GLMAP.loaded() && GLKEY, null, { timeout: 60000 }); } catch (_) { bad('点了新图，引擎没载进来或没画出来：' + await p.evaluate(() => GLERR + '|' + !!window.maplibregl)); }
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => { const q = l => GLMAP.queryRenderedFeatures({ layers: [l] }).map(f => f.properties.t); return { svg: !!document.querySelector('svg.smap'), slot: !!document.getElementById('glSlot'), realm: q('realmlbl'), city: q('citylbl'), set: SETTINGS.mapgl, src: !!document.querySelector('script[src*="vendor/maplibre"]') }; });
    if (r.svg || !r.slot) bad('点了新图还是旧图：' + JSON.stringify({ svg: r.svg, slot: r.slot }));
    if (!r.src) bad('引擎不是从本地 vendor 载的（桌面版离线用不了）');
    if (!r.realm.includes('前蜀') || !r.realm.includes('后梁')) bad('新图上没写前蜀、后梁：' + r.realm.join('、'));
    const dupR = r.realm.filter((t, i) => r.realm.indexOf(t) !== i); if (dupR.length) bad('新图国名写了两遍：' + dupR.join('、'));
    // 放大到州一级：州名出来、不重名
    await p.evaluate(() => GLMAP.jumpTo({ zoom: 5.4, center: [105, 30.5] })); await p.waitForTimeout(2500);
    const c = await p.evaluate(() => GLMAP.queryRenderedFeatures({ layers: ['citylbl'] }).map(f => f.properties.t));
    if (!c.length) bad('放大了州府名没出来'); { const d = c.filter((t, i) => c.indexOf(t) !== i); if (d.length) bad('州府名写了两遍：' + [...new Set(d)].join('、')); }
    // 真点图上成都一带：选中一个府州，详情出来
    const pt = await p.evaluate(() => { const q = GLMAP.project([104.07, 30.67]), r = GLMAP.getCanvas().getBoundingClientRect(); return { x: r.left + q.x, y: r.top + q.y }; });
    await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(800);
    const sel = await p.evaluate(() => ({ sel: MAPZ.sel, info: (document.getElementById('mapInfo') || {}).innerText || '' }));
    if (!sel.sel || !/成都|益州|蜀/.test(sel.sel) || !sel.info.includes(sel.sel)) bad('点了成都一带没选中、详情没出来：' + JSON.stringify({ sel: sel.sel, info: sel.info.slice(0, 120) }));
    // 放大按钮
    { const z0 = await p.evaluate(() => GLMAP.getZoom()); await p.click('[data-mapzoom="in"]'); await p.waitForTimeout(900); const z1 = await p.evaluate(() => GLMAP.getZoom()); if (!(z1 > z0 + 0.5)) bad('新图上点「＋」没放大：' + z0 + '→' + z1); }
    // 大图按钮：铺满屏幕后地图跟着变大
    { const h0 = await p.evaluate(() => document.getElementById('glSlot').clientHeight); await p.click('[data-mapbig]'); await p.waitForTimeout(800); const h1 = await p.evaluate(() => ({ h: document.getElementById('glSlot').clientHeight, c: GLMAP.getCanvas().clientHeight })); if (!(h1.h > h0) || Math.abs(h1.c - h1.h) > 4) bad('新图点大图没铺开：' + JSON.stringify([h0, h1])); await p.click('[data-mapbig]'); await p.waitForTimeout(500); }
    // 兵牌、行军、战场、敌境：兵牌真点选中
    await p.evaluate(() => { S.forces = [{ name: '牙军', owner: '你', leader: '张三', troops: 3000, at: '成都', status: '驻守', morale: 70 }, { name: '梁军', owner: '后梁', leader: '某', troops: 20000, at: '兴元府', status: '驻守', foe: true }]; S.battles = [{ turn: S.turn, when: '三月', place: '汉州', outcome: '小胜' }]; S.wars = [{ with: '后梁', state: '交战' }]; S.idm = 'warlord'; GLMAP.jumpTo({ zoom: 5, center: [105, 31] }); render(); });
    await p.waitForTimeout(1500);
    const d = await p.evaluate(() => ({ dyn: GLMAP.getSource('dyn')._data.features.map(f => f.properties.k), tags: [...document.querySelectorAll('.gltag')].map(e => e.dataset.mapforce) }));
    if (!d.dyn.includes('battle')) bad('新图上没画打过仗的地方：' + d.dyn.join());
    if (!d.tags.includes('牙军')) bad('新图上没有兵牌：' + d.tags.join());
    const tg = await p.$('.gltag[data-mapforce="牙军"]'); if (tg) { await tg.click(); await p.waitForTimeout(600); const r2 = await p.evaluate(() => ({ from: MAPZ.from, sel: !!document.querySelector('.gltag.sel[data-mapforce="牙军"]') })); if (r2.from !== '牙军' || !r2.sel) bad('点兵牌没选中这支兵：' + JSON.stringify(r2)); }
    // 换回旧图
    await p.click('[data-mapgl]'); await p.waitForTimeout(500);
    if (!(await p.$('svg.smap')) || await p.$('#glSlot')) bad('点「换回旧图」没换回来');
  }
  console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
