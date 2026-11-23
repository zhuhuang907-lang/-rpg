// 战后舆图：930 闽攻下信州、与吴交战，近景看信州「得」金圈与吴境红虚线
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 931, month: 1, day: 20, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王'; S.turn = 7;
    S.realm = { treasury: 120000, granary: 300000, revenue: 90000, outlay: 80000, army: 30000, capital: '福州' };
    S.territory = ['福州', '建州', '泉州', '漳州', '汀州', '信州'].map(x => ({ place: x, pop: 60000, troops: 5000, grain: 40000, loyalty: 60 }));
    S.forces = [{ name: '威武军', leader: '王延钧', at: '信州', troops: 10500, grain: 4000, morale: 60, train: 55, orgNow: 65, quality: '中', units: [], status: '驻守' }];
    S.wars = [{ with: '吴', cb: '讨逆', declared: true, since: 11166, state: '交战', won: 1, lost: 0, took: ['信州'], by: 'sovereign', allies: [] }];
    S.mapOwn = { 信州: { owner: '你', turn: 7, why: '围城开城投降', st: '得' } };
    S.chat = [{ role: 'gm', text: '开场' }]; VIEW = 'game';
    TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 117.6, lat: 27.8 }; MAPZ.span = 3.4; MAPZ.sel = '信州'; MAPZ.follow = false; MAPC.k = '';
    render();
  });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'C:/Users/DELL/AppData/Local/Temp/zcode-work/mwarnear.png', fullPage: false });
  console.log('ERRS ' + JSON.stringify(errs.slice(0, 5)));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
