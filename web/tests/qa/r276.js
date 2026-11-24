// zcode 交的地图、世系、界面大修（R-275、R-276，2026-11-24 审过合进）：闽国王室世系真点朝局页看得见；
// 史事到了年月地图跟着易主（玩家打下的不被史书改回）；兵临城下「不待探报」真点就攻城；早年地盘不倒推（刘备 210 年没有益州、朱温 885 年没有青州）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof houseHtml === 'function' && typeof histOwnTick === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    // 早年地盘不倒推
    const at = (y, lon, lat) => { const R = realmsAt(y, 6); const r = R && R.of(lon, lat); return r ? r.name : ''; };
    if (/刘备/.test(at(210, 104.07, 30.66))) bad.push('210 年成都画成了刘备的');
    if (/朱全忠/.test(at(885, 118.48, 36.69))) bad.push('885 年青州画成了朱全忠的');
    // 史事易主
    { const s = newSave({ name: '周铁山', gender: '男', age: 30, role: '魏州牙兵', gregorianYear: 914, month: 6, day: 1, place: '魏州', polity: '后梁' }); s.chat = [{ role: 'gm', text: '开场。' }];
      histOwnTick(s); s.clock.y = 915; s.clock.m = 8; histOwnTick(s);
      const h = (s.mapHist || {})[geoStem('魏州')]; if (!h || h.owner !== '晋' || h.st !== '史') bad.push('915 年魏州没随史事归晋：' + JSON.stringify(h));
      const s2 = newSave({ name: '周铁山', gender: '男', age: 30, role: '魏州牙兵', gregorianYear: 914, month: 6, day: 1, place: '魏州', polity: '后梁' });
      histOwnTick(s2); s2.mapOwn = { [geoStem('魏州')]: { owner: '你', st: '得', why: '玩家攻占' } }; s2.clock.y = 915; s2.clock.m = 8; histOwnTick(s2);
      if ((s2.mapHist || {})[geoStem('魏州')]) bad.push('玩家打下的魏州被史书改回去了'); }
    // 世系
    const s = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' }); s.chat = [{ role: 'gm', text: '开场。' }]; s.turn = 3; s.idm = 'emperor';
    if (!rulersAt(898, s, 3).some(x => /王潮/.test(x.name))) bad.push('898 年闽地君主没有王潮');
    // 兵临城下等探报
    s.forces = [{ name: '亲军', leader: '王延钧', troops: '3000', at: '福州', status: '行军' }];
    s.campaigns = [{ force: '亲军', target: '建州', from: '福州', mode: '攻', state: '待探报', li: 300, done: 300 }];
    S = s; VIEW = 'game'; SIDE_FOLD = false; TAB = 'court'; render0();
    return bad;
  });
  await p.waitForTimeout(300);
  let t = await p.evaluate(() => document.body.innerText);
  if (!/闽王室世系/.test(t) || !/王审知/.test(t)) errs.push('朝局页看不到闽王室世系');
  await p.click('[data-tab="army"]').catch(() => errs.push('军务页签点不到'));
  await p.waitForTimeout(300);
  const btn = p.locator('[data-scoutgo]').first();
  if (!(await btn.count())) errs.push('兵临城下没有「不待探报」按钮');
  else { await btn.click(); await p.waitForTimeout(400);
    const st = await p.evaluate(() => (arr(S.campaigns)[0] || {}).state);
    if (st === '待探报') errs.push('点了「不待探报」还在等探报'); }
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
