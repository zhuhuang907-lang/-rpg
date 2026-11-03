// 各种身份过日子（CLAUDE.md「人事与职权」各身份的营生、「人物」女性线）：庙号帝号认作皇帝；行情表一回问 DeepSeek；
// 土匪劫道绑票收孝敬寨规、风头高了官府围剿、求招安受招安改官身；地主收租加减租置田放债、抗租；佃户打短工；
// 主母查账立家规女红结交；后妃侍奉打点求晋位；女子不应科举；局面页「身份」卡写能办、要请示、办不到（真点按钮）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof bandAct === 'function');
  const bad = [];
  const mk = async (role, y, pl, pol, g, nm, extra) => p.evaluate(([role, y, pl, pol, g, nm, extra]) => { S = newSave({ name: nm, gender: g, age: 30, role, gregorianYear: y, month: 5, day: 1, place: pl, polity: pol }); S.chat = [{ role: 'gm', text: '开场。' }]; S.money = { cash: 2000, unit: '两' };
    S.econ = { y, pl: geoCenter(S), unit: '两', rice: 1.2, wage: 0.05, landPrice: 8, yield: 2, rentRate: 0.5, caravan: 300, ransom: 500, protect: 20, cloth: 1.5, interest: 0.03 }; Object.assign(S, extra || {}); TAB = 'board'; VIEW = 'game'; SIDE_FOLD = false; render0(); return document.body.innerText; }, [role, y, pl, pol, g, nm, extra]);
  // 0 庙号帝号认作皇帝
  const r0 = await p.evaluate(() => ['隋文帝', '唐太宗', '康熙帝', '明成祖'].map(r => { const s = newSave({ name: 'x', gender: '男', age: 40, role: r, gregorianYear: 1700, month: 1, day: 1, place: '京师', polity: '清' }); return identityOf(s).ruler; }).concat(['禅宗僧人', '宗室子弟'].map(r => { const s = newSave({ name: 'x', gender: '男', age: 40, role: r, gregorianYear: 1700, month: 1, day: 1, place: '京师', polity: '清' }); return !identityOf(s).ruler; })));
  if (r0.some(x => !x)) bad.push('庙号帝号认皇帝不对：' + JSON.stringify(r0));
  // 1 行情表一回问 DeepSeek，没有示例数
  const r1 = await p.evaluate(async () => { const s = newSave({ name: '王守田', gender: '男', age: 40, role: '邯郸县乡绅地主', gregorianYear: 1600, month: 5, day: 1, place: '邯郸县', polity: '明' }); s.money = { cash: 100, unit: '两' }; let asked = ''; const oc = callClaude; callClaude = async pr => { asked = pr; return { text: JSON.stringify({ rice: 0.8, wage: 0.04, landPrice: 7, yield: 2, rentRate: 5, caravan: 300, ransom: 400, protect: 15, cloth: 1, interest: 3, myLand: 320, basis: '万历年间华北' }) }; }; try { await econDS(s); } finally { callClaude = oc; } return { e: s.econ, land: s.land, ex: /"rice":null/.test(asked) && !/"rice":\d/.test(asked) }; });
  if (!r1.e || r1.e.rentRate !== 0.5 || r1.e.interest !== 0.03) bad.push('行情表没记下、或成数没折对：' + JSON.stringify(r1.e)); if (!r1.land || r1.land.mu !== 320) bad.push('地主名下的田没照行情表立账'); if (!r1.ex) bad.push('行情表的格式里有示例数');
  // 2 土匪
  let t = await mk('太行山山寨寨主', 1630, '邯郸县', '明', '男', '李黑虎', { forces: [{ name: '黑虎寨', leader: '李黑虎', owner: '你', troops: 300, at: '邯郸县', status: '驻守' }] });
  if (!/山寨/.test(t) || !/下山劫道/.test(t) || /开发农田/.test(t)) bad.push('山寨页没有劫道那一套，或还摆着开发农田');
  if (!/能办/.test(t) || !/办不到/.test(t)) bad.push('局面页没有身份卡（能办、办不到）');
  const c0 = await p.evaluate(() => S.money.cash); await p.click('button[data-band="rob"]'); let st = await p.evaluate(() => ({ cash: S.money.cash, heat: S.band.heat, msg: ORGMSG }));
  if (!(st.heat > 0) || (st.cash === c0 && !/没得手/.test(st.msg))) bad.push('劫道没有结果：' + JSON.stringify(st));
  await p.click('button[data-band="rob"]'); if (!/已经干过/.test(await p.evaluate(() => ORGMSG))) bad.push('一个月能劫好几回');
  await p.fill('#bandWho', '张家庄'); await p.click('button[data-band="protect"]'); if (!(await p.evaluate(() => arr(S.band.protect).includes('张家庄')))) bad.push('收孝敬没记上村子');
  await p.click('button[data-band="rules"]'); if (!(await p.evaluate(() => S.band.rules && S.band.fame > 0))) bad.push('立寨规没添义名');
  const mo = await p.evaluate(() => { const c = S.money.cash; S.clock.m += 1; const o = bandMonthly(S, 1); return { d: S.money.cash - c, o }; }); if (!(mo.d >= 20)) bad.push('月底孝敬没进账：' + JSON.stringify(mo));
  const sg = await p.evaluate(() => { S.band.heat = 25; S.clock.m += 1; bandMonthly(S, 1); const w = { siege: S.band.siege, press: arr(S.press).some(x => /围剿/.test(x.title)) }; S.clock.m += 1; const o = bandMonthly(S, 1); return { w, o, battles: arr(S.battles).length }; });
  if (!sg.w.siege || !sg.w.press) bad.push('风头高了官府没来围剿：' + JSON.stringify(sg.w)); if (!sg.battles || !sg.o.some(x => /官军/.test(x))) bad.push('围剿到了月份没打：' + JSON.stringify(sg.o));
  const am = await p.evaluate(() => { S.band.fame = 60; S.band.siege = null; const f = S.forces[0]; f.troops = 400; f.units = []; ORGMSG = ''; bandAct(S, 'amnesty'); S.clock.m += 1; bandMonthly(S, 1); for (let i = 0; i < 5 && !S.band.offer; i++) { S.turn += 1; bandAct(S, 'amnesty'); S.clock.m += 1; bandMonthly(S, 1); } return !!S.band.offer; });
  if (!am) bad.push('名声够了求招安一直没回音');
  else { await p.evaluate(() => { TAB = 'board'; render0(); }); await p.click('button[data-band="accept"]'); const id = await p.evaluate(() => ({ id: identityOf(S), role: S.protagonist.role, band: S.band })); if (id.band || !/招安授/.test(id.role) || id.id.power !== 'appointed') bad.push('受了招安没改成官身：' + JSON.stringify({ role: id.role, power: id.id.power })); }
  // 3 地主
  t = await mk('邯郸县乡绅地主', 1600, '邯郸县', '明', '男', '王守田', { land: { mu: 300, rent: 0.5, loans: [] } });
  if (!/田产与营生/.test(t)) bad.push('地主没有田产页');
  await p.click('button[data-land="rent"]'); if (!/秋收以后/.test(await p.evaluate(() => ORGMSG))) bad.push('五月也能收租');
  await p.evaluate(() => { S.clock.m = 9; render0(); }); const c1 = await p.evaluate(() => S.money.cash); await p.click('button[data-land="rent"]'); const g1 = await p.evaluate(() => S.money.cash) - c1; if (Math.abs(g1 - 300 * 2 * 0.5 * 1.2) > 1) bad.push('收租数目不对：' + g1);
  await p.click('button[data-land="up"]'); if (!(await p.evaluate(() => S.land.rent === 0.55 && S.land.grudge > 0))) bad.push('加租没落到租额和佃户怨气');
  await p.fill('#landN', '10'); await p.click('button[data-land="buy"]'); if (!(await p.evaluate(() => S.land.mu === 310))) bad.push('置田没添亩数');
  await p.fill('#landN', '100'); await p.click('button[data-land="lend"]'); const ln = await p.evaluate(() => { const c = S.money.cash; S.clock.y += 1; S.clock.m = 10; S.turn = 7; landMonthly(S); return S.money.cash - c; }); if (!(ln > 100 || ln === 0)) bad.push('放债一年后没结');
  const kz = await p.evaluate(() => { S.land.grudge = 10; landMonthly(S); return arr(S.press).some(x => /抗租/.test(x.title)); }); if (!kz) bad.push('佃户怨气大了不抗租');
  // 4 佃户打短工
  t = await mk('邯郸县佃户', 1600, '邯郸县', '明', '男', '张二'); await p.click('button[data-land="work"]'); if (!(await p.evaluate(() => S.money.cash === 2001))) bad.push('打短工没挣到钱');
  // 5 主母
  t = await mk('苏州乡绅家的主母', 1600, '苏州', '明', '女', '沈氏', { press: [{ id: 'g1', kind: '破绽', who: '管家周福', title: '账上对不上', lost: 40, state: '临门', at: 0 }], people: { 管家周福: { role: '管家', seen: 1 } } });
  if (!/主中馈/.test(t)) bad.push('主母没有理家页'); if (/应考/.test(await p.evaluate(() => [...document.querySelectorAll('.goalbar.acts button')].map(x => x.textContent).join('')))) bad.push('女子的眼下能办的事里有应考');
  await p.click('button[data-fem="books"]'); if (!(await p.evaluate(() => S.money.cash === 2020 && S.press[0].state === '了结'))) bad.push('查账没追回揩油的一半');
  await p.click('button[data-fem="cloth"]'); if (!(await p.evaluate(() => S.money.cash === 2021.5))) bad.push('女红没挣到钱');
  if (await p.evaluate(() => examApply(S) !== null)) bad.push('女子能报考科举');
  // 6 后妃
  t = await mk('雍正帝的常在', 1725, '北京', '清', '女', '钮祜禄氏'); if (!/宫中/.test(t) || !/答应 → <b>常在<\/b>|常在/.test(t)) bad.push('后妃没有宫中页');
  await p.click('button[data-fem="serve"]'); if (!(await p.evaluate(() => S.palace.favor > 0))) bad.push('侍奉没添圣眷');
  const pr = await p.evaluate(() => { S.palace.favor = 95; S.palace.eyes = 50; ORGMSG = ''; femAct(S, 'promote'); S.clock.m += 1; S.turn = 3; palMonthly(S); return S.protagonist.role; }); if (!/贵人$/.test(pr) && !/常在$/.test(pr)) bad.push('求晋位后位分乱了：' + pr);
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
