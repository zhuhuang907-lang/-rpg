// 各身份的日子（CLAUDE.md「人事与职权」各身份的日子）：官军军阶照朝代、功劳与保题升迁、饷与欠饷、营中操练探家赌钱讨饷吃空饷；商人会馆远货伙计关卡赊账；人人私下的日子名目照身份、花钱照行情、身子会病要请郎中（真点按钮）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof campAct === 'function');
  const bad = [];
  const mk = (role, y, m, pl, pol, nm, extra) => p.evaluate(([role, y, m, pl, pol, nm, extra]) => { S = newSave({ name: nm, gender: (extra && extra.gender) || '男', age: 30, role, gregorianYear: y, month: m, day: 1, place: pl, polity: pol }); S.chat = [{ role: 'gm', text: '开场。' }]; S.money = { cash: 5000, unit: '两' };
    S.econ = { v: 2, y, pl: geoCenter(S), unit: '两', rice: 1.2, wage: 0.05, landPrice: 8, yield: 2, rentRate: 0.5, caravan: 300, ransom: 500, protect: 20, cloth: 1.5, interest: 0.03, juan: 108, pay: 1.8, payOff: 6, feast: 3, opera: 0.5, incense: 0.3, doctor: 0.8 }; delete extra.gender; Object.assign(S, extra || {}); TAB = 'board'; VIEW = 'game'; SIDE_FOLD = false; render0(); return document.body.innerText; }, [role, y, m, pl, pol, nm, extra || {}]);
  const next = (n = 1) => p.evaluate(n => { for (let i = 0; i < n; i++) { S.clock.m = S.clock.m % 12 + 1; if (S.clock.m === 1) S.clock.y++; S.turn = (S.turn || 0) + 1; campMonthly(S); mercMonthly(S); privMonthly(S); } render0(); }, n);
  // 1 军阶照朝代
  const lad = await p.evaluate(() => [1758, 1600, 1450, 1300, 1100, 700, 150].map(y => ARMY_LADDER(y).sys + ':' + ARMY_LADDER(y).L.slice(-2).join('/')));
  if (!/绿营:总兵\/提督/.test(lad[0]) || !/营兵/.test(lad[1]) || !/卫所/.test(lad[2]) || !/万户/.test(lad[3]) || !/禁军/.test(lad[4]) || !/府兵/.test(lad[5]) || !/部曲/.test(lad[6])) bad.push('军阶没照朝代：' + lad);
  // 2 清绿营把总：营中页、饷、保题、吃空饷
  await mk('徐州镇标右营把总', 1758, 3, '徐州', '清', '韩成');
  const r0 = await p.evaluate(() => ({ r: S.rank, h: /营中/.test(document.body.innerText), pay: armyPay(S, S.rank) }));
  if (!r0.r || r0.r.lv !== 3 || !r0.h || !(r0.pay > 0)) bad.push('把总没认成武官、没有营中页或没饷：' + JSON.stringify(r0));
  await p.click('button[data-camp="drill"]'); if (!(await p.evaluate(() => /操练/.test(arr(S.chronicle).slice(-1)[0].what)))) bad.push('操练没记上');
  await p.fill('#campAmt', '50'); await p.click('button[data-camp="promo"]');
  const pr = await p.evaluate(() => ({ ask: S.rank.ask, cash: S.money.cash })); if (!pr.ask || pr.cash !== 4950) bad.push('求保题没记上或打点没扣钱：' + JSON.stringify(pr));
  await next(1); const pr2 = await p.evaluate(() => ({ ask: S.rank.ask, lv: S.rank.lv, role: S.protagonist.role, deny: S.rank.denyYM })); if (pr2.ask || !(pr2.lv === 4 && /千总/.test(pr2.role) || pr2.deny != null)) bad.push('保题下个月没定准驳：' + JSON.stringify(pr2));
  await p.evaluate(() => { TAB = 'board'; render0(); }); await p.click('button[data-camp="skim"]'); const c0 = await p.evaluate(() => S.money.cash); await next(1); const c1 = await p.evaluate(() => ({ cash: S.money.cash, skim: S.rank.skim, lv: S.rank.lv }));
  if (!(c1.cash > c0) && c1.skim) bad.push('吃空饷没进钱：' + JSON.stringify([c0, c1]));
  // 3 明卫所军士：功劳够了自己升到总旗，往上要保题
  await mk('宣府前卫军士', 1450, 3, '宣府', '明', '李二');
  const up = await p.evaluate(() => { let msg = ''; for (let i = 0; i < 40; i++) { S.clock.m = (i % 12) + 1; S.clock.y = 1450 + Math.floor(i / 12); S.turn = i; S.wound = null; const r = soldierAct(S, 'charge'); if (r) msg = r; } return { lv: S.rank.lv, role: S.protagonist.role, msg }; });
  if (up.lv !== 3 || !/保题/.test(up.msg)) bad.push('卫所军士阵上功劳该升到试百户前停下、要保题：' + JSON.stringify(up));
  // 4 商人：入会馆、走远货、赊账，几个月后回来
  await mk('扬州盐商', 1758, 3, '扬州', '清', '江春');
  await p.click('button[data-merc="guild"]'); await p.fill('#mercAmt', '1000'); await p.click('button[data-merc="run"]'); await p.fill('#mercAmt', '300'); await p.click('button[data-merc="credit"]'); await p.click('button[data-merc="hire"]'); await p.click('button[data-merc="toll"]');
  const m0 = await p.evaluate(() => ({ M: S.merc, cash: S.money.cash })); if (!m0.M.guild || m0.M.runs.length !== 1 || m0.M.credit.length !== 1 || m0.M.hands !== 1) bad.push('商人按钮没落账：' + JSON.stringify(m0));
  await next(5); const m1 = await p.evaluate(() => ({ M: S.merc, ch: arr(S.chronicle).map(x => x.what).join('|') }));
  if (m1.M.runs.length || m1.M.credit.length) bad.push('远货、赊账到期没结：' + JSON.stringify(m1.M));
  // 5 私下的日子：名目照身份
  const lab = async (role, y, m, pol, pl, ex) => { await mk(role, y, m, pl, pol, 'x', ex); return p.evaluate(() => privActs(S).map(x => x[1]).join('/')); };
  const emp = await lab('唐太宗', 640, 8, '唐', '长安'), emp0 = await lab('隋文帝', 600, 8, '隋', '大兴'), con = await lab('贵妃', 1700, 3, '清', '京师', { gender: '女' }), wom = await lab('苏州府人家的媳妇', 1700, 3, '清', '苏州', { gender: '女' }), ban = await lab('梁山泊寨主', 1120, 5, '宋', '郓州'), monk = await lab('灵隐寺住持', 1100, 3, '宋', '杭州'), off = await lab('江都县知县', 1758, 8, '清', '扬州', { career: { office: '江都县知县' } });
  if (/中秋/.test(emp0)) bad.push('隋代还没有中秋节：' + emp0); if (!/赐宴群臣/.test(emp) || !/校猎/.test(emp) || !/谒太庙/.test(emp) || !/过中秋/.test(emp)) bad.push('皇帝私下的名目不对：' + emp);
  if (!/设宴请诸妃/.test(con) || /赌钱/.test(con)) bad.push('后妃的名目不对：' + con);
  if (!/归宁省亲/.test(wom) || /习武|赌钱/.test(wom)) bad.push('女子的名目不对：' + wom);
  if (!/聚众饮酒/.test(ban)) bad.push('寨主的名目不对：' + ban);
  if (!/诵经修行/.test(monk) || /赌钱|看戏|吃酒/.test(monk)) bad.push('僧人的名目不对：' + monk);
  if (!/宴请同僚/.test(off) || /赌钱/.test(off) || !/过中秋/.test(off)) bad.push('清代知县的名目不对（官员禁赌）：' + off);
  await p.evaluate(() => { S.people = { 刘师爷: { role: '刑名幕友', where: '', favor: 10 } }; render0(); });
  await p.click('button[data-priv="feast"]'); const fe = await p.evaluate(() => ({ f: S.people.刘师爷.favor, cash: S.money.cash })); if (fe.f !== 12 || fe.cash !== 5000 - 9) bad.push('宴请没花钱（家资厚的照三桌算）或身边的人情分没动：' + JSON.stringify(fe));
  await p.click('button[data-priv="fest"]'); if (!(await p.evaluate(() => /中秋/.test(arr(S.chronicle).slice(-1)[0].what)))) bad.push('过节没照节令办');
  // 6 身子：劳累会病、请郎中治好
  const sk = await p.evaluate(() => { S.body = { strain: 10 }; S.protagonist.age = 70; for (let i = 0; i < 24 && !(S.body.sick); i++) { S.clock.m = S.clock.m % 12 + 1; S.turn++; privMonthly(S); } const got = S.body.sick; S.body.sick = got ? { ...got, lv: '轻' } : null; S.priv = {}; render0(); return got; });
  if (!sk) bad.push('劳累的老人两年里一次没病'); else { await p.click('button[data-priv="doctor"]'); if (await p.evaluate(() => !!S.body.sick)) bad.push('请了郎中病没好'); }
  // 7 旧存档的行情表没有新条目就重推；推的格式里有饷例和酒席价
  const ed = await p.evaluate(async () => { S.econ = { y: S.clock.y, pl: geoCenter(S), unit: '两', rice: 1 }; let pr = ''; const oc = callClaude; callClaude = async x => { pr = x; return { text: '{}' }; }; try { await econDS(S).catch(() => {}); } finally { callClaude = oc; } return { due: econDue(Object.assign({}, S, { econ: { y: S.clock.y, pl: geoCenter(S), unit: '两' } })), pay: /"pay":null/.test(pr) && /payOff/.test(pr) && /酒席/.test(pr) }; });
  if (!ed.due || !ed.pay) bad.push('旧行情表不重推、或格式里没有饷例酒席：' + JSON.stringify(ed));
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
