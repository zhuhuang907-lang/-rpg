// 臣子线（需求台账 R-149；2026-11-07 玩家：「对于臣子的系统……要增加，他是太少了……只给一个壳子」）
// 假 AI 出公事和送钱的人；真点：公事挑办法（严办、自垫）照本事和办法定成败、考成和国势变；收钱、回绝；被参：认罪、托人说情、上本自辩（当面说）；
// 上疏言事（当面说）；派系拉人入伙；过了月份没办的误期扣分；年底评考成，卓异升迁有望，两回劣罢官
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof dutyPlan === 'function');
  const bad = [], ev = (f, a) => p.evaluate(f, a), click = async (sel, what) => { const el = await p.$(sel); if (!el) { bad.push('没有「' + what + '」按钮'); return false; } await p.click(sel); await p.waitForFunction(() => !PARLEY_P, null, { timeout: 10000 }); await p.waitForTimeout(120); return true; };
  await ev(() => {
    S = newSave({ name: '郑板桥', gender: '男', age: 50, role: '潍县知县', real: true, gregorianYear: 1748, month: 3, day: 1, place: '潍县', polity: '清' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.career = { office: '潍县知县', rank: '正七品', superior: '莱州知府' }; S.money = { cash: 800, unit: '两' }; S.econ = { unit: '两', rice: 1.5, wage: 0.05, caravan: 300, protect: 10, pay: 1.5 };
    S.gov = { scope: 'local', stats: { 民心: 55, 治安: 50, 积案: 30, 灾情: 40, 腐败: 30 } }; S.people = { 王知府: { favor: 10, role: '莱州知府' }, 李御史: { favor: -60, role: '御史' } };
    S.factions = [{ name: '清流', leader: '刘统勋' }];
    window.REPLY = { duties: [{ kind: '赈灾', title: '城东饥民聚在县衙前讨粮', who: '张乡约', why: '去年旱' }, { kind: '断案', title: '审王李两家争田案', who: '王秀才', why: '积了半年' }], bribe: { who: '盐商汪掌柜', ask: '把他欠的盐课缓一缓', kind: '免税' } };
    window.callClaude = async () => ({ text: JSON.stringify(REPLY) }); VIEW = 'game'; TAB = 'board'; SIDE_FOLD = false; render(); });
  if (!(await ev(() => isOfficer(S) && dutyDue(S)))) bad.push('知县这个月没排上公事');
  await ev(async () => { await dutyPlan(S); render(); });
  { const r = await ev(() => ({ d: arr(S.duties).length, b: !!S.bribe })); if (r.d !== 2 || !r.b) bad.push('公事、送钱的人没拟出来：' + JSON.stringify(r)); }
  const ids = await ev(() => S.duties.map(d => d.id));
  { const k0 = await ev(() => offOf(S).kc); if (await click(`[data-duty="${ids[0]}"][data-way="严办"]`, '严办')) { const r = await ev(id => ({ st: S.duties.find(d => d.id === id).state, kc: offOf(S).kc }), ids[0]); if (!/办成|没办好/.test(r.st) || r.kc === k0) bad.push('严办公事没出结果、考成没变：' + JSON.stringify(r)); } }
  { const c0 = await ev(() => S.money.cash); if (await click(`[data-duty="${ids[1]}"][data-way="自垫"]`, '自垫')) { const r = await ev(() => S.money.cash); if (!(r < c0)) bad.push('自己垫钱办公事没花钱'); } }
  { const c0 = await ev(() => S.money.cash); if (await click('[data-brib="yes"]', '收下')) { const r = await ev(() => ({ c: S.money.cash, g: offOf(S).graft })); if (!(r.c > c0) || !(r.g > 0)) bad.push('收了钱没进腰包、没留把柄：' + JSON.stringify(r)); } }
  // 被参：认罪
  await ev(() => { S.impeach = { by: '李御史', charge: '贪墨', ym: Math.floor(ymOf(S.clock)) }; render(); });
  if (await click('[data-imp="认罪"]', '上本认罪')) { if (await ev(() => !!S.impeach)) bad.push('认罪了参案还挂着'); }
  // 被参：上本自辩（AI 判允）
  await ev(() => { S.impeach = { by: '李御史', charge: '贪墨', ym: Math.floor(ymOf(S.clock)) }; REPLY = { verdict: '允', reply: '所参不实，着毋庸议。', why: '查无实据' }; render(); });
  { await ev(() => { document.querySelector('[data-psay="impeach:李御史"]').closest('details').open = true; }); await p.fill('[data-psay="impeach:李御史"]', '臣在潍县，开仓赈饥，账目俱在，可遣员查核。李御史所参，皆道听途说。');
    if (await click('[data-parley="impeach"]', '上本自辩')) { if (await ev(() => !!S.impeach)) bad.push('自辩说成了参案还挂着'); } }
  // 上疏言事
  { const r0 = await ev(() => { S.talkYM = {}; return num(S.renown) || 0; }); await ev(() => { REPLY = { verdict: '允', reply: '所奏甚是，着照所请。', why: '切中时弊' }; render(); document.querySelector('[data-psay="memo2:上"]').closest('details').open = true; });
    await p.fill('[data-psay="memo2:上"]', '潍县连年旱蝗，请缓征本年钱粮，以苏民困，俟丰年带征。'); if (await click('[data-parley="memo2"]', '上疏言事')) { if (!((await ev(() => num(S.renown) || 0)) > r0)) bad.push('奏疏蒙嘉纳，名声没涨'); } }
  // 派系拉人
  await ev(() => { S.facInvite = { fac: '清流', leader: '刘统勋', ym: 1 }; render(); }); if (await click('[data-facinv="yes"]', '入伙')) { if ((await ev(() => S.career.faction)) !== '清流') bad.push('入了派系没记上'); }
  // 误期：下个月重拟时，上个月没办的算误了
  { const r = await ev(async () => { S.duties = arr(S.duties).concat([{ id: 'old1', kind: '催科', title: '旧事', ym: Math.floor(ymOf(S.clock)), state: '待办' }]); S.clock.m += 1; await dutyPlan(S); return arr(S.duties).map(d => d.id + ':' + d.state); }); if (!r.includes('old1:误了')) bad.push('上个月没办的公事没算误期：' + JSON.stringify(r)); }
  // 年底考成：卓异；两回劣罢官
  { const r = await ev(() => { const O = offOf(S); O.kc = 90; S.gov.stats['积案'] = 0; S.clock.m = 12; O.ym = null; O.kcY = null; S.impeach = null; offMonthly(S); const g1 = S.career.evaluation;
      O.kc = 5; S.gov.stats['民心'] = 10; S.gov.stats['积案'] = 80; S.clock.y++; O.ym = null; offMonthly(S); O.kc = 5; S.clock.y++; O.ym = null; S.impeach = null; offMonthly(S); return { g1, office: S.career.office, role: S.protagonist.role }; });
    if (r.g1 !== '卓异') bad.push('考成九十年底没评卓异：' + r.g1); if (r.office) bad.push('连着两年考成劣还没罢官：' + JSON.stringify(r)); }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
