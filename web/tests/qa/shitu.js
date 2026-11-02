// 官场门道与谋升迁（CLAUDE.md「人事与职权」潜规则与上升途径）：升迁之制里查出本朝的门道（送礼规矩、座师同年、部费、捐纳……），仕途页摆出来；
// 打点上司（一个月一回、钱从现钱出、清廉的上司退礼）、拜座师结同年（攒人脉）、求保举（看任满几成、情分、人脉、考语），下个月程序定准驳，准了改官记履历
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof shituAct === 'function');
  const bad = [];
  await p.evaluate(() => {
    S = newSave({ name: '汪辉祖', gender: '男', age: 46, role: '湖南宁远县知县', gregorianYear: 1787, month: 3, day: 1, place: '宁远县', polity: '清' });
    S.chat = [{ role: 'gm', text: '开场。' }]; S.money = { cash: 3000, unit: '两' };
    S.career = { office: '宁远县知县', rank: '正七品', superior: '永州府知府', sinceY: 1784, evaluation: '称职' };
    S.people = { 永州府知府: { role: '知府', tie: '上司', seen: 1 } };
    S.promo = { key: promoKey(S), office: '宁远县知县', rank: '正七品', superior: '永州府知府', tenureY: 3, next: [{ post: '直隶州知州', rank: '正五品', how: '俸满考称职，督抚题补' }], limits: [], entry: [], unsure: [],
      rules: [{ name: '冰敬炭敬', what: '夏冬给上司送规礼', cost: 200, unit: '两', fx: '上司写考语时多照应', basis: '清代陋规' }, { name: '拜座师', what: '逢年过节给座师送贽敬', cost: 100, unit: '两', fx: '座师在京里说得上话' }] };
    TAB = 'career'; VIEW = 'game'; SIDE_FOLD = false; render0();
  });
  const h = await p.evaluate(() => document.body.innerText);
  if (!/官场的门道/.test(h) || !/冰敬炭敬/.test(h) || !/照例约200两/.test(h)) bad.push('仕途页没摆出本朝的门道和照例的数目');
  await p.fill('#shAmt', '200'); await p.click('button[data-shitu="gift"]');
  let st = await p.evaluate(() => ({ cash: S.money.cash, favor: S.shitu.favor, msg: ORGMSG }));
  if (st.cash !== 2800 || !(st.favor > 0)) bad.push('打点上司没扣钱、没添情分：' + JSON.stringify(st));
  await p.fill('#shAmt', '200'); await p.click('button[data-shitu="gift"]');
  st = await p.evaluate(() => ({ cash: S.money.cash, msg: ORGMSG })); if (st.cash !== 2800 || !/已经打点过/.test(st.msg)) bad.push('一个月里能连着送礼：' + JSON.stringify(st));
  await p.fill('#shAmt', '100'); await p.click('button[data-shitu="ally"]');
  st = await p.evaluate(() => ({ net: S.shitu.net, cash: S.money.cash })); if (!(st.net > 0) || st.cash !== 2700) bad.push('拜座师结同年没攒人脉：' + JSON.stringify(st));
  await p.fill('#shAmt', '99999'); await p.click('button[data-shitu="ally"]');
  if (await p.evaluate(() => S.money.cash) !== 2700) bad.push('钱不够也送出去了');
  await p.click('button[data-shitu="ask"]');
  st = await p.evaluate(() => ({ ask: S.shitu.ask, act: arr(S.acts).find(x => x.ref === 'shitu') }));
  if (!st.ask || st.ask.to !== '直隶州知州' || !(st.ask.p > 0 && st.ask.p < 100)) bad.push('求保举没记下、或把握不合理：' + JSON.stringify(st.ask));
  if (!st.act || st.act.state !== '在办') bad.push('求保举没开行动单');
  // 下个月定准驳：把握高的多半准、低的多半驳；准了改官记履历
  const R = await p.evaluate(() => { const go = (fav, net, served) => { const s = JSON.parse(JSON.stringify(S)); s.shitu = { favor: fav, net, log: [] }; s.career.sinceY = 1787 - served; s.promo = S.promo; const T = s.shitu; let ok = 0; for (let t = 0; t < 40; t++) { s.shitu = { favor: fav, net, log: [] }; s.career.office = '宁远县知县'; s.promo = S.promo; s.turn = t; ORGMSG = ''; shituAct(s, 'ask'); s.clock.m = 4; const o = shituMonthly(s); if (s.career.office === '直隶州知州') ok++; s.clock.m = 3; } return ok; }; return { hi: go(35, 30, 4), lo: go(-20, 0, 0) }; });
  if (!(R.hi > R.lo + 10)) bad.push('情分人脉足、任满的，准的次数没明显多于刚到任、得罪上司的：' + JSON.stringify(R));
  const one = await p.evaluate(() => { S.shitu.ask.p = 100; S.clock.m = 4; const o = shituMonthly(S); return { o, off: S.career.office, log: S.careerLog }; });
  if (one.off !== '直隶州知州' || !(one.log || []).some(x => /迁直隶州知州/.test(x.what))) bad.push('准了没改官、没记履历：' + JSON.stringify(one));
  // 清廉的上司退礼
  const cl = await p.evaluate(() => { S.people.永州府知府.traits = ['廉洁']; S.career.superior = '永州府知府'; S.shitu.giftYM = null; const c0 = S.money.cash, f0 = S.shitu.favor; shituAct(S, 'gift', 100); return { back: S.money.cash === c0, down: S.shitu.favor < f0, msg: ORGMSG }; });
  if (!cl.back || !cl.down) bad.push('清廉的上司照收不误：' + JSON.stringify(cl));
  // 没官职的不能谋升迁
  const nf = await p.evaluate(() => { S.career = {}; return shituAct(S, 'ask') === null && /没有官职/.test(ORGMSG); }); if (!nf) bad.push('没官职也能求保举');
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
