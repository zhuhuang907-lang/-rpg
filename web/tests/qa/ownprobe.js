// 逐州归属探针：给定年，打印 州|政权|坐标，便于逐条对照史书
const { chromium } = require('playwright');
const PLAY = process.env.PLAY || 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof mapUnits === 'function' && typeof newSave === 'function', null, { timeout: 30000 });
  const years = (process.env.YEARS || '930').split(',').map(Number);
  for (const Y of years) {
    const rows = await p.evaluate((Y) => {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: Y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      const M = mapUnits(S), out = [];
      for (const u of M.L2) { if (!u.lat) continue; const r = M.reg(u); out.push([u.n, r ? r.name : '', (+u.lon).toFixed(2), (+u.lat).toFixed(2), u.p || '']); }
      out.sort((a, b) => (a[1] || 'zz').localeCompare(b[1] || 'zz') || a[0].localeCompare(b[0]));
      return out;
    }, Y);
    const byRealm = {};
    for (const [n, r, lon, lat, pv] of rows) (byRealm[r || '（无主）'] = byRealm[r || '（无主）'] || []).push(n + '(' + pv + ')');
    console.log('=== ' + Y + ' ===');
    for (const k of Object.keys(byRealm).sort()) console.log(k + ' [' + byRealm[k].length + ']: ' + byRealm[k].join(' '));
  }
  console.log('ERRS ' + JSON.stringify(errs.slice(0, 5)));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
