// 皇帝管全国、藩镇附庸另列、州名看得清（CLAUDE.md「人事与职权」一方之主管全国、「舆图」州名字号与大图）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1300 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof domainPanel === 'function');
  const bad = [];
  const r = await p.evaluate(() => {
    S = newSave({ name: '杨坚', gender: '男', age: 60, role: '隋文帝', real: true, gregorianYear: 600, month: 6, day: 1, place: '大兴', polity: '隋' }); S.idm = 'emperor'; S.chat = [{ role: 'gm', text: '开场。' }]; S.territory = [{ place: '大兴' }];
    S.powers = [{ name: '高句丽', leader: '高元', stance: '称臣纳贡，时叛时服' }];
    const D = myDomain(S); TAB = 'board'; VIEW = 'game'; SIDE_FOLD = false; render0(); const txt = document.body.innerText;
    const groups = (txt.match(/(关中|河东|河北|山东|河南|淮南|江南|巴蜀|荆湖|岭南|陇右) \d+ 州/g) || []).length;
    return { n: D.places.length, groups, zhi: /直辖 \d+ 个州府/.test(txt), vas: /名义上奉你、实际自治的/.test(txt) && /高句丽/.test(txt), other: /其余 \d{2,} 州/.test(txt) };
  });
  if (r.n < 100) bad.push('隋文帝的地盘只有 ' + r.n + ' 个州府（应是全国）');
  if (!r.zhi || r.groups < 5) bad.push('局面页没把直辖州府照地域分开列：' + JSON.stringify(r));
  if (r.other) bad.push('大半州府堆在「其余」里');
  if (!r.vas) bad.push('称臣的附庸没另列、没写朝廷管到哪');
  // 点一个州：图挪过去
  const fb = await p.$('button[data-mapnear][data-tab="map"]'); if (!fb) bad.push('州名不能点'); else { await p.click('button[data-mapnear][data-tab="map"]'); const st = await p.evaluate(() => ({ tab: TAB, mode: MAPZ.mode })); if (st.tab !== 'map' || st.mode !== 'near') bad.push('点了州名没到图上：' + JSON.stringify(st)); }
  // 州名字号够大；大图按钮铺满屏幕
  const m = await p.evaluate(() => { MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 109, lat: 34.3 }; MAPZ.span = 5; MAPZ.follow = false; MAPC.k = ''; TAB = 'map'; render0(); const T = [...document.querySelectorAll('.smap text')].filter(t => /州$/.test(t.textContent)); return { n: T.length, fs: T.length ? Math.min(...T.map(t => +t.getAttribute('font-size'))) : 0 }; });
  if (m.n < 5 || m.fs < 12) bad.push('放大后州名太少或字太小：' + JSON.stringify(m));
  const bb = await p.$('button[data-mapbig]'); if (!bb) bad.push('舆图没有「大图」按钮'); else { await p.click('button[data-mapbig]'); const big = await p.evaluate(() => { const w = document.querySelector('.mapwrap.big'); return w ? getComputedStyle(w).position : ''; }); if (big !== 'fixed') bad.push('点了大图没铺满屏幕'); const back = await p.$('.mapwrap.big button[data-mapbig]'); if (!back) bad.push('大图里没有收回按钮'); else { await p.click('.mapwrap.big button[data-mapbig]'); if (await p.$('.mapwrap.big')) bad.push('点收回没收回'); } }
  // 隋是土黄不是蓝
  const col = await p.evaluate(() => { const R = realmsAt(600, 6); const x = R && R.list.find(z => z.name === '隋'); return x ? x.col : ''; });
  if (col !== '#c19a5b') bad.push('正统王朝没用土黄：' + col);
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
