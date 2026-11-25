const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof geoYear === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const y = 320, A = geoData(), P = /^(郡|国)$/;
    const G0 = A.filter(u => u.from <= y && u.to >= y && u.lat && u.lon);
    const cand = A.filter(u => /郡$/.test(u.name) && u.to === 0 && u.from <= 0);
    const li = cand.filter(u => u.name === '辽东郡');
    const near = G0.filter(v => Math.hypot(v.lon - 123.168, v.lat - 41.2658) < 0.15).map(v => v.name + '[' + v.type + '] ' + v.from + '-' + v.to);
    const G = geoYear(200);
    const inG = G.filter(u => u.name === '辽东郡').map(u => u.from + '-' + u.to + ' ' + (u.b || ''));
    return { candN: cand.length, has辽东: li.length, li, near, inG, gN: G.length, sampleCand: cand.slice(0, 10).map(u => u.name) };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
