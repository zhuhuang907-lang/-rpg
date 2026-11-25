const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof geoData === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => geoData().filter(u => u.type === '国' && u.from <= 620 && (u.to === 0 || u.to >= 583)).map(u => u.name + ' ' + u.from + '-' + u.to + ' ' + u.lon + ',' + u.lat));
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
