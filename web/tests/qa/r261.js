// R-261：制度审查——童试三关、生员岁考、举人大挑（真点按钮）、冲锋要有仗打、招安过期、正文围城真立围城、别家易手改图、叛军各一色
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof examTiao === 'function');
  const r = await p.evaluate(() => {
    const mk = (y, m, role) => newSave({ name: '周文', gender: '男', age: 30, role: role || '读书人', gregorianYear: y, month: m, day: 1, place: '苏州府', polity: '清' });
    const s = mk(1750, 1); const n1 = examNext(s); examOf(s).tong = 1; const n2 = examNext(s); examOf(s).tong = 2; const n3 = examNext(s);
    const t = mk(1752, 3); t.exam = { lv: '生员', log: [] }; t.skills = { 文墨: { lv: 10 } }; let sk = ''; for (let k = 0; k < 6 && t.exam.lv === '生员'; k++) { t.exam.suiYm = null; t.clock.y = 1752 + k * 3; sk = examSuikao(t).join(); }
    const w = mk(1800, 5, '绿营兵丁'); w.rank = { lv: 0, merit: 0, side: 'army', army: '' }; S = w; const c0 = soldierAct(w, 'charge'), m0 = ORGMSG;
    const sg = mk(1800, 5, '总兵'); sg.forces = [{ name: '镇标', leader: '周文', troops: 3000, at: '苏州府' }]; S = sg; const br = resolveBattle(sg, { enemy: '太湖寇', enemyTroops: 800, place: '吴江县', terrain: '城池', attacker: '我', tactic: '围城', ourForces: ['镇标'] });
    const pw = mk(1800, 5); pw.powers = [{ name: '甲', troops: '9000', seat: '杭州府' }, { name: '乙', troops: '1000', seat: '湖州府', land: '湖州府' }]; for (let k = 0; k < 6; k++) { pw.turn = k; powerClash(pw, pw.powers[0], pw.powers[1], '攻'); if (pw.mapOwn && Object.keys(pw.mapOwn).length) break; }
    return { n: [n1 && n1.name, n2 && n2.name, n3 && n3.name], sk, lv: t.exam.lv, charge: [c0, m0], siege: br && [br.outcome, br.deadUs, br.siege, arr(sg.campaigns).some(c => c.state === '围城')], own: pw.mapOwn ? Object.values(pw.mapOwn).map(x => x.owner).join() : '', col: [ownerColor(pw, '某某叛军'), ownerColor(pw, '某某叛军'), ownerColor(pw, '另一支叛军')] };
  });
  const bad = [];
  if (r.n.join() !== '县试,府试,院试') bad.push('童试三关不对：' + r.n.join());
  if (r.lv !== '童生' || !/黜革/.test(r.sk)) bad.push('文墨极差的生员岁考没被黜革：' + r.lv + ' ' + r.sk);
  if (r.charge[0] || !/没有仗打/.test(r.charge[1])) bad.push('和平年月也能冲锋：' + r.charge.join());
  if (!r.siege || r.siege[0] !== '相持' || r.siege[1] !== 0 || !r.siege[2] || !r.siege[3]) bad.push('正文围城没真立围城：' + JSON.stringify(r.siege));
  if (!/甲/.test(r.own)) bad.push('别家攻取没改图：' + r.own);
  if (r.col[0] !== r.col[1] || !/^#/.test(r.col[0])) bad.push('同一支叛军颜色不稳');
  // 真点「赴吏部大挑」
  await p.evaluate(() => { const s = newSave({ name: '周文', gender: '男', age: 40, role: '举人', gregorianYear: 1790, month: 5, day: 1, place: '苏州府', polity: '清' }); s.exam = { lv: '举人', log: [], huiFail: 3 }; S = s; VIEW = 'game'; SIDE_FOLD = false; TAB = 'career'; render0(); });
  await p.waitForTimeout(400);
  if (!(await p.$('#bTiao'))) { await p.evaluate(() => { for (const t of ['skill', 'board', 'estate', 'trade']) { TAB = t; render0(); if (document.querySelector('#bTiao')) return; } }); }
  const has = await p.$('#bTiao');
  if (!has) bad.push('举人会试落第三回，看不到「赴吏部大挑」按钮');
  else { await p.click('#bTiao'); await p.waitForTimeout(300); const after = await p.evaluate(() => ({ log: arr(S.exam.log).map(x => x.text).join('|'), ym: S.exam.tiaoYm })); if (after.ym == null || !/大挑/.test(after.log)) bad.push('点了大挑没结果：' + JSON.stringify(after)); }
  // 宗亲继位：父皇驾崩太子即位改元；未立储照强弱定；太子薨储位空出；清君侧打赢登基
  const sc = await p.evaluate(() => { const mk = role => { const s = newSave({ name: '朱甲', gender: '男', age: 25, role, gregorianYear: 1420, month: 5, day: 1, place: '北京', polity: '明' }); s.household = [{ name: '朱父', relation: '父', age: 60 }, { name: '朱乙', relation: '弟', age: 20 }]; return s; };
    const a = mk('皇太子'); royalOf(a); a.household[0].dead = true; const ao = royalMonthly(a).join();
    const b = mk('皇子'); const R = royalOf(b); R.lostTo = '朱乙'; b.household[1].dead = true; const bo = royalMonthly(b).join();
    const c = mk('燕王'); const Rc = royalOf(c); Rc.rebel = 1; c.wars = [{ with: '明', cb: '清君侧', state: '交战', won: 7, lost: 0, took: [] }]; const co = royalMonthly(c).join();
    return { a: [ao, a.protagonist.role, a.eraName, a.eraFrom], b: [bo, R.lostTo], c: [co, c.protagonist.role, c.wars[0].state] }; });
  if (!/即皇帝位|即位/.test(sc.a[0]) || sc.a[1] !== '皇帝' || !sc.a[2] || sc.a[3] !== 1421) bad.push('父皇驾崩太子没即位改元：' + JSON.stringify(sc.a));
  if (!/储位/.test(sc.b[0]) || sc.b[1]) bad.push('太子薨储位没空出：' + JSON.stringify(sc.b));
  if (sc.c[1] !== '皇帝' || sc.c[2] !== '议和') bad.push('清君侧打赢没登基：' + JSON.stringify(sc.c));
  // 党争：势力照官位算；真点「贬谪党首」免掉他的官
  const fp = await p.evaluate(() => { const s = newSave({ name: '王审知', gender: '男', age: 50, role: '闽王', gregorianYear: 920, month: 5, day: 1, place: '福州', polity: '闽' }); s.org = { nodes: [{ name: '中书', depth: 1, posts: [{ title: '宰相', holder: '甲相' }, { title: '主事', holder: '乙吏' }, { title: '主事', holder: '丙吏' }] }] };
    s.factions = [{ name: '相党', leader: '甲相', members: '', grudge: 0 }, { name: '吏党', leader: '乙吏', members: '丙吏', grudge: 0 }]; const pw = [factionPower(s, s.factions[0]), factionPower(s, s.factions[1])]; S = s; VIEW = 'game'; SIDE_FOLD = false;
    for (const t of ['org', 'power', 'career', 'board', 'army', 'world', 'gov', 'court']) { TAB = t; render0(); if (document.querySelector('[data-facact="贬谪"]')) return { pw, tab: t }; } return { pw, tab: '' }; });
  if (!(fp.pw[0] > fp.pw[1])) bad.push('一个宰相的派系势力不比两个小吏大：' + fp.pw.join());
  if (!fp.tab) bad.push('看不到对付朋党的按钮');
  else { await p.click('[data-facact="贬谪"]'); await p.waitForTimeout(300); const h = await p.evaluate(() => S.org.nodes[0].posts[0].holder); if (h) bad.push('点了贬谪党首，宰相还在任：' + h); }
  // 秦王兼河南尹、父亲是在位皇帝：认皇子（能争储），主线目标照宗室给
  const qw = await p.evaluate(() => { const s = newSave({ name: '李从荣', gender: '男', age: 28, role: '秦王、河南尹、判六军诸卫事', gregorianYear: 932, month: 1, day: 1, place: '洛阳', polity: '后唐' }); s.household = [{ name: '李嗣源', relation: '父', age: 66 }]; const t = newSave({ name: '李甲', gender: '男', age: 28, role: '秦王、河南尹', gregorianYear: 932, month: 1, day: 1, place: '洛阳', polity: '后唐' }); return [royalKind(s), roleKey(s), royalKind(t)]; });
  if (qw.join() !== '皇子,贵,王') bad.push('秦王李从荣没认成皇子：' + qw.join());
  // 明宗933年十一月廿六驾崩：腊月就该死，不拖到934年
  const mz = await p.evaluate(() => { const s = newSave({ name: '李从荣', gender: '男', age: 29, role: '秦王', gregorianYear: 933, month: 11, day: 20, place: '洛阳', polity: '后唐' }); s.household = [{ name: '李嗣源', relation: '父', age: 67 }]; const a = figDeathTick(s).length; s.clock.m = 12; s.clock.d = 5; const b = figDeathTick(s).join(); return [a, b, s.household[0].dead]; });
  if (mz[0] !== 0 || !/李嗣源/.test(mz[1]) || !mz[2]) bad.push('明宗没照卒月去世：' + JSON.stringify(mz));
  const en = await p.evaluate(() => newEraName(newSave({ name: '李从荣', gender: '男', age: 29, role: '秦王', gregorianYear: 933, month: 12, day: 8, place: '洛阳', polity: '后唐' })));
  if (en !== '应顺') bad.push('新君改元没照史书下一年的年号：' + en);
  const cb = await p.evaluate(() => { const s = newSave({ name: '李从荣', gender: '男', age: 29, role: '皇帝', gregorianYear: 934, month: 2, day: 8, place: '洛阳', polity: '后唐' }); s.idm = 'emperor'; s.territory = [{ place: '凤翔府' }, { place: '洛阳' }]; s.powers = [{ name: '凤翔', seat: '凤翔', leader: '李从珂' }, { name: '吴', seat: '江都', leader: '杨溥' }]; return [warCBs(s, '凤翔').includes('讨逆'), warCBs(s, '吴').includes('讨逆')]; });
  if (cb.join() !== 'true,false') bad.push('境内藩镇抗命没有「讨逆」名分（或外国也给了）：' + cb.join());
  const kl = await p.evaluate(() => { const s = newSave({ name: '李从荣', gender: '男', age: 29, role: '皇帝', gregorianYear: 934, month: 2, day: 8, place: '洛阳', polity: '后唐' }); s.people = { 王思同: { role: '西京留守' } }; s.forces = [{ name: '西面行营', leader: '王思同', troops: 15000, at: '岐山' }]; try { applyReply(s, { forces: [{ name: '西面行营', leader: '王子才', troops: 15000, at: '岐山' }] }, ''); } catch (e) { return 'err ' + e.message; } return s.forces.find(f => f.name === '西面行营').leader; });
  if (kl !== '王思同') bad.push('记账把统帅王思同改成了生人：' + kl);
  const pc = await p.evaluate(() => { const s = newSave({ name: '李从荣', gender: '男', age: 29, role: '皇帝', gregorianYear: 934, month: 2, day: 8, place: '洛阳', polity: '后唐' }); s.idm = 'emperor'; s.territory = [{ place: '凤翔府' }, { place: '太原府' }]; s.powers = [{ name: '凤翔', seat: '凤翔', land: '凤翔府', leader: '李从珂' }, { name: '河东', seat: '太原', land: '太原府', leader: '石敬瑭' }]; s.wars = [{ with: '凤翔军', state: '交战' }]; const M = mapUnits(s), f = n => { const u = M.L2.find(x => x.n === n); return u ? (M.reg(u) || {}).name : '?'; }; return [f('凤翔府'), f('太原府')]; });
  if (pc.join() !== '凤翔,后唐') bad.push('交战的凤翔没另上色、听命的河东却另上色：' + pc.join());
  const lp = await p.evaluate(() => dayIdx({ y: 934, m: 2, d: 10 }) - dayIdx({ y: 934, m: 1, d: 30, leap: true }));
  if (lp !== 10) bad.push('闰正月三十到二月初十不是十天：' + lp);
  // 别国的地方记账记不成自己的地盘
  const fl = await p.evaluate(() => { const s = newSave({ name: '李从荣', gender: '男', age: 29, role: '皇帝', gregorianYear: 933, month: 12, day: 8, place: '洛阳', polity: '后唐' }); return [foreignLand(s, '扬州（淮南）'), foreignLand(s, '河南府洛阳县（京畿）')]; });
  if (fl.join() !== 'true,false') bad.push('扬州（吴）认成后唐的地盘，或洛阳认成别国：' + fl.join());
  // 舆图：932 年蔡州、颍州归后唐（内置史料以前漏了，染成吴）
  const cz = await p.evaluate(() => { const R = realmsAt(932, 5); return [114.35, 115.81].map((x, i) => (R.of(x, [33.0, 32.89][i]) || {}).name); });
  if (cz.join() !== '后唐,后唐') bad.push('932年蔡州、颍州没归后唐：' + cz.join());
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
