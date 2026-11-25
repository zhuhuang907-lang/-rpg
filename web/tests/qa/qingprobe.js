const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof geoYear === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    const out = {};
    for (const y of [1619, 1639, 1664, 1674]) {
      const G = geoYear(y), A = geoData();
      out[y] = {
        G: G.filter(u => /沈阳|奉天|承天|天兴|万年|盛京|辽阳|赫图/.test(u.name)).map(u => u.name + '[' + u.type + '] ' + u.from + '-' + u.to + ' ' + u.lon + ',' + u.lat),
        A: A.filter(u => /沈阳|奉天|承天|天兴|万年|盛京|辽阳|赫图/.test(u.name)).map(u => u.name + '[' + u.type + '] ' + u.from + '-' + u.to + ' ' + u.lon + ',' + u.lat),
      };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
