// 930 闽王 UI 全页渲染 + 图上定名分→宣战→出兵 的点击闭环
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王'; S.turn = 3;
    S.realm = { treasury: 120000, granary: 300000, revenue: 90000, outlay: 80000, army: 30000, capital: '福州' };
    S.territory = ['福州', '建州', '泉州', '漳州', '汀州'].map(x => ({ place: x, pop: 60000, troops: 5000, grain: 40000, loyalty: 60 }));
    S.forces = [{ name: '威武军', leader: '王延钧', at: '建州', troops: 12000, grain: 8000, morale: 65, train: 55, orgNow: 70, quality: '中', units: [], status: '驻守' }];
    S.prices = [{ item: '米', price: 400, per: '石' }];
    S.chat = [{ role: 'gm', text: '开场' }]; VIEW = 'game'; TAB = 'map';
    MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 117.9, lat: 27.9 }; MAPZ.span = 3.2; MAPZ.follow = false; MAPC.k = ''; MAPZ.sel = '信州';
    S.warAsk = { force: '威武军', target: '信州', owner: '吴', tactic: '', pace: '', li: 300, days: 8 };
    render();
  });
  await p.waitForTimeout(800);
  const hasCard = await p.evaluate(() => !!document.querySelector('#mapInfo [data-war="declare"]'));
  await p.screenshot({ path: 'C:/Users/DELL/AppData/Local/Temp/zcode-work/mwarask.png', fullPage: false });
  // 点「以讨逆宣战」
  await p.click('#mapInfo [data-war="declare"][data-cb="讨逆"]').catch(async () => { await p.click('#mapInfo [data-war="declare"]'); });
  await p.waitForTimeout(1200);
  const after = await p.evaluate(() => ({ wars: arr(S.wars).map(w => w.with + '/' + w.state), campaigns: arr(S.campaigns).map(c => c.force + '→' + c.target + '/' + c.state), warAsk: S.warAsk, said: (document.querySelector('#said') || {}).value || '' }));
  // 各页渲染
  const tabs = ['board', 'map', 'people', 'court', 'power', 'army', 'estate', 'career'];
  const lens = {};
  for (const tk of tabs) { await p.evaluate(tk => { TAB = tk; render(); }, tk); await p.waitForTimeout(250); lens[tk] = await p.evaluate(() => (document.querySelector('.side') || {}).innerHTML.length || 0); }
  console.log(JSON.stringify({ hasCard, after, lens, errs: errs.slice(0, 8) }, null, 1));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
