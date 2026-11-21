// 实际地图单位探针：930 年 mapUnits(S).L2 全部州府＋归属（这才是玩家看见的图）
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const Y = Number(process.env.PROBE_Y || 930);
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 20000 });
  const out = await p.evaluate((Y) => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: Y, month: 6, day: 1, place: '福州', polity: '闽' });
    const M = mapUnits(S), o = {};
    for (const u of M.L2) { if (!u.lat) continue; const r = M.reg(u); const k = r ? r.name : '（无主）'; (o[k] = o[k] || []).push(u.n); }
    return o;
  }, Y);
  for (const k of Object.keys(out).sort((a, b) => out[b].length - out[a].length)) console.log(k, out[k].length, '｜', [...new Set(out[k])].join('、'));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
