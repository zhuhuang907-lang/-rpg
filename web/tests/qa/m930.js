// 930 年舆图验收：近景（闽）与大图（天下），看染色与图例
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 30000 });
  await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' });
    S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3; VIEW = 'game'; S.idm = 'emperor'; S.protagonist.role = '闽王';
    TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 117.2, lat: 26.2 }; MAPZ.span = 4.2; MAPZ.sel = ''; MAPZ.follow = false;
    render();
  });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'C:/Users/DELL/AppData/Local/Temp/zcode-work/m930near.png', fullPage: false });
  await p.evaluate(() => { MAPZ.big = true; MAPZ.mode = 'world'; MAPZ.prov = ''; MAPZ.sel = ''; MAPC.k = ''; render(); });
  await p.waitForTimeout(2000);
  await p.screenshot({ path: 'C:/Users/DELL/AppData/Local/Temp/zcode-work/m930big.png', fullPage: false });
  console.log('ERRS ' + JSON.stringify(errs.slice(0, 5)));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
