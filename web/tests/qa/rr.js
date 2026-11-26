const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof realmRuler === 'function', null, { timeout: 60000 });
  console.log(await p.evaluate(() => ({ a: realmRuler('吴', 234), b: realmRuler('吴', 240), c: realmRuler('魏', 234), d: realmRuler('曹操', 200), e: realmRuler('汉', 190) })));
  await b.close();
})();
