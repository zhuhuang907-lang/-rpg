// R-257：临阵出的主意算进仗里（推演评出把握和效果，预先布好的整场管用）；据城守门不再回回大败；正文写的胜负跟程序算的对不上就打回重写
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof battlePlan === 'function');
  const r = await p.evaluate(() => {
    const s = newSave({ name: '林承海', gender: '男', age: 20, role: '牙军小卒', gregorianYear: 931, month: 4, day: 10, place: '福州', polity: '闽' });
    s.forces = [{ name: '本都牙兵', leader: '卢继', troops: 100, quality: '中' }];
    const fight = plan => resolveBattle(s, { enemy: '建州兵', enemyTroops: 300, enemyQuality: '中', place: '福州西门', terrain: '城池', attacker: '敌', ourForces: ['本都牙兵'], plan });
    const pl = battlePlan({ name: '门后二道障、两排轮射、门洞枪阵', p: 70, atk: 1.15, def: 1.35, orgHit: 20, casualty: 1.4, whole: '是', why: '守城常法' });
    let with_ = 0, without = 0, okNote = 0;
    for (let t = 1; t <= 10; t++) { s.turn = t; const a = fight(null), c = fight(pl); if (!/败/.test(a.outcome)) without++; if (!/败/.test(c.outcome)) with_++; if (/得手/.test(c.tacWhy || '')) okNote++; }
    const big = battlePlan({ name: '奇计', p: 999, atk: 9, def: 9, orgHit: 99, casualty: 9, whole: '否' });
    const lostR = { outcome: '大败', deadUs: 87, deadThem: 4, lose: '福州西门' }, wonR = { outcome: '小胜', deadUs: 5, deadThem: 38 };
    return { with_, without, okNote, none: battlePlan({ name: '', p: 50 }), big: [big.p, big.fx.atk, big.fx.def, big.fx.orgHit, big.fx.casualty, big.whole],
      clash1: battleTextClash(lostR, '众人齐声呐喊，把冲进门洞的建州兵赶出门外，城门守住了。'), clash2: battleTextClash(lostR, '西门失守，本部溃散，卢继带残兵退往子城。'), clash3: battleTextClash(wonR, '城头一阵乱箭，建州兵退去。'), clash4: battleTextClash(wonR, '西门失守，我军溃败。') };
  });
  const bad = [];
  if (r.with_ < 6) bad.push(`预先布好的守法十仗只守住 ${r.with_} 仗`);
  if (r.with_ <= r.without) bad.push(`布了守法（${r.with_}）不比没布（${r.without}）强`);
  if (r.okNote < 5) bad.push(`守方的主意得手却报「没成」（得手 ${r.okNote}/10）`);
  if (r.none !== null) bad.push('没出主意也当成一条打法');
  if (r.big.join() !== '85,1.4,1.4,40,1.6,false') bad.push('主意的效果没夹住上限：' + r.big.join());
  if (!r.clash1) bad.push('算的是大败、正文写成守住了，没打回');
  if (r.clash2) bad.push('正文照实写了失守，却被打回');
  if (r.clash3) bad.push('算的是胜、正文写胜，却被打回');
  if (!r.clash4) bad.push('算的是胜、正文写成溃败，没打回');
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad), `布守法守住 ${r.with_}/10、没布 ${r.without}/10`);
  await b.close(); process.exit(bad.length ? 1 : 0);
})();
