// 战争第一期后半（需求台账 R-139）：甲械工坊（真点）、缺甲打折、募兵领甲、每月补甲；舟师（过长江船不够不许走、造船真点）；
// 臣属出兵（真点、归你调、半年回去、在外越久越不满）；军团与战线（勾选编路真点、令守开去固守、令攻一齐出兵、几支围同城兵力合算、强攻一齐上）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof groupSet === 'function');
  const bad = [];
  const next = async () => p.evaluate(() => { S.clock.m = (S.clock.m % 12) + 1; if (S.clock.m === 1) S.clock.y++; armsMonthly(S); levyMonthly(S); groupTick(S); render(); });
  await p.evaluate(() => {
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.realm = { treasury: 900000 }; S.fisc = { kind: 'realm', base: { tianfu: 600000, shang: 200000, yan: 200000 }, pol: { tax: '常' } };
    S.territory = [{ place: '福州', troops: 3000 }, { place: '漳州', troops: 1000 }];
    S.unitTypes = [{ id: 'bu', name: '步军', size: 500, pay: 1, grain: 0.6, atk: 50, def: 50, shock: 40, org: 60, mob: 40, unit: '营' }];
    S.forces = [{ name: '威武军', leader: '王审知', owner: '你', troops: 10000, morale: 65, orgNow: 70, train: 60, grain: 300000, at: '福州', status: '驻守', units: [{ tpl: 'bu', men: 10000 }] },
      { name: '南路军', leader: '王延钧', owner: '你', troops: 6000, morale: 65, orgNow: 70, train: 60, grain: 200000, at: '漳州', status: '驻守' }];
    S.powers = [{ name: '南汉', leader: '刘䶮', seat: '广州', troops: '60000', stance: '敌' }, { name: '吴越', leader: '钱镠', seat: '杭州', troops: '40000', stance: '臣' }];
    dipOf(S, '吴越').ties = ['臣属']; dipOf(S, '吴越').att = 30; warStart(S, '南汉', warCBs(S, '南汉')[0] || '', false);
    VIEW = 'game'; TAB = 'army'; SIDE_FOLD = false; render(); });
  // 甲械：设工坊（真点）→ 花钱、每月出甲械
  { const bt = await p.$('[data-arms="shop"]'); if (!bt) bad.push('军务页没有「添设军器工坊」'); else { const t0 = await p.evaluate(() => S.realm.treasury); await bt.click(); await p.waitForTimeout(150); const r = await p.evaluate(() => ({ shops: armsOf(S).shops, tr: S.realm.treasury })); if (r.shops !== 1 || !(r.tr < t0)) bad.push('点了设工坊没设成或没花钱：' + JSON.stringify(r)); } }
  const r1 = await p.evaluate(() => { const bad = []; const A = armsOf(S); A.stock = 0; A.ym = Math.floor(ymOf(S.clock));
    // 库里没甲械时募兵：缺甲
    const rr = armyAct(S, 'raise', { force: '威武军', tpl: 'bu', n: 4 }); const f = S.forces[0]; if (!(eqOf(f) < 100)) bad.push('库里没甲械募来两千新兵，没缺甲：' + f.eq + ' ' + (rr ? '' : ORGMSG));
    const full = btSide(S, { name: 'x', f: { ...f, eq: 100 } }).atk, low = btSide(S, { name: 'x', f }).atk; if (!(low < full)) bad.push('缺甲的兵打仗没打折：' + low + ' vs ' + full);
    return { bad, eq: f.eq }; });
  bad.push(...r1.bad);
  await next(); { const r = await p.evaluate(() => ({ eq: S.forces[0].eq, st: armsOf(S).stock })); if (!(r.eq > r1.eq)) bad.push('工坊出了甲械，缺甲的军没补上：' + JSON.stringify(r)); }
  // 舟师：福州→扬州要过长江，船不够不许走；造船（真点）后能走
  { const r = await p.evaluate(() => { S.navy = { ships: 0 }; const ok = armyAct(S, 'march', { force: '南路军', target: '扬州', mode: '守' }); return { ok: !!ok, msg: ORGMSG, cross: crossesYJ(S, '漳州', '扬州'), no: crossesYJ(S, '漳州', '潮州') }; });
    if (!r.cross || r.no) bad.push('长江南北认错：' + JSON.stringify(r)); if (r.ok || !/长江/.test(r.msg)) bad.push('过长江没船也走了：' + JSON.stringify(r));
    await p.fill('#shipN', '60'); const sb = await p.$('[data-arms="ship"]'); if (!sb) bad.push('没有「造战船」'); else { await sb.click(); await p.waitForTimeout(150); const r2 = await p.evaluate(() => ({ n: (S.navy || {}).ships, ok: !!armyAct(S, 'march', { force: '南路军', target: '扬州', mode: '守' }) })); if (r2.n !== 60 || !r2.ok) bad.push('造了船还是过不了江：' + JSON.stringify(r2)); }
    await p.evaluate(() => { S.campaigns = []; render(); }); }
  // 臣属出兵（真点）
  { const lv = await p.$('[data-levy="吴越"]'); if (!lv) bad.push('交战时没有「召吴越出兵」'); else { const a0 = await p.evaluate(() => dipOf(S, '吴越').att); await lv.click(); await p.waitForTimeout(150); const r = await p.evaluate(() => ({ f: S.forces.find(f => f.levy === '吴越'), mine: myForce(S, S.forces.find(f => f.levy === '吴越') || {}) }));
      if (!r.f || !(r.f.troops > 0) || !r.mine) bad.push('召臣属出兵没来、或不归你调：' + JSON.stringify(r));
      for (let i = 0; i < 7; i++) await next(); const r2 = await p.evaluate(() => ({ f: !!S.forces.find(f => f.levy === '吴越'), att: dipOf(S, '吴越').att })); if (r2.f) bad.push('臣属援军半年还没回去'); if (!(r2.att < a0)) bad.push('臣属的兵在外半年，对你没不满'); } }
  // 军团：勾选两支，派到战线，令攻 → 一齐出兵；同围一城兵力合算
  await p.evaluate(() => { S.forces[1].at = '漳州'; render(); });
  const fronts = await p.evaluate(() => [...document.querySelectorAll('#gpFront option')].map(o => o.value)); if (!fronts.length) bad.push('交战时军团没有战线可选'); else {
    for (const n of ['威武军', '南路军']) await p.check(`[data-gpf="${n}"]`); await p.fill('#gpName', '南路'); await p.selectOption('#gpFront', fronts[0]); await p.click('[data-group="攻"]'); await p.waitForTimeout(150);
    const r = await p.evaluate(() => ({ g: S.groups, c: S.campaigns.map(c => c.force + '→' + c.target + ':' + c.state) })); const tg = fronts[0].split('—')[1];
    if (!r.g || !r.g.length || r.c.filter(x => x.includes('→' + tg)).length !== 2) bad.push('军团令攻没一齐出兵：' + JSON.stringify(r));
    const r2 = await p.evaluate(tg => { for (const c of S.campaigns) { c.state = '待探报'; } const [c1, c2] = S.campaigns; const G = { troops: 3000, quality: '中', owner: '南汉' }; campResolve(S, c1, G); campResolve(S, c2, G);
      const one = siegeRate(S, c1, S.forces.find(f => f.name === c1.force)); return { s1: c1.state, s2: c2.state, j: c2.joinOf, mates: siegeMates(S, c1).length }; }, tg);
    if (r2.s1 !== '围城' || r2.s2 !== '围城' || !r2.j || r2.mates !== 1) bad.push('两支军到同一座城没会同围城：' + JSON.stringify(r2));
    await p.evaluate(() => render()); const qg = await p.$('[data-siege="强攻"]'); if (!qg) bad.push('会同围城没有强攻按钮'); else { await qg.click(); await p.waitForTimeout(150); const fs = await p.evaluate(() => (arr(S.battles).slice(-1)[0] || {}).forces || ''); if (!/威武军/.test(fs) || !/南路军/.test(fs)) bad.push('强攻没有两支一齐上：' + fs); }
    // 令守：开去固守
    await p.evaluate(() => { S.campaigns = []; S.forces[0].at = '泉州'; render(); }); for (const n of ['威武军']) await p.check(`[data-gpf="${n}"]`); await p.fill('#gpName', '东路'); await p.click('[data-group="守"]'); await p.waitForTimeout(150);
    const r3 = await p.evaluate(() => ({ c: S.campaigns.map(c => c.force + '→' + c.target + ':' + c.mode) })); if (!r3.c.some(x => /威武军→.*:守/.test(x))) bad.push('军团令守没开去布防：' + JSON.stringify(r3)); }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
