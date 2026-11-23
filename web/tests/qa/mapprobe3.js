// 导出 907—979 各年地名库全部州府＋内置归属：JSON 打到 stdout（由外层重定向存文件）
const { chromium } = require('playwright');
const PLAY = process.env.PLAY_HTML || 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof realmsAt === 'function', null, { timeout: 20000 });
  const years = [910, 920, 930, 940, 950, 960, 970];
  const out = {};
  for (const y of years) {
    out[y] = await p.evaluate((y) => {
      const G = geoData().filter(x => x.from <= y && x.to >= y && x.lat && x.type && /州|府|军|郡/.test(x.type));
      const R = realmsAt(y, 6); const o = {};
      for (const x of G) { const r = R ? R.of(x.lon, x.lat) : null; (o[r ? r.name : '（无主）'] = o[r ? r.name : '（无主）'] || []).push(x.name); }
      return o;
    }, y);
  }
  process.stdout.write('REALM_DUMP ' + JSON.stringify(out) + '\n');
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
