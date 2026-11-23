// 定点核查：某坐标附近的州府、某几个地名在当年的坐标与归属
const { chromium } = require('playwright');
const PLAY = process.env.PLAY || 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof mapUnits === 'function' && typeof newSave === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const Y = 930;
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: Y, month: 6, day: 1, place: '洛阳', polity: '唐' });
    const M = mapUnits(S);
    const near = (lon, lat, d) => M.L2.filter(u => u.lat && Math.abs(u.lon - lon) < d && Math.abs(u.lat - lat) < d).map(u => { const rr = M.reg(u); return `${u.n}[${u.t || ''}]@${u.lon.toFixed(2)},${u.lat.toFixed(2)}=${rr ? rr.name : '无'}`; });
    const q = n => { const u = placeXY(S, n, Y); const mc = M.L2.find(x => x.n === n); let reg = ''; try { reg = (M.reg(mc || { n, lon: u && u.lon, lat: u && u.lat }) || {}).name || ''; } catch (e) { reg = 'ERR'; } return `${n}: ${u ? u.lon.toFixed(2) + ',' + u.lat.toFixed(2) : '查不到'} → ${reg}${mc ? '' : '（不在L2）'}`; };
    return {
      hanoi: near(105.85, 21.03, 1.2),
      zhending: near(114.57, 38.14, 0.9),
      youzhou: near(108.9, 37.6, 1.6),
      yanzhou: near(107.4, 37.8, 1.2),
      chengdu: near(104.07, 30.66, 0.8),
      names: ['交州', '宋平', '安南', '镇州', '真定府', '恒州', '宥州', '盐州', '银州', '绥州', '夏州', '瓜州'].map(q),
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
