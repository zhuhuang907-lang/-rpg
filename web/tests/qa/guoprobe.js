const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof geoData === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const A = geoData().filter(u => u.type === '国');
    return { n: A.length, names: [...new Set(A.map(u => u.name))].slice(0, 80), spans: A.map(u => u.name + ' ' + u.from + '-' + u.to).slice(0, 40) };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
