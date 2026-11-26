const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof geoYear === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    const out = {};
    for (const y of [756, 820, 960, 1100, 1271, 1300, 1368, 1400, 1500, 1600, 1644, 1700, 1723, 1724, 1800, 1900]) {
      const G = geoYear(y), c = {};
      for (const u of G) c[u.type] = (c[u.type] || 0) + 1;
      out[y] = { n: G.length, types: Object.entries(c).sort((a, b) => b[1] - a[1]) };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
