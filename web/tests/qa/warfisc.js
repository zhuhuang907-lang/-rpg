// 宣战与名分、不宣而战的后果、做官的奏请、议和；国计民生每月收支照户口农业灾情赋税算、政策和工程有后果；舆图地名不串年代（CLAUDE.md「舆图」宣战、「人事与职权」国计民生、「舆图」地名不串年代）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof warStart === 'function');
  const bad = [];
  const mk = (role, y, pl, pol, nm, ex) => p.evaluate(([role, y, pl, pol, nm, ex]) => { S = newSave({ name: nm, gender: '男', age: 50, role, gregorianYear: y, month: 5, day: 1, place: pl, polity: pol }); S.chat = [{ role: 'gm', text: '开场' }]; S.money = { cash: 1000, unit: '两' }; S.renown = 300; S.forces = [{ name: '亲军', leader: nm, owner: '你', troops: '5000', at: pl, status: '驻守' }]; Object.assign(S, ex || {}); TAB = 'army'; VIEW = 'game'; SIDE_FOLD = false; render0(); }, [role, y, pl, pol, nm, ex || {}]);
  // 1 一方之主：先定名分，以「讨逆」宣战；不宣而战名声大掉、各家都冷了
  await mk('闽王', 921, '福州', '闽', '王审知', { powers: [{ name: '吴', stance: '中', kind: '割据', note: '僭号' }, { name: '楚', stance: '盟' }], gov: { scope: 'realm', stats: { 民心: 60 } } });
  await p.evaluate(() => { S.warAsk = { force: '无', target: '建州', owner: '吴' }; render0(); });
  const cbs = await p.$$eval('button[data-war="declare"]', b => b.map(x => x.dataset.cb));
  if (!cbs.includes('讨逆') || !cbs.includes('开疆拓土')) bad.push('宣战的名分没照情势列：' + cbs);
  if (await p.$('button[data-war="declare"][data-cb="讨逆"]')) await p.click('button[data-war="declare"][data-cb="讨逆"]'); else bad.push('军务页没摆出宣战名分');
  const a = await p.evaluate(() => ({ w: S.wars.map(w => [w.with, w.cb, w.declared].join()), ren: S.renown, st: S.powers[0].stance, ask: S.warAsk }));
  if (a.w[0] !== '吴,讨逆,true' || a.ren !== 306 || a.st !== '敌' || a.ask) bad.push('以讨逆宣战不对：' + JSON.stringify(a));
  const s2 = await p.evaluate(() => { S.powers.push({ name: '南汉', stance: '中' }); const r = warStart(S, '南汉', '', true); return { r, ren: S.renown, chu: S.powers[1].stance, mx: S.gov.stats.民心, w: S.wars[1] }; });
  if (!s2.r || s2.ren !== 294 || s2.chu !== '疑' || s2.mx !== 55 || s2.w.declared !== false || !s2.w.surprise) bad.push('不宣而战的后果不对：' + JSON.stringify(s2));
  const pc = await p.evaluate(() => { S.wars[0].won = 3; return { r: warPeace(S, '吴', '纳币'), st: S.wars[0].state }; });
  if (!pc.r || pc.st !== '议和') bad.push('打赢三仗令其纳币没成：' + JSON.stringify(pc));
  // 2 做官的：不能自己宣战，只能奏请（下个月批复）或擅自用兵（朝廷问罪）
  await mk('泉州刺史', 921, '泉州', '闽', '王延彬', { career: { office: '泉州刺史' }, powers: [{ name: '南汉', stance: '中' }] });
  await p.evaluate(() => { S.warAsk = { force: '无', target: '潮州', owner: '南汉' }; render0(); });
  if (await p.$('button[data-war="declare"]')) bad.push('做官的也能自己宣战');
  if (await p.$('button[data-war="ask"]')) await p.click('button[data-war="ask"]'); else bad.push('做官的没有奏请按钮'); const o = await p.evaluate(() => { const r = arr(S.warReq).length; S.clock.m = 6; const m = warMonthly(S); return { r, m, w: arr(S.wars).length }; });
  if (o.r !== 1 || !o.m.length) bad.push('奏请讨伐没进待批、下个月没批复：' + JSON.stringify(o));
  const ss = await p.evaluate(() => { const r = warStart(S, '吴越', '', true); return { r, press: arr(S.press).some(x => /擅启边衅/.test(x.title)) }; });
  if (!ss.r || !ss.press) bad.push('擅自用兵没被朝廷问罪：' + JSON.stringify(ss));
  // 3 国计民生：田赋照户口、年景、赋税轻重收（夏秋两季）；加征民心掉；工程花钱、成了落到城池上
  await mk('隋文帝', 600, '大兴', '隋', '杨坚', { gov: { scope: 'realm', stats: { 民心: 60, 灾情: 20, 腐败: 30, 治安: 60 } }, realm: { treasury: 5000000 } });
  const f = await p.evaluate(async () => { const oc = callClaude; callClaude = async () => ({ text: JSON.stringify({ tianfu: 12000000, dingyi: 3000000, yan: 1200000, shang: 900000, cha: 0, za: 300000, jun: 6000000, feng: 2400000, gong: 1200000, gongcheng: 600000, zhen: 300000, basis: '隋书食货志' }) }); try { await fiscalDS(S); } finally { callClaude = oc; }
    S.clock.m = 6; const o1 = fiscalMonthly(S), L1 = S.fisc.last; S.fisc.ym = null; S.fisc.pol.tax = '重'; const m0 = S.gov.stats.民心; const o2 = fiscalMonthly(S), L2 = S.fisc.last;
    return { t1: L1.R['田赋'], t2: L2.R['田赋'], why: L1.why['田赋'], m0, m1: S.gov.stats.民心, tr: S.realm.treasury, net: L1.net }; });
  if (!(f.t1 > 0) || !(f.t2 > f.t1) || !/夏税/.test(f.why || '') || !(f.m1 < f.m0) || f.tr === 5000000) bad.push('国计民生收支不照账算：' + JSON.stringify(f));
  await p.evaluate(() => { TAB = 'board'; render0(); });
  if (!(await p.$('button[data-work="水利"]'))) bad.push('局面页没有工程按钮'); else {
    await p.click('button[data-work="水利"]'); const w = await p.evaluate(() => { const W = S.fisc.works[0]; for (let i = 0; i < 9; i++) { S.clock.m = S.clock.m % 12 + 1; S.fisc.ym = null; fiscalMonthly(S); } return { st: W.state, nong: cityOf(S, W.place).nong }; });
    if (w.st !== '完工' || !(w.nong >= 60)) bad.push('水利工程没完工或没落到城池上：' + JSON.stringify(w)); }
  if (!(await p.$('button[data-fisc="tax"][data-v="轻"]'))) bad.push('局面页没有赋税轻重'); else { await p.click('button[data-fisc="tax"][data-v="轻"]'); if (await p.evaluate(() => S.fisc.pol.tax) !== '轻') bad.push('点了轻赋没改'); }
  // 4 舆图地名不串年代：开皇二十年没有乾州、凤翔府、京兆州
  const g = await p.evaluate(() => { const N = geoYear(600).map(u => u.name); return ['乾州', '凤翔府', '京兆州'].filter(n => N.includes(n)).concat(N.includes('雍州') ? [] : ['缺雍州']); });
  if (g.length) bad.push('开皇二十年的地名串了年代：' + g);
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
