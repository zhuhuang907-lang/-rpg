// 百姓线（需求台账 R-146 第三期）与国债商路（R-146 第二期）
// 全真点：一家每月吃穿照人口米价扣钱、钱不够挨饿饿病；佃田（劳力上限、押租）秋收分到手；借钱、还债、到期逼债、还不上卖田或卖身；胥吏加派（交了、告官当面说）；捐出身；投军；逃荒成流民能拉队伍；
// 一方之主借国债（上限、付息、到期失信）、开商路（商税涨、开战就断）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof hhMonthly === 'function');
  const bad = [], ev = (f, a) => p.evaluate(f, a), click = async (sel, what) => { const el = await p.$(sel); if (!el) { bad.push('没有「' + what + '」按钮'); return false; } await p.click(sel); await p.waitForFunction(() => !PARLEY_P, null, { timeout: 10000 }); await p.waitForTimeout(120); return true; };
  const month = () => ev(() => { S.clock.m = (S.clock.m % 12) + 1; if (S.clock.m === 1) S.clock.y++; hhMonthly(S); render(); });
  await ev(() => {
    S = newSave({ name: '张三', gender: '男', age: 30, role: '佃农', real: false, gregorianYear: 1757, month: 3, day: 1, place: '江都', polity: '清' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 2;
    S.money = { cash: 20, unit: '两' }; S.econ = { unit: '两', rice: 1.5, wage: 0.05, landPrice: 10, yield: 2, rentRate: 0.5, interest: 0.03, juan: 100 };
    S.household = [{ name: '张王氏', relation: '妻', age: 28 }, { name: '张大', relation: '子', age: 15 }];
    window.REPLY = { verdict: '允', reply: '加派无据，着即免征。', why: '怕上司知道' }; window.callClaude = async () => ({ text: JSON.stringify(REPLY) });
    VIEW = 'game'; TAB = 'board'; SIDE_FOLD = false; render(); });
  if (!(await ev(() => isCommoner(S)))) bad.push('佃农不算百姓');
  // 每月吃穿
  { const r0 = await ev(() => ({ c: S.money.cash, need: hhNeed(S) })); await month(); const c1 = await ev(() => S.money.cash); if (!(Math.abs((r0.c - c1) - r0.need) < 0.01)) bad.push('一家吃穿没照人口米价扣：' + JSON.stringify({ ...r0, c1 })); }
  // 佃田：劳力上限
  await p.fill('#hhAmt', '100'); await click('[data-hh="lease"]', '佃田'); if ((await ev(() => hhOf(S).lease))) bad.push('两个劳力也佃得下一百亩');
  await p.fill('#hhAmt', '10'); if (await click('[data-hh="lease"]', '佃田')) { if ((await ev(() => hhOf(S).lease)) !== 10) bad.push('佃十亩没佃成'); }
  // 秋收
  { const r = await ev(() => { S.clock.m = 9; const c0 = S.money.cash = 100; hhOf(S).ym = null; hhMonthly(S); return { c0, c1: S.money.cash, need: hhNeed(S) }; }); if (!(r.c1 > r.c0 - r.need)) bad.push('九月秋收佃田没分到手：' + JSON.stringify(r)); }
  // 借钱、还债
  await p.fill('#hhAmt', '30'); { const c0 = await ev(() => S.money.cash); if (await click('[data-hh="borrow"]', '借钱')) { const r = await ev(() => ({ c: S.money.cash, d: hhOf(S).debt.length })); if (!(r.c > c0) || !r.d) bad.push('借钱没借到：' + JSON.stringify(r)); } }
  if (await click('[data-hh="repay"]', '还债')) { if ((await ev(() => hhOf(S).debt.length))) bad.push('现钱够还，还了债还挂着'); }
  // 到期还不上：没田卖身
  { const r = await ev(() => { const H = hhOf(S); H.debt = [{ from: '钱庄', amt: 500, rate: 0.03, ym: 1, due: Math.floor(ymOf(S.clock)) }]; S.money.cash = 0; S.land = null; const trace = []; for (let i = 0; i < 3; i++) { S.clock.m = (S.clock.m % 12) + 1; if (S.clock.m === 1) S.clock.y++; trace.push(JSON.stringify(hhMonthly(S)) + '|' + isCommoner(S) + '|' + S.money.cash); } return { role: S.protagonist.role, d: H.debt.length, hunger: H.hunger, sick: S.household.some(m => m.sick), trace }; });
    if (!/佃仆|抵债/.test(r.role)) bad.push('欠债到期还不上，没田也没卖身：' + JSON.stringify(r)); if (!r.sick) bad.push('挨饿两个月没人病倒：' + JSON.stringify(r)); }
  // 胥吏加派：告官（当面说）
  await ev(() => { S.protagonist.role = '自耕农'; S.land = { mu: 20, rent: 0.5, loans: [] }; hhOf(S).levy = { amt: 2, who: '县里的胥吏', ym: 1 }; S.money.cash = 50; render(); document.querySelector('[data-psay="sue:县里的胥吏"]').closest('details').open = true; });
  await p.fill('[data-psay="sue:县里的胥吏"]', '小民田只二十亩，正赋已完，此项加派并无上宪明文，求老爷做主。'); if (await click('[data-parley="sue"]', '写状子告官')) { if (await ev(() => !!hhOf(S).levy)) bad.push('告官说成了加派还挂着'); }
  await ev(() => { hhOf(S).levy = { amt: 2, who: '本地豪强', ym: 1 }; render(); }); if (await click('[data-hh="levyPay"]', '忍气交了')) { if (await ev(() => !!hhOf(S).levy)) bad.push('交了加派还挂着'); }
  // 捐出身
  await ev(() => { S.money.cash = 150; render(); }); if (await click('[data-hh="juan"]', '捐个出身')) { const r = await ev(() => ({ c: S.money.cash, role: S.protagonist.role })); if (!(r.c < 150) || !/捐/.test(r.role)) bad.push('捐出身没成：' + JSON.stringify(r)); }
  // 逃荒成流民，能拉队伍
  if (await click('[data-hh="flee"]', '逃荒')) { const r = await ev(() => ({ role: S.protagonist.role, cp: canParty(S) })); if (!/流民/.test(r.role) || !r.cp) bad.push('逃荒后不是流民或拉不了队伍：' + JSON.stringify(r)); }
  // 投军
  await ev(() => { S.protagonist.role = '佃农'; S.rank = null; render(); }); if (await click('[data-hh="enlist"]', '投军')) { if (!(await ev(() => !!soldierOf(S)))) bad.push('投了军不算兵'); }
  // 国债、商路
  await ev(() => { S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.realm = { treasury: 100000 }; S.fisc = { kind: 'realm', unit: '贯', base: { tianfu: 600000, shang: 200000, za: 50000 }, pol: { tax: '常', yan: '照旧', coin: '足值', cp: false, yao: '常' }, works: [], kc: { due: 0, paid: 0 }, price: 100 }; S.money = { cash: 0, unit: '贯' };
    S.powers = [{ name: '吴越', leader: '钱镠', seat: '杭州', troops: '40000', stance: '和' }, { name: '南汉', leader: '刘䶮', seat: '广州', troops: '60000', stance: '冷' }]; VIEW = 'game'; TAB = 'board'; render(); });
  await p.fill('#loanAmt', '100000'); { const t0 = await ev(() => S.realm.treasury); if (await click('[data-loan="富商"]', '向富商借')) { const r = await ev(() => ({ t: S.realm.treasury, l: arr(S.fisc.loans).length })); if (!(r.t > t0) || !r.l) bad.push('借国债没借到：' + JSON.stringify(r)); } }
  await p.fill('#loanAmt', '9999999'); await click('[data-loan="钱庄"]', '向钱庄借'); if ((await ev(() => arr(S.fisc.loans).length)) !== 1) bad.push('借超过一年进项六成也借到了');
  { const r = await ev(() => { const t0 = S.realm.treasury; S.clock.m++; loanMonthly(S); return { paid: t0 - S.realm.treasury }; }); if (!(r.paid > 0)) bad.push('国债每月没付息'); }
  { const r = await ev(() => { S.fisc.loans[0].due = Math.floor(ymOf(S.clock)); S.realm.treasury = 0; const n0 = num(S.renown) || 0; S.renown = 50; S.clock.m++; loanMonthly(S); return { ren: S.renown, no: S.fisc.noLoanTill, dis: S.fisc.distrust }; }); if (!(r.ren < 50) || !r.no) bad.push('国债到期还不上没失信：' + JSON.stringify(r)); }
  await ev(() => { S.realm.treasury = 100000; S.fisc.noLoanTill = null; render(); });
  { const bt = await ev(() => [...document.querySelectorAll('[data-route]')].map(e => e.dataset.route)); if (!bt.length) bad.push('没有能开商路的邻国'); else { const tg = bt[0]; if (await click(`[data-route="${tg}"]`, '开商路')) { const r = await ev(tg => ({ r: arr(S.fisc.routes).map(x => x.to), sh: (() => { S.fisc.ym = null; S.fisc.distrust = null; S.fisc.loans = []; fiscalMonthly(S); return S.fisc.last.R['商税']; })() }), tg);
      const base = await ev(tg => { const keep = S.fisc.routes; S.fisc.routes = []; S.fisc.ym = null; fiscalMonthly(S); const v = S.fisc.last.R['商税']; S.fisc.routes = keep; return v; }, tg); if (!r.r.includes(tg) || !(r.sh > base)) bad.push('开了商路商税没涨：' + JSON.stringify({ r, base }));
      const cut = await ev(tg => { warStart(S, tg, warCBs(S, tg)[0] || '', false); routeMonthly(S); return S.fisc.routes.find(x => x.to === tg).cut; }, tg); if (!cut) bad.push('和开了商路的那家开战，商路没断'); } } }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
