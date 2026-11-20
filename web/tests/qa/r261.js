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
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
