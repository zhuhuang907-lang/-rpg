// 两川边缘州的坐标与归属
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 930, month: 6, day: 1, place: '洛阳', polity: '唐' });
    const M = mapUnits(S);
    return ['梁州', '兴元府', '剑州', '文州', '通州', '夔州', '涪州', '黔州', '珍州', '纳州', '南安州', '翼州', '晏州'].map(n => M.L2.filter(u => u.n === n).map(u => { const rr = M.reg(u); return n + ' @' + u.lon.toFixed(2) + ',' + u.lat.toFixed(2) + ' = ' + (rr ? rr.name : '无') + ' [' + (u.t || '') + ']'; }).join(' | ') || n + ' 不在L2');
  });
  console.log(r.join('\n'));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
