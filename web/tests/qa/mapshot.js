// 五代十国舆图验收截图：930 年闽国，看荆南/楚/闽/南汉/吴越着色
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 20000 });
  await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' });
    S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3; VIEW = 'game'; S.idm = 'emperor'; S.protagonist.role = '闽王';
    TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 112.5, lat: 28.5 }; MAPZ.span = 7; MAPZ.sel = ''; MAPZ.follow = false;
    render();
  });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: process.env.SHOT || 'map930.png', fullPage: false });
  console.log('ok');
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
