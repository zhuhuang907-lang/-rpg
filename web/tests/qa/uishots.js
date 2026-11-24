// 侧栏重点段落截图：家业行情、朝局世系、舆图、家室表
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
const OUT = 'C:/Users/DELL/.zcode/workspace/rpg17-40/_shots/ui';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 7, day: 3, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王'; S.turn = 5;
    S.realm = { treasury: 118000, granary: 286000, revenue: 90000, outlay: 80000, army: 30000, capital: '福州' };
    S.territory = ['福州', '建州', '泉州', '漳州', '汀州'].map(x => ({ place: x, pop: 60000, troops: 5000, grain: 40000, loyalty: 60 }));
    S.forces = [{ name: '威武军', leader: '王延钧', at: '建州', troops: 11000, grain: 6000, morale: 62, train: 55, orgNow: 66, quality: '中', units: [], status: '驻守' }];
    S.prices = [{ item: '米', price: 400, per: '石' }, { item: '绢', price: 800, per: '匹' }];
    S.depots = [{ place: '建州', lv: 1, grain: 18000, ym: 11166 }];
    S.chat = [{ role: 'gm', text: '开场' }]; VIEW = 'game'; render();
  });
  for (const [tab, scroll, name] of [['board', 'top', 'board-top'], ['estate', 'bottom', 'estate-bottom'], ['court', 'top', 'court-top'], ['court', 'bottom', 'court-bottom'], ['people', 'mid', 'people-mid'], ['map', 'top', 'map-top'], ['army', 'top', 'army-top']]) {
    await p.evaluate(t => { TAB = t; render0(); }, tab);
    await p.waitForTimeout(600);
    await p.evaluate(s => { const el = document.querySelector('.side'); if (!el) return; el.scrollTop = s === 'bottom' ? el.scrollHeight : s === 'mid' ? el.scrollHeight * 0.45 : 0; }, scroll);
    await p.waitForTimeout(300);
    const side = await p.$('.side');
    if (side) await side.screenshot({ path: `${OUT}/${name}.png` });
  }
  console.log('ok');
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
