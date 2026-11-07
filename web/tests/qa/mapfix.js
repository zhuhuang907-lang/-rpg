// 舆图不留圆圈和空白、不串年代（CLAUDE.md 舆图「北方不许有圆圈和没填色的地方」；2026-11-05 玩家：「北方地图下作，竟然还有圆形和没有填充的地区，整个游戏所有时期的地图进行改变和修正」）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof mapUnits === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    const mk = (y, nm, role, pl, pol) => { S = newSave({ name: nm, gender: '男', age: 50, role, gregorianYear: y, month: 6, day: 1, place: pl, polity: pol }); S.chat = [{ role: 'gm', text: '开场' }]; VIEW = 'game'; TAB = 'map'; SIDE_FOLD = false; MAPZ.inited = true; MAPC.k = ''; };
    // 地名不串年代：唐天宝没有南阳府、平阳府；五代没有「延州总管府」；魏州改兴唐府以后不并存
    const nm = y => new Set(geoYear(y).map(u => u.name));
    const g750 = nm(750), g930 = nm(930);
    for (const n of ['南阳府', '平阳府', '宣化府', '大兴府', '兖州府']) if (g750.has(n)) bad.push('750 年图上有后世的' + n);
    if (g930.has('延州总管府')) bad.push('930 年图上有延州总管府');
    if (g930.has('魏州') && g930.has('兴唐府')) bad.push('930 年魏州、兴唐府并存');
    // 各年代放大看：同一家政权里不切出「外境」圆圈；放大后每个治所圆点都写着名字
    for (const [y, who, role, pl, pol, lon, lat] of [[930, '王审知', '闽王', '福州', '闽', 115, 36], [200, '曹操', '丞相', '许昌', '东汉', 113, 34], [750, '李林甫', '宰相', '长安', '唐', 110, 34], [1100, '苏轼', '知州', '杭州', '宋', 114, 34], [1630, '孙承宗', '督师', '北京', '明', 116, 36], [1850, '曾国藩', '侍郎', '北京', '清', 116, 33]]) {
      mk(y, who, role, pl, pol); MAPZ.mode = 'near'; MAPZ.prov = ''; MAPZ.follow = false; MAPZ.c = { lon, lat }; MAPZ.span = 6; MAPZ.big = false; render0();
      const sv = document.querySelector('.smap'); if (!sv) { bad.push(y + '年没画出图'); continue; }
      const html = sv.innerHTML, outer = (html.match(/（外境）/g) || []).length;
      const M = mapUnits(S), B = MAPC.box, R = realmsAt(y, 6); let inner = 0, tot = 0;
      if (R) for (let i = 0; i < 40; i++) for (let j = 0; j < 30; j++) { const lon2 = B.x0 + (B.x1 - B.x0) * (i + .5) / 40, lat2 = B.y0 + (B.y1 - B.y0) * (j + .5) / 30, e = elevAt(lon2, lat2); if (e == null || e < 0) continue; const r = R.of(lon2, lat2); if (r && M.L2.some(u => M.reg(u) && M.reg(u).name === r.name)) tot++; }
      const dots = [...sv.querySelectorAll('g[data-mapu], circle[data-mapu]')].filter(x => !x.closest('g[data-mapu]') || x.tagName === 'g').map(x => x.dataset.mapu), lbl = new Set([...sv.querySelectorAll('text')].map(t => t.textContent.trim()));
      const naked = [...new Set(dots)].filter(n => !lbl.has(n) && !lbl.has(n.replace(/(府|路|郡)$/, '')));
      if (naked.length > 2) bad.push(`${y} 年放大后有 ${naked.length} 个治所圆点没写名字：${naked.slice(0, 6).join('、')}`);
      if (/>河中<|>京兆<|>河南<|>开封</.test(html)) bad.push(y + ' 年府名被砍掉了「府」字');
      // 同一家地面上的格子：照每个格子的归属查，不许有挨着自家地面又归「外境」的（圆圈的边）
      const rects = (MAPC.v.match(/<rect [^>]*fill="#d9cfb4"/g) || []).length; if (R && rects > 400) bad.push(`${y} 年放大图上铺了 ${rects} 段外境浅色（同一家里切成了圆圈）`); }
    // 大图铺满屏幕：看的范围照屏幕宽高比，不两边留白
    mk(930, '王审知', '闽王', '福州', '闽'); MAPZ.mode = 'near'; MAPZ.c = { lon: 115, lat: 36 }; MAPZ.span = 6; MAPZ.big = true; render0();
    { const sv = document.querySelector('.smap'), r = sv.getBoundingClientRect(), vb = sv.getAttribute('viewBox').split(' ').map(Number), a1 = vb[2] / vb[3], a2 = r.width / r.height;
      if (Math.abs(a1 - a2) / a2 > 0.08) bad.push(`大图的取景（${a1.toFixed(2)}）和屏幕（${a2.toFixed(2)}）不一样宽，两边会留白`);
      if (vb[2] < 900) bad.push('大图还按 640 宽画，一放大格子就成锯齿：' + vb[2]); }
    MAPZ.big = false;
    // 2026-11-07 手机截图：「你在这里」的标记压住了自家城名（福州只剩「州」），本地图上一堆白方块没写县名
    mk(921, '王审知', '闽王', '福州', '闽'); MAPZ.inited = false; render0();
    { const sv = document.querySelector('.smap'), tx = [...sv.querySelectorAll('text')].filter(e => !e.closest('.mepin')).map(e => e.textContent), pin = sv.querySelector('.mepin circle:last-of-type');
      if (!tx.includes('福州')) bad.push('开局本地图上自家城名没写出来（被标记压住）：' + tx.join('|'));
      const lb = [...sv.querySelectorAll('text')].find(e => e.textContent === '福州');
      if (pin && lb) { const a = pin.getBoundingClientRect(), c = lb.getBoundingClientRect(); if (!(a.right < c.left || a.left > c.right || a.bottom < c.top || a.top > c.bottom)) bad.push('标记和城名叠在一起'); }
      const bare = [...sv.querySelectorAll('rect[data-mapu]')].map(e => e.dataset.mapu).filter(n => !tx.includes(n) && !tx.some(x => n.startsWith(x)));
      const nearHome = bare.filter(n => !['闽县', '侯官县'].includes(n));   // 附郭县和州城同一处，方块被州城的点盖住
      if (nearHome.length) bad.push('本地图上画了县城方块却没写名字：' + nearHome.join('、')); }
    return bad;
  });
  const all = out.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
