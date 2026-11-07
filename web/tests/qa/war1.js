// 战争第一期（需求台账 R-139；2026-11-07 玩家：「整个打仗的系统太少了……完全学习一下十字军之王和钢铁雄心」）
// 人力池（募兵从池里出、每月回）、围城（每天涨进度、出事、粮尽、开城投降俘守将；强攻、撤围按钮真点）、将领阅历升级特质、
// 占领按月加战争进度、厌战掉民心、议和后停战期毁约名声大跌、俘虏索赎金放还处斩、陷敌将领赎回
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof siegeTick === 'function');
  const bad = [];
  const r1 = await p.evaluate(() => {
    const bad = [];
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.realm = { treasury: 500000 }; S.fisc = { kind: 'realm', base: { tianfu: 600000, shang: 200000, yan: 200000 }, pol: { tax: '常' } }; S.gov = { scope: 'realm', stats: { 民心: 60 } };
    S.popEst = { k: popKey(S), m: { 福州: { pop: 400000 }, 泉州: { pop: 300000 } } };
    S.territory = [{ place: '福州', troops: 3000 }, { place: '泉州', troops: 2000 }];
    S.unitTypes = [{ id: 'bu', name: '步军', size: 500, pay: 1, grain: 0.6, atk: 50, def: 50, shock: 40, org: 60, mob: 40, unit: '营' }];
    S.forces = [{ name: '威武军', leader: '王延钧', owner: '你', troops: 15000, morale: 65, orgNow: 70, train: 60, grain: 300000, at: '福州', status: '驻守', units: [{ tpl: 'bu', men: 15000 }] }];
    S.powers = [{ name: '南汉', leader: '刘䶮', seat: '广州', troops: '60000', stance: '敌' }];
    S.people = { 王延钧: { favor: 30, stats: { 统兵: { v: 60 } } } };
    // 人力池：治下丁壮三成；募兵从池里扣
    const M = mpOf(S); if (!M || !(M.max > 0)) bad.push('有户口却没算出人力池：' + JSON.stringify(M));
    else { const p0 = M.pool; const r = armyAct(S, 'raise', { force: '威武军', tpl: 'bu', n: 2 }); if (!r || mpOf(S).pool !== p0 - 1000) bad.push('募兵没从人力池里扣：' + p0 + '→' + mpOf(S).pool + ' ' + ORGMSG);
      S.mp.pool = 100; if (armyAct(S, 'raise', { force: '威武军', tpl: 'bu', n: 2 })) bad.push('人力池见底了还能募兵');
      S.mp.ym = Math.floor(ymOf(S.clock)) - 1; mpMonthly(S); if (!(S.mp.pool > 100)) bad.push('人力池每月没回'); }
    // 围城：宣战、到潮州探实守军后开始围城
    warStart(S, '南汉', warCBs(S, '南汉')[0] || '', false); const f = S.forces[0];
    const c = { force: '威武军', mode: '攻', target: '潮州', from: '福州', state: '待探报', turn: 2 }; S.campaigns = [c];
    const o1 = campResolve(S, c, { troops: 4000, quality: '中', general: '苏章', owner: '南汉', why: '史料' }).join('');
    if (c.state !== '围城' || !c.siege || !/围了潮州/.test(o1)) bad.push('兵临城下探实守军后没有围城：' + o1 + JSON.stringify(c));
    const t0 = arr(S.territory).length; const L = campaignTick(S, 10).join('；');
    if (!(c.siege.prog > 0) || !/进度/.test(L)) bad.push('围城十天进度没涨：' + L);
    if (arr(S.territory).length !== t0) bad.push('才围十天城就归你了');
    // 围到底：开城投降，俘守将
    let n = 0; while (c.state === '围城' && n++ < 40) campaignTick(S, 10);
    if (c.state !== '得手' || !S.territory.some(t => t.place === '潮州')) bad.push('围了四百天城还没下：' + JSON.stringify(c.siege && { p: c.siege.prog, d: c.siege.days }));
    if (!arr(S.prisoners).some(x => x.name === '苏章')) bad.push('城下了守将没被俘');
    if (!(S.gens && S.gens['王延钧'] && S.gens['王延钧'].xp > 0)) bad.push('围城得手将领没攒阅历');
    if (!(S.wars[0].took || []).includes('潮州')) bad.push('城下了战争没记上');
    // 占领按月加分、厌战
    const w = S.wars[0], sc0 = warScore(w), mx0 = S.gov.stats['民心']; for (let i = 0; i < 30; i++) { S.clock.m = (S.clock.m % 12) + 1; if (S.clock.m === 1) S.clock.y++; warMonthly2(S); }
    if (!(warScore(w) > sc0)) bad.push('占着潮州按月战争进度没涨：' + sc0 + '→' + warScore(w));
    if (!(w.exh >= 40) || !(S.gov.stats['民心'] < mx0)) bad.push('仗打了两年半，没厌战、民心没掉：' + JSON.stringify({ exh: w.exh, mx: S.gov.stats['民心'] }));
    // 议和后停战，毁约名声大跌
    S.renown = 100; warPeace(S, '南汉', '罢兵', true); if (!truceOf(S, '南汉')) bad.push('议和后没有停战期');
    warStart(S, '南汉', warCBs(S, '南汉')[0] || '', false); if (!(S.renown <= 80)) bad.push('停战期内开战名声没大跌：' + S.renown);
    // 再围一城，留给真点强攻、撤围
    S.forces[0].troops = 15000; S.campaigns = [{ force: '威武军', mode: '攻', target: '韶州', from: '潮州', state: '待探报', turn: 2 }]; campResolve(S, S.campaigns[0], { troops: 3000, quality: '中', general: '', owner: '南汉' });
    S.campaigns[0].siege.prog = 60;
    S.captive = [{ name: '王延禀', owner: '南汉', force: '威武军', ym: 1 }];
    VIEW = 'game'; TAB = 'army'; SIDE_FOLD = false; render();
    return { bad, tr: S.realm.treasury };
  });
  bad.push(...r1.bad);
  // 真点：强攻
  const qg = await p.$('[data-siege="强攻"]'); if (!qg) bad.push('围城时没有「强攻」按钮'); else { await qg.click(); await p.waitForTimeout(200); const r = await p.evaluate(() => ({ c: S.campaigns[0], b: arr(S.battles).slice(-1)[0], msg: ORGMSG })); if (!r.b || r.b.place !== '韶州' || !(r.b.rounds || []).length) bad.push('点了强攻没真打一仗（战报逐日）：' + JSON.stringify(r).slice(0, 300)); }
  // 撤围（重新围上再撤）
  await p.evaluate(() => { const c = S.campaigns[0]; if (c.state !== '围城') { c.state = '待探报'; c.target = '广州'; campResolve(S, c, { troops: 9000, quality: '中', owner: '南汉' }); } render(); });
  const cw = await p.$('[data-siege="撤围"]'); if (!cw) bad.push('围城时没有「撤围」按钮'); else { await cw.click(); await p.waitForTimeout(200); if (await p.evaluate(() => S.campaigns[0].state) !== '撤围') bad.push('点了撤围没撤'); }
  // 俘虏：索赎金、放还、处斩
  await p.evaluate(() => { S.prisoners = [{ name: '甲将', owner: '南汉' }, { name: '乙将', owner: '南汉' }, { name: '丙将', owner: '南汉' }]; render(); });
  for (const [act, n] of [['赎金', '甲将'], ['放还', '乙将'], ['处斩', '丙将']]) { const bt = await p.$(`[data-pris="${act}"][data-n="${n}"]`); if (!bt) { bad.push('俘虏没有「' + act + '」按钮'); continue; } const tr0 = await p.evaluate(() => S.realm.treasury); await bt.click(); await p.waitForTimeout(150);
    const r = await p.evaluate(n => ({ left: S.prisoners.some(x => x.name === n), tr: S.realm.treasury, att: dipOf(S, '南汉').att, dread: S.dread }), n); if (r.left) bad.push(act + '了俘虏还在');
    if (act === '赎金' && !(r.tr > tr0)) bad.push('索了赎金国库没进账'); if (act === '处斩' && !(r.dread > 0)) bad.push('处斩俘虏没人畏惧'); }
  // 陷敌将领赎回
  const sh = await p.$('[data-capt][data-n="王延禀"]'); if (!sh) bad.push('陷敌将领没有「赎回」按钮'); else { const tr0 = await p.evaluate(() => S.realm.treasury); await sh.click(); await p.waitForTimeout(150); const r = await p.evaluate(() => ({ c: arr(S.captive).length, tr: S.realm.treasury })); if (r.c || !(r.tr < tr0)) bad.push('赎回陷敌将领没成或没花钱：' + JSON.stringify(r)); }
  // 将领页、人力池显示
  const txt = await p.evaluate(() => document.body.innerText); if (!/可征丁壮/.test(txt)) bad.push('军务页没写人力池'); if (!/王延钧/.test(txt) || !/阅历/.test(txt)) bad.push('军务页没列将领阅历');
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
