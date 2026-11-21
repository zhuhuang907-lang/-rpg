// 闽国世系验收：930 年闽国开局，朝局/人物页要有王室世系（全部君主、父父子子），rulersAt 认王潮等
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1360, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof houseHtml === 'function', null, { timeout: 20000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' });
    S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3; VIEW = 'game';
    const H = houseOf(S);
    const html = houseHtml(S);
    const rulers930 = rulersAt(930, S).filter(x => /闽|殷/.test(x.polity)).map(x => x.polity + ':' + x.name);
    const rulers898 = rulersAt(898, S).filter(x => /闽/.test(x.polity)).map(x => x.polity + ':' + x.name);
    return { house: H && H.polity, rulers: H && H.rulers.length, has审知: /王审知/.test(html), has潮: /王潮/.test(html), has族谱: /父 王恂|父 王恁/.test(html),
      has延钧子: /子 王继鹏/.test(html), has宗室: /宗室/.test(html), has勋臣: /勋臣/.test(html), len: html.length, rulers930, rulers898 };
  });
  console.log(JSON.stringify(r, null, 1));
  // 页面截图：朝局页
  await p.evaluate(() => { S.idm = 'emperor'; S.protagonist.role = '闽王'; TAB = 'court'; render(); });
  await p.waitForTimeout(800);
  await p.screenshot({ path: process.env.SHOT || 'court.png', fullPage: false });
  console.log('ERRS', JSON.stringify(errs.slice(0, 5)));
  await b.close();
  process.exit(r.house === '闽' && r.has审知 && r.has潮 && r.has族谱 && r.has延钧子 && r.has宗室 && r.rulers930.length >= 1 && r.rulers898.some(x => /王潮/.test(x)) && !errs.length ? 0 : 1);
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
