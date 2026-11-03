// 舆图看得清、看得到自己的辖区（CLAUDE.md「舆图」放大不变花、府州界、你的辖区）：放大缩小都照政权上色，不一放大就每个府州各一种颜色；
// 天下图不画府州界，稍微放大就画府州界、标州名；一方之主、地方官、武官都能在图上看到自己的辖区（朱红粗线、圈），局面页、仕途页的按钮真点得动
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1300 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof stratMap === 'function');
  const bad = [];
  const r1 = await p.evaluate(() => {
    const TINT = ['#b89f6a', '#7f9f6c', '#9a83ad', '#ad8670', '#6f95ab', '#a8a35f', '#6fa094', '#ad7a8b'];
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' }); S.idm = 'warlord'; S.territory = [{ place: '福州' }, { place: '泉州' }]; S.chat = [{ role: 'gm', text: '开场。' }];
    const go = (mode, span) => { MAPZ.inited = true; MAPZ.mode = mode; MAPZ.prov = ''; MAPZ.sel = ''; MAPZ.c = { lon: 119.3, lat: 26.1 }; MAPZ.span = span; MAPZ.follow = false; MAPC.k = ''; return stratMap(S); };
    const w = go('world'), mid = go('near', 6), fine = go('near', 1.2);
    const tints = h => TINT.filter(c => h.includes(`fill="${c}"`)).length;
    return { wPref: /class="prefline"/.test(w), midPref: /class="prefline"/.test(mid), finePref: /class="prefline"/.test(fine), tintFine: tints(fine), tintMid: tints(mid), domW: /class="domline"/.test(w), domFine: /class="domline"/.test(fine), names: (mid.match(/>[^<>]{1,3}州</g) || []).length };
  });
  if (r1.wPref) bad.push('天下图也画了府州界（太挤）');
  if (!r1.midPref || !r1.finePref) bad.push('稍微放大没有府州界：' + JSON.stringify(r1));
  if (r1.tintFine > 0 || r1.tintMid > 0) bad.push('放大以后又按府州各上一种颜色（花花绿绿）：' + JSON.stringify(r1));
  if (!r1.domW || !r1.domFine) bad.push('闽王的地盘没用朱红线圈出来：' + JSON.stringify(r1));
  if (r1.names < 3) bad.push('稍微放大看不到州名：' + r1.names);
  // 局面页的按钮：在舆图上看你的地盘
  await p.evaluate(() => { TAB = 'board'; VIEW = 'game'; SIDE_FOLD = false; MAPZ.mode = 'world'; render0(); });
  const btn = await p.$('button[data-mapdomain]'); if (!btn) bad.push('局面页没有「在舆图上看」'); else { await p.click('button[data-mapdomain]'); const st = await p.evaluate(() => ({ tab: TAB, mode: MAPZ.mode, c: MAPZ.c, h: /class="domline"/.test(document.body.innerHTML) })); if (st.tab !== 'map' || st.mode !== 'near' || !st.h) bad.push('点了「在舆图上看」没把图挪到你的地盘：' + JSON.stringify(st)); }
  // 知县：仕途页能看到辖区、点了图上有圈
  const r2 = await p.evaluate(() => { S = newSave({ name: '汪辉祖', gender: '男', age: 46, role: '宁远县知县', gregorianYear: 1787, month: 3, day: 1, place: '宁远县', polity: '清' }); S.chat = [{ role: 'gm', text: '开场。' }]; S.career = { office: '宁远县知县', rank: '正七品' }; TAB = 'career'; VIEW = 'game'; SIDE_FOLD = false; render0(); return { kind: myDomain(S).kind, txt: document.body.innerText }; });
  if (r2.kind !== 'local' || !/你的辖区/.test(r2.txt)) bad.push('知县的仕途页看不到自己的辖区：' + r2.kind);
  const b2 = await p.$('button[data-mapdomain]'); if (!b2) bad.push('仕途页没有「在舆图上看」'); else { await p.click('button[data-mapdomain]'); const h = await p.evaluate(() => ({ tab: TAB, mark: /class="dommark"/.test(document.body.innerHTML) || /class="domline"/.test(document.body.innerHTML) })); if (h.tab !== 'map' || !h.mark) bad.push('知县点了「在舆图上看」，图上没圈出辖区：' + JSON.stringify(h)); }
  // 平民没有辖区：不摆按钮
  const r3 = await p.evaluate(() => { S = newSave({ name: '张三', gender: '男', age: 30, role: '苏州城外的佃户', gregorianYear: 1600, month: 3, day: 1, place: '苏州', polity: '明' }); S.chat = [{ role: 'gm', text: '开场。' }]; TAB = 'board'; VIEW = 'game'; render0(); return !!document.querySelector('button[data-mapdomain]'); });
  if (r3) bad.push('平民也摆了「在舆图上看辖区」');
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
