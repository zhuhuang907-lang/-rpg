// 外交卡、战局、补给线、战争进度与议和（需求台账 R-142；2026-11-07 玩家：「仿照钢铁雄心和十字军之王……钢铁雄心的国策树不用，其他可以，继续做吧」）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof dipAct === 'function');
  const bad = await p.evaluate(() => {
    const bad = [];
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' }); S.chat = [{ role: 'gm', text: '开场' }];
    S.realm = { treasury: 500000 }; S.fisc = { kind: 'realm', base: { tianfu: 600000, shang: 200000, yan: 200000 }, pol: {} };
    S.forces = [{ name: '闽王亲军', leader: '王审知', owner: '你', troops: '30000', at: '福州', status: '驻守', grain: '900000' }];
    S.powers = [{ name: '吴越', troops: '40000', stance: '和' }, { name: '南汉', troops: '5000', stance: '冷' }, { name: '吴', troops: '90000', stance: '敌' }];
    const next = (k = 1) => { for (let i = 0; i < k; i++) { S.clock.m = (S.clock.m % 12) + 1; if (S.clock.m === 1) S.clock.y++; dipMonthly(S); warMonthly(S); } };
    // 修好：礼单照一年进项的百分之一从国库支，使者照路程走，到了态度变好
    const t0 = S.realm.treasury, a0 = dipOf(S, '吴越').att; if (!dipAct(S, '吴越', '修好')) bad.push('修好没派出使者：' + ORGMSG);
    if (S.realm.treasury !== t0 - 10000) bad.push('修好的礼单没照一年进项的百分之一扣：' + (t0 - S.realm.treasury));
    if (dipAct(S, '吴越', '结盟')) bad.push('使者还在路上又能派第二个');
    next(4); if (!(dipOf(S, '吴越').att > a0)) bad.push('修好后态度没变好：' + a0 + '→' + dipOf(S, '吴越').att);
    // 称臣：兵力是对方六倍，答应；往后每月纳贡进国库
    dipAct(S, '南汉', '称臣'); next(4); const D = dipOf(S, '南汉');
    if (!D.ties.includes('臣属')) bad.push('兵力悬殊令其称臣对方不肯：' + JSON.stringify(D));
    const t1 = S.realm.treasury; next(1); if (D.ties.includes('臣属') && !(S.realm.treasury > t1)) bad.push('臣属没有按月纳贡');
    // 结盟：对你敌视的不答应
    dipOf(S, '吴').att = -60; dipAct(S, '吴', '结盟'); next(5); if (dipOf(S, '吴').ties.includes('盟')) bad.push('敌视的吴也答应结盟');
    // 做官的不能办外交
    const keep = S.protagonist.role; S.protagonist.role = '福州刺史'; S.career = { office: '福州刺史' }; if (dipAct(S, '吴越', '修好')) bad.push('刺史也能自己遣使办外交'); S.protagonist.role = keep; S.career = {};
    // 开战：结了盟的跟着出兵；战争进度够了才能令其割地
    dipOf(S, '吴越').ties = ['盟']; dipOf(S, '吴越').att = 50; warStart(S, '吴', '吊民伐罪', false); const w = warOf(S, '吴');
    if (!w || !arr(w.allies).includes('吴越')) bad.push('盟友没跟着出兵：' + JSON.stringify(w));
    TAB = 'army'; VIEW = 'game'; SIDE_FOLD = false; render0(); const txt = document.body.innerText;
    if (!/战局/.test(txt) || !/战争进度/.test(txt)) bad.push('军务页没有战局、战争进度');
    if (/令其割让/.test(txt)) bad.push('战争进度不够也摆出了割地');
    w.won = 6; w.took = ['衢州']; if (warScore(w) < 6) bad.push('打赢六仗取一城战争进度还不够：' + warScore(w));
    // 补给线：兵马离家八百里外，打仗打折、每月掉人
    S.forces.push({ name: '远征军', leader: '王延翰', owner: '你', troops: '10000', at: '洪州', status: '驻守', grain: '100000' });
    const sl = supplyLine(S, S.forces[1]); if (!(sl.k < 1 && sl.li > 300)) bad.push('离家远的兵马补给没打折：' + JSON.stringify(sl));
    const tr0 = N0(S.forces[1].troops); S.attrYM = null; warMonthly(S); if (!(N0(S.forces[1].troops) < tr0)) bad.push('补给不继的兵马没有逐月逃散病亡');
    // 敌视、比你强、离得近的会来犯（六十个月里总会有一回）
    warPeace(S, '吴', '罢兵'); S.forces = [{ name: '闽王亲军', leader: '王审知', owner: '你', troops: '30000', at: '福州', status: '驻守' }]; dipOf(S, '吴').att = -90;
    let came = false; for (let i = 0; i < 80 && !came; i++) { next(1); dipOf(S, '吴').att = -90; came = !!warOf(S, '吴'); }
    if (!came) bad.push('敌视又强的邻国从不来犯');
    // 外交页摆出卡片和按钮
    TAB = 'power'; render0(); if (!document.querySelector('[data-dip="修好"]')) bad.push('势力页没有外交按钮');
    return bad;
  });
  // 各身份只做自己身份的事（2026-11-07 玩家：「土匪、流民统帅应该有其他面板，不能说是外交……商人、大臣不能做这些事情，他们也有自己的事情可以做」）
  const idb = await p.evaluate(() => {
    const bad = [], mk = (role, ex) => { S = newSave({ name: '张三', gender: '男', age: 35, role, gregorianYear: 1630, month: 6, day: 1, place: '延安府', polity: '明' }); S.chat = [{ role: 'gm', text: '开场' }]; Object.assign(S, ex || {}); VIEW = 'game'; SIDE_FOLD = false; TAB = 'power'; render0(); return document.body.innerText; };
    // 寨主：绿林往来，不是外交
    let txt = mk('黑风山寨主', { forces: [{ name: '黑风山弟兄', leader: '张三', owner: '你', troops: '600', at: '延安府', status: '驻守' }], money: { cash: 2000, unit: '两' }, circles: [{ name: '白虎寨', kind: '山寨', leader: '李四', size: '120' }] });
    if (/外交/.test(txt) || document.querySelector('[data-dip]')) bad.push('寨主也有外交');
    if (!/绿林往来/.test(txt) || !document.querySelector('[data-lulin="拜山"]')) bad.push('寨主没有绿林往来');
    if (dipAct(S, '白虎寨', '修好')) bad.push('寨主也能遣使修好');
    lulinAct(S, '白虎寨', '拜山'); if (!(S.money.cash < 2000)) bad.push('拜山没花钱');
    S.lulin['白虎寨'].ym = null; S.lulin['白虎寨'].att = 40; lulinAct(S, '白虎寨', '结拜'); if (!lulinOf(S, '白虎寨').ties.includes('结拜')) bad.push('交情够了结拜不成');
    bandOf(S).heat = 10; bandMonthly(S, 1); if (!(S.band.heat < 10 + 5)) bad.push('结拜兄弟没替你分走风头：' + S.band.heat);
    S.lulin['白虎寨'].ym = null; const h0 = bandOf(S).heat; lulinAct(S, '白虎寨', '收编'); if (!(N0(S.forces[0].troops) > 600) || arr(S.circles).some(c => c.name === '白虎寨') || !(S.band.heat > h0)) bad.push('收编小股没并进来、或官府没盯得更紧：' + JSON.stringify([S.forces[0].troops, S.band.heat]));
    // 义军首领：也是绿林往来
    txt = mk('闯王', { forces: [{ name: '闯营', leader: '张三', owner: '你', troops: '20000', at: '延安府', status: '驻守' }] });
    if (/外交/.test(txt) && document.querySelector('[data-dip]')) bad.push('义军首领也有外交');
    // 商人、大臣：没有外交，也没有绿林往来
    for (const r of ['盐商', '户部侍郎']) { txt = mk(r, { career: r === '户部侍郎' ? { office: '户部侍郎', rank: '正三品' } : {} }); if (document.querySelector('[data-dip]') || document.querySelector('[data-lulin]')) bad.push(r + '也有外交或绿林往来'); if (dipAct(S, '吴', '修好')) bad.push(r + '也能遣使'); }
    return bad;
  });
  bad.push(...idb);
  // 真点外交按钮
  await p.evaluate(() => { S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' }); S.chat = [{ role: 'gm', text: '开场' }]; S.realm = { treasury: 500000 }; S.fisc = { kind: 'realm', base: { tianfu: 600000 }, pol: {} }; TAB = 'power'; render0(); });
  const btn = await p.$('[data-dip="修好"]'); if (btn) { await btn.click(); await p.waitForTimeout(300); if (!/遣使往/.test(await p.evaluate(() => ORGMSG + document.body.innerText))) bad.push('点「修好」没派出使者'); }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
