const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof geoData === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => geoData().filter(u => /辽东|襄平|玄菟|乐浪|带方|昌黎|辽西|乌噜木齐|迪化/.test(u.name)).map(u => `${u.name}[${u.type}] ${u.from}-${u.to} @${u.lon},${u.lat}`).slice(0, 40));
  console.log(r.join('\n'));
  await b.close();
})();
