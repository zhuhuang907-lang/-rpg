const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof geoYear === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    const out = {};
    for (const y of [756, 760, 790]) {
      const G = geoYear(y);
      out[y] = {
        dh: G.filter(u => u.type === '都护府').map(u => u.name + ' ' + u.from + '-' + u.to + ' ' + u.lon + ',' + u.lat),
        west: G.filter(u => u.lon < 105 && u.lat > 30).map(u => u.name + '[' + u.type + '] ' + u.lon.toFixed(1) + ',' + u.lat.toFixed(1)).slice(0, 60),
        jun: G.filter(u => u.type === '郡').length,
      };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
