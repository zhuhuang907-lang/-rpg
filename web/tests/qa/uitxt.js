// 界面文字体检：各页里 0 值、占位、未定、某某 之类看起来像坏了的行
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 7, day: 3, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王'; S.turn = 5;
    S.realm = { treasury: 118000, granary: 286000, revenue: 90000, outlay: 80000, army: 30000, capital: '福州' };
    S.territory = ['福州', '建州', '泉州', '漳州', '汀州'].map(x => ({ place: x, pop: 60000, troops: 5000, grain: 40000, loyalty: 60 }));
    S.forces = [{ name: '威武军', leader: '王延钧', at: '建州', troops: 11000, grain: 6000, morale: 62, train: 55, orgNow: 66, quality: '中', units: [], status: '驻守' }];
    S.prices = [{ item: '米', price: 400, per: '石' }]; S.chat = [{ role: 'gm', text: '开场' }]; VIEW = 'game'; render();
  });
  const tabs = await p.evaluate(() => tabsFor(S).map(x => x[0]));
  const out = {};
  for (const t of tabs) {
    await p.evaluate(t => { TAB = t; render0(); }, t);
    await p.waitForTimeout(200);
    out[t] = await p.evaluate(() => {
      const txt = ((document.querySelector('.side') || {}).innerText || '');
      const L = txt.split('\n').map(x => x.trim()).filter(Boolean);
      const bad = L.filter(l => /0个月|0两|0人|0副|0艘|（附郭县没对上）|某某|undefined|NaN|\[object|第\s*回合|够0|未立账|（）|「」/.test(l));
      return [...new Set(bad)].slice(0, 8);
    });
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
