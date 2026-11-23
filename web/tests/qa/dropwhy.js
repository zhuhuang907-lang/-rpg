// 查 geoYear 在某坐标附近留下了什么、为什么主州不见了
const { chromium } = require('playwright');
const PLAY = process.env.PLAY || 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof geoYear === 'function' && typeof stratUnits === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: 930, month: 6, day: 1, place: '洛阳', polity: '唐' });
    const G = geoYear(930), U = stratUnits(S);
    const near = (lon, lat, d) => geoData().filter(u => Math.abs(u.lon - lon) < d && Math.abs(u.lat - lat) < d).map(u => `${u.name}[${u.type}] ${u.from}-${u.to} @${u.lon.toFixed(2)},${u.lat.toFixed(2)} ${(u.parent || u.b || '')}`).slice(0, 30);
    const inG = (lon, lat, d) => G.filter(u => Math.abs(u.lon - lon) < d && Math.abs(u.lat - lat) < d).map(u => `${u.name}[${u.type}] ${u.from}-${u.to}`);
    const inP = n => U.prefs.filter(u => u.name === n || (u.old && u.old === n)).map(u => `${u.name}[${u.type}] ${u.from}-${u.to}`);
    return {
      zd_db: near(114.56, 38.14, 0.4), zd_G: inG(114.56, 38.14, 0.4), zd_P: inP('镇州').concat(inP('真定府')),
      jz_db: near(105.85, 21.03, 0.4), jz_G: inG(105.85, 21.03, 0.4), jz_P: inP('交州').concat(inP('宋平')),
      gz_db: near(96.24, 40.24, 0.5), gz_G: inG(96.24, 40.24, 0.5),
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
