// 新制与改革、建号改元、职权内选官（CLAUDE.md「人事与职权」新制与改革）：朝局页写改革，后台推演，职权以内的当场推行、按月落到国势上；一方之主建号改元当场改；
// 招贤来的人下一回到，一方之主当场任命落到人事树；平民没有这个窗口
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof reformStart === 'function' && typeof founding === 'function');
  const out = await p.evaluate(async () => {
    const bad = [], s = newSave({ name: '张九四', gender: '男', age: 45, role: '自立为吴王，割据平江', gregorianYear: 1365, month: 3, day: 1, place: '平江', polity: '张士诚（吴）' }); S = s; VIEW = 'game'; s.polPts = 30; s.chat = [{ role: 'gm', text: '开场。' }];
    s.gov = { scope: 'realm', keys: ['国库', '民心'], stats: { 国库: 100000, 民心: 50 }, basis: {}, hist: [] };
    // 1 改革：后台推演，能做主的当场推行，起手的钱真扣，按月落到国势上
    const oc = callClaude, ob = bochaDeep; bochaDeep = async () => ({ text: '', items: [] });
    callClaude = async () => ({ text: JSON.stringify({ name: '清丈田亩', kind: '经济', can: '能做主', approver: '', feasible: 70, cost: { money: 5000, grain: 0, months: 2, other: '' }, steps: [{ what: '派员清丈', who: '', months: 1, odds: 70 }, { what: '造册', who: '', months: 1, odds: 70 }], effects: [{ key: '民心', delta: 4, inMonths: 2 }], risks: ['豪强阻挠'], parties: [], history: '张居正清丈' }) });
    let x; try { x = await reformStart(s, '清丈田亩', '派员丈量各县田亩，照实造册征粮'); } finally { callClaude = oc; bochaDeep = ob; }
    if (!x || !arr(s.plans).some(p => p.name === '清丈田亩')) bad.push('改革没推行：' + ORGMSG); if (!(s.gov.stats['国库'] < 100000)) bad.push('改革起手的钱没扣');
    if (!/新制与改革/.test(reformHtml(s))) bad.push('朝局页没有新制与改革');
    // 2 建号改元：国号、年号、都城当场改，写进年谱
    founding(s, '大周', '天祐', '平江'); if (s.place.polity !== '大周' || !/天祐元年/.test(s.clock.yearLabel || '') || (s.realm || {}).capital !== '平江') bad.push('建号改元没当场改：' + JSON.stringify([s.place.polity, s.clock.yearLabel]));
    if (!arr(s.chronicle).some(c => /大周/.test(c.what))) bad.push('建号没写进年谱');
    // 3 招贤来的人下一回到，当场任命落到人事树
    s.org = { regime: '大周', nodes: [{ id: 'root', name: '吴王府', depth: 0, parent: '', posts: [{ title: '王', holder: '张九四' }] }, { id: 'n1', name: '参军府', depth: 1, parent: 'root', posts: [{ title: '掾', holder: '', quota: 2 }] }], log: [] };
    try { await recruit(s, 'call', {}); } catch (e) { bad.push('招贤出错：' + e.message); }
    const L = talentList(s); if (!L.length) bad.push('招贤没来人');
    else { s.turn += 1; const who = L[0].name; orgAct(s, 'appoint', { node: s.org.nodes[1], pi: 0, person: who }); if (orgAct && s.org.nodes[1].posts[0].holder !== who && !/特旨|资格/.test(ORGMSG)) bad.push('招贤来的人任命没落到人事树：' + ORGMSG);
      if (/资格不够/.test(ORGMSG)) { orgAct(s, 'appoint', { node: s.org.nodes[1], pi: 0, person: who }); if (s.org.nodes[1].posts[0].holder !== who) bad.push('一方之主特旨破格也没任上：' + ORGMSG); } }
    // 3b 真点按钮：朝局页的「推行」「诏告天下」
    TAB = 'court'; render0(); const fg = document.querySelector('#fGuo'); if (!fg) bad.push('朝局页没有建号改元'); else { fg.value = '大吴'; document.querySelector('#bFound').click(); await new Promise(r => setTimeout(r, 300)); if (S.place.polity !== '大吴') bad.push('点了「诏告天下」没改国号：' + ORGMSG); }
    TAB = 'court'; render0(); const rn = document.querySelector('#refName'); if (!rn) bad.push('朝局页没有新制与改革'); else { rn.value = '兵制'; document.querySelector('#refBody').value = '改府兵为募兵'; const oc3 = callClaude, ob3 = bochaDeep; bochaDeep = async () => ({ text: '', items: [] }); callClaude = async () => ({ text: JSON.stringify({ name: '兵制', kind: '军事', can: '能做主', feasible: 60, cost: { money: 100, months: 2 }, steps: [{ what: '募兵' }], effects: [{ key: '民心', delta: -2, inMonths: 2 }] }) }); document.querySelector('#bReform').click(); await new Promise(r => setTimeout(r, 800)); callClaude = oc3; bochaDeep = ob3; if (!arr(S.plans).some(x => x.name === '兵制')) bad.push('点了「推行」没推行：' + ORGMSG); }
    // 4 平民没有改革窗口
    const t = newSave({ name: '甲乙', gender: '男', age: 30, role: '佃户', gregorianYear: 1365, month: 3, day: 1, place: '平江', polity: '元' }); if (reformHtml(t)) bad.push('平民也有改革窗口'); if (founding(t, '大汉', '', '')) bad.push('平民也能建号');
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
