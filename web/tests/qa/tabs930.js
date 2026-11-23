// 930 闽王：势力页（外交）与军务页（战局/后勤）截图
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王'; S.turn = 3;
    S.realm = { treasury: 120000, granary: 300000, revenue: 90000, outlay: 80000, army: 30000, capital: '福州' };
    S.territory = ['福州', '建州', '泉州', '漳州', '汀州'].map(x => ({ place: x, pop: 60000, troops: 5000, grain: 40000, loyalty: 60 }));
    S.forces = [{ name: '威武军', leader: '王延钧', at: '建州', troops: 12000, grain: 8000, morale: 65, train: 55, orgNow: 70, quality: '中', units: [], status: '驻守' }];
    S.prices = [{ item: '米', price: 400, per: '石' }];
    S.depots = [{ place: '建州', lv: 1, grain: 20000, ym: 11166 }];
    S.wars = [{ with: '吴', cb: '讨逆', declared: true, since: 11166, state: '交战', won: 1, lost: 0, took: ['信州'], by: 'sovereign', allies: [] }];
    S.diplo = { 吴: { att: -80, ties: [], log: [], why: '' }, 吴越: { att: 30, ties: ['姻'], log: [{ ym: 11160, t: '两家结为姻亲' }] }, 楚: { att: 20, ties: [], log: [] } };
    S.chat = [{ role: 'gm', text: '开场' }]; VIEW = 'game'; TAB = 'power'; MAPZ.inited = true; render();
  });
  await p.waitForTimeout(1000);
  await p.screenshot({ path: 'C:/Users/DELL/AppData/Local/Temp/zcode-work/tabpower.png', fullPage: true });
  await p.evaluate(() => { TAB = 'army'; render(); });
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'C:/Users/DELL/AppData/Local/Temp/zcode-work/tabarmy.png', fullPage: true });
  console.log('ok');
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
