// 缺点的州在地名库/当年州府层里的情况
const { chromium } = require('playwright');
const PLAY = process.env.PLAY || 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof geoYear === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 930, month: 6, day: 1, place: '洛阳', polity: '唐' });
    const G = geoYear(930);
    const out = {};
    for (const n of ['瓜州', '宥州', '镇州', '交州', '丰州', '胜州', '灵州都督府', '盐州']) {
      const db = geoData().filter(u => u.name === n).map(u => `${u.type} ${u.from}-${u.to} @${u.lon},${u.lat} ${u.parent || ''}`);
      const gy = G.filter(u => u.name === n).map(u => `${u.type} ${u.from}-${u.to} @${u.lon},${u.lat}`);
      const px = placeXY(S, n, 930);
      out[n] = { db, gy, xy: px && px.lat ? `${px.lon},${px.lat}` : null };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
