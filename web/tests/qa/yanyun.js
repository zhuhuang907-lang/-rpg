// 940 燕云诸州的坐标与名字
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 940, month: 6, day: 1, place: '开封府', polity: '晋' });
    const M = mapUnits(S);
    return ['归顺州', '顺州', '妫州', '儒州', '应州', '寰州', '胜州', '丰州', '代州', '武州', '新州'].map(n => { const us = M.L2.filter(u => u.n === n); return us.length ? us.map(u => { const rr = M.reg(u); return n + ' @' + u.lon.toFixed(2) + ',' + u.lat.toFixed(2) + ' = ' + (rr ? rr.name : '无'); }).join(' | ') : n + ' 不在L2'; });
  });
  console.log(r.join('\n'));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
