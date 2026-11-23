// 战争闭环：930 闽王攻吴信州，按月推进，看行军、交战、占领、地图变化
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王';
    S.realm = { treasury: 120000, granary: 300000, revenue: 90000, outlay: 80000, army: 30000, capital: '福州' };
    S.territory = ['福州', '建州', '泉州', '漳州', '汀州'].map(x => ({ place: x, pop: 60000, troops: 5000, grain: 40000, loyalty: 60 }));
    S.forces = [{ name: '威武军', leader: '王延钧', at: '福州', troops: 12000, grain: 8000, morale: 65, train: 55, orgNow: 70, quality: '中', units: [], status: '驻守' }];
    S.prices = [{ item: '米', price: 400, per: '石' }];
    const log = [];
    const war = warStart(S, '吴', '讨逆', false);
    log.push('warStart: ' + war + ' / ' + JSON.stringify((arr(S.wars)[0] || {})));
    const order = armyAct(S, 'march', { force: '威武军', target: '信州', mode: '攻', paceName: '常行' });
    log.push('armyAct: ' + order + ' / ' + JSON.stringify(S.campaigns));
    for (let i = 0; i < 8; i++) {
      S.turn++;
      S.clock.m++; if (S.clock.m > 12) { S.clock.m = 1; S.clock.y++; }
      const ct = SH(() => campaignTick(S, 30), 'campaignTick');
      const wm = SM('warMonthly', () => warMonthly(S));
      const wm2 = SM('warMonthly2', () => warMonthly2(S));
      const lm = SM('logiMonthly', () => logiMonthly(S));
      const am = SM('armyMonthly', () => armyMonthly(S, 1));
      log.push('--- 第' + (i + 1) + '月 ' + S.clock.y + '/' + S.clock.m + ' ---');
      for (const x of [].concat(ct || [], wm || [], wm2 || [], lm || [], am || [])) log.push('  ' + x);
      const c = arr(S.campaigns)[0];
      log.push('  军情: ' + (c ? c.state + ' 目标' + c.target + ' 已走' + Math.round(c.done || 0) + '/' + Math.round(c.li || 0) : '无') + '；兵在' + arr(S.forces)[0].at + '；仗' + arr(S.battles).length + '场；占城' + JSON.stringify(Object.entries(S.mapOwn || {}).map(([k, v]) => k + ':' + v.owner + '/' + v.st)));
    }
    return { log, battles: arr(S.battles).slice(-3), mapOwn: S.mapOwn, territory: arr(S.territory).map(x => x.place), war: arr(S.wars)[0] };
  });
  console.log(JSON.stringify(r, null, 1));
  console.log('ERRS ' + JSON.stringify(errs.slice(0, 5)));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
