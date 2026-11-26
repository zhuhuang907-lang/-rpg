const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 1800, month: 6, day: 1, place: '洛阳', polity: '清' });
    VIEW = 'game'; TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'world'; MAPZ.follow = false; render();
    const M = mapUnits(S), R = realmsAt(1800, 6), L = R.list, cnt = {};
    for (const u of M.L2) { if (!u.lat) continue; const g = M.reg(u); if (g) cnt[g.name] = (cnt[g.name] || 0) + 1; }
    return { groups: L.filter(x => x.kind).map(x => ({ n: x.name, p: x.parent, k: x.kind, c: cnt[x.name] || 0 })), foreign: L.filter(x => /朝鲜|琉球|越南/.test(x.name)).map(x => ({ n: x.name, c: cnt[x.name] || 0, v: !!x.vassal })), legend: document.querySelector('.mlegend') ? document.querySelector('.mlegend').innerText : '', L2: M.L2.filter(u => /朝鲜|琉球|越南/.test(u.n)).map(u => u.n + '=' + ((M.reg(u) || {}).name || '无')) };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
