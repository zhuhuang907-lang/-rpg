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
  // 账房漏报身份：正文写补了水手名，补问一句拿到新身份；正文没写身份变化不问；回答「没变」不动
  const idr = await p.evaluate(async () => {
    const s = newSave({ name: '林承海', gender: '男', age: 24, role: '牙军小卒', gregorianYear: 933, month: 9, day: 9, place: '福州', polity: '闽' });
    const keep = callClaude; let asked = 0, reply = '{"changed":"是","role":"楼船营平波号水手","why":"补入平波号水手名"}';
    callClaude = async () => { asked++; return { text: reply }; };
    const a = await idFollow(s, '投水军', '三个月满，书办来船上验看，你补了水手名，编入甲板一队。');
    const n1 = asked; const b2 = await idFollow(s, '照常当差', '这一日你照常站门巡夜，夜里下了雨。'); const n2 = asked;
    reply = '{"changed":"否","role":"","why":""}'; const c = await idFollow(s, '求升', '赵大说船上的小头目，兴许有你的份，只是还要等批。');
    callClaude = keep; return { a, n1, b2, n2, c };
  });
  const nt = await p.evaluate(() => [applyFixes('正月里改元，国号大闽，城中传遍。', [{ wrong: '国号大闽', right: '国号大闽（史实如此，可保留）' }]).text, applyFixes('长兴四年正月初一改元。', [{ wrong: '长兴四年正月初一', right: '长兴四年春正月' }]).text]);
  const fam = await p.evaluate(() => { const s = newSave({ name: '林承海', gender: '男', age: 25, role: '楼船营水手', gregorianYear: 933, month: 9, day: 9, place: '福州', polity: '闽' }); s.household = [{ relation: '母', name: '陈婉娘', age: 50 }];
    const before = familyNeeds(s).join(); s.chat = [{ role: 'gm', text: '书吏提笔问：「娶亲否？」你答：「未娶。」' }]; return [before, familyNeeds(s).join()]; });
  const sd = await p.evaluate(() => { const s = newSave({ name: '林承海', gender: '男', age: 22, role: '宿卫', gregorianYear: 930, month: 12, day: 3, place: '福州', polity: '闽' });
    const f = t => { const c = storyDate(s, t); return c ? c.y + '-' + c.m : ''; };
    return [f('此后一年多，经天成四年、长兴元年，到长兴二年（931年）春，你照常当差。'), f('长兴二年四月，福州城忽然绷紧了。'), f('前年天成三年腊月的事，你还记得。'), f('这日你值夜回来。'), f('长兴三年正月里，使府张出告示。'), f('文书走得慢，直到三月末才出牒。到了五月，宫里传出话来。七月里一天，内侍来叫你。'), f('天成五年正月不可能。到了腊月，雪下了。'), f('「二月十三到西廊，至今一个多月。」你答。'), f('过了年，开春二月，诏书下来。')]; });
  const hv = await p.evaluate(() => { const s = newSave({ name: '林承海', gender: '男', age: 28, role: '宿卫', gregorianYear: 937, month: 3, day: 1, place: '福州', polity: '闽' }); s.chat = []; return [heavyStep(s, '求陛下照例论功，给臣一个押衙的实职'), heavyStep(s, '愿外放泉州，在刺史手下当个押衙'), heavyStep(s, '找机会在都头面前露一手武艺')]; });
  const sp = await p.evaluate(() => [spanAsked('', '臣请外放泉州，以押衙之职查验海舶，一年之内查清钱漏在哪里，查不出甘当其罪'), spanAsked('', '三年之内让泉州每年多解一笔钱'), spanAsked('', '这一年照常当差，过一年再看'), spanAsked('', '之后过三个月，等名册核完')]);
  const ov = await p.evaluate(() => { const s = newSave({ name: '林承海', gender: '男', age: 28, role: '宿卫', gregorianYear: 937, month: 3, day: 1, place: '福州', polity: '闽' }); s.turn = 42;
    s.acts = [{ id: 'a1', type: '请', what: '外放泉州为押衙', state: '拖着', turn: 38, touched: 41 }, { id: 'a2', type: '请', what: '借三百文', state: '部分办成', turn: 41, touched: 41 }, { id: 'a3', type: '计', what: '静候批复', state: '拖着', turn: 30, touched: 41 }];
    const b = actBlock(s); return [/a1外放泉州/.test(b.slice(b.indexOf('必须给准话'))) && b.includes('必须给准话'), /a2借三百文/.test(b.slice(b.indexOf('必须给准话'))), /a3静候/.test(b.slice(b.indexOf('必须给准话')))]; });
  const bad = [];
  if (!ov[0] || ov[1] || ov[2]) bad.push('请了三回以上的事没逼出准话（或把新请的、盘算也算进去）：' + ov.join());
  if (sp[0] || sp[1] || sp[2] !== 12 || sp[3] !== 3) bad.push('「一年之内」当成了过一年（或真说过多久没认）：' + sp.join());
  if (!hv[0] || !hv[1] || hv[2]) bad.push('论功求官没算成要紧的一步（或平常话算成了）：' + hv.join());
  if (sd.join() !== '931-1,931-4,,,932-1,,930-12,,931-2') bad.push('正文明写的年月没认对：' + sd.join());
  if (!/正妻/.test(fam[0]) || /正妻|子女/.test(fam[1])) bad.push('正文写明未娶，还要替主角补正妻、子女：' + fam.join(' / '));
  if (/可保留|史实如此/.test(nt[0])) bad.push('审稿批注被当改法替进正文：' + nt[0]);
  if (!/长兴四年春正月/.test(nt[1])) bad.push('正常的改法没替：' + nt[1]);
  if (!idr.a || idr.a.role !== '楼船营平波号水手') bad.push('正文写补了水手名，没补问出新身份：' + JSON.stringify(idr.a));
  if (idr.b2 || idr.n2 !== idr.n1) bad.push('正文没写身份变化也去补问');
  if (idr.c) bad.push('回答没变也改了身份');
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
