// 兵力虚实（任务三，R-221 御示）：敌人和不归你直接统的部队只给估计（传闻多半虚张、给个范围）；真点「派探子」，花盘缠，探准到上下一成；
// 你直接统的部队照实数；地图上敌军的标签、悬停也只给估计
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof troopEst === 'function');
  const ev = f => p.evaluate(f);
  await ev(() => { S = newSave({ name: '李世民', gender: '男', age: 30, role: '皇帝', real: true, gregorianYear: 630, month: 6, day: 1, place: '长安', polity: '唐' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.money = { cash: 100, unit: '两' };
    S.forces = [{ name: '左卫军', owner: '你', leader: '李靖', troops: 3000, at: '洛阳', status: '驻扎' }, { name: '突厥骑', owner: '突厥', leader: '颉利', troops: 40000, at: '洛阳', status: '驻扎', foe: true }];
    VIEW = 'game'; TAB = 'map'; SIDE_FOLD = false; MAPZ.inited = false; render(); MAPZ.sel = '洛阳'; MAPC.k = ''; render(); });
  let h = await ev(() => document.body.innerText);
  if (!/左卫军（李靖，3,000人/.test(h)) errs.push('自己直接统的左卫军没照实数');
  if (/40,000人/.test(h)) errs.push('没探过的突厥骑露了实数 40,000');
  if (!/突厥骑（颉利，约[^）]*至[^）]*传闻/.test(h)) errs.push('没探过的敌军没给范围估计：' + (h.match(/突厥骑（[^）]*）/) || [''])[0]);
  const tip = await ev(() => { const g = document.querySelector('[data-mapforce="突厥骑"] title'); return g ? g.textContent : ''; });
  if (tip && /40,000人/.test(tip)) errs.push('地图悬停露了敌军实数：' + tip);
  const btn = await p.$('[data-scout="突厥"]'); if (!btn) errs.push('驻军里没有「派探子」按钮'); else {
    await p.click('[data-scout="突厥"]'); await p.waitForTimeout(100);
    const r = await ev(() => ({ cash: S.money.cash, e: troopEst(S, S.forces[1]), msg: ORGMSG }));
    if (!(r.cash < 100)) errs.push('派探子没花盘缠');
    if (!r.e || r.e.lv !== 2 || Math.abs(r.e.mid - 40000) > 4000) errs.push('派了探子没探准：' + JSON.stringify(r.e));
    h = await ev(() => document.body.innerText); if (!/探子新报/.test(h)) errs.push('探过以后界面没写探子新报');
    const old = await ev(() => { S.clock.y += 1; return troopEst(S, S.forces[1]); }); if (old.lv !== 1) errs.push('一年前的探报没算旧：' + JSON.stringify(old));
  }
  const mine = await ev(() => troopEst(S, S.forces[0])); if (!mine.exact || mine.mid !== 3000) errs.push('自己的兵没照实数：' + JSON.stringify(mine));
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
