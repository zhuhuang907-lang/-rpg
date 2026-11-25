const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof geoData === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const A = geoData();
    const near = (lon, lat, rad) => A.filter(u => u.lat && Math.hypot((u.lon - lon) * Math.cos(lat * Math.PI / 180), u.lat - lat) < rad).map(u => u.name + '[' + u.type + '] ' + u.from + '-' + u.to + ' ' + u.lon.toFixed(2) + ',' + u.lat.toFixed(2));
    return { ding: near(114.97, 38.52, 0.5), huining: near(126.6, 45.5, 0.8), liaoyang: near(123.17, 41.27, 0.5) };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
