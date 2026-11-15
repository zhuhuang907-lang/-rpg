// 朝局能玩（R-240）：朝局页顶上的「朝局态势」——谁在位、谁当权、待你怎样；拜谒、送礼、打听、投门下、弹劾五样走动真点得动，
// 一个月两回，有代价、会不成、有后果：情分进人物账、官声涨落、靠山倒了受牵连、弹章下个月见分晓；写戏的材料里看得到；页面上没有内部字样
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof courtGameHtml === 'function' && typeof render0 === 'function');
  const bad = [];
  await p.evaluate(async () => { const oc = callClaude; callClaude = async () => ({ text: '{}' });
    const s = newSave({ name: '张砺', gender: '男', age: 35, role: '监察御史', gregorianYear: 930, month: 6, day: 1, place: '洛阳', polity: '后唐' }); s.chat = [{ role: 'gm', text: '开场。' }]; s.settledAt = 0; s.career = { office: '监察御史' }; s.money.cash = 200;
    try { await buildOrg(s); } finally { callClaude = oc; } store.save = async () => {}; S = s; VIEW = 'game'; SIDE_FOLD = false; TAB = 'court'; ORGMSG = ''; render0(); });
  const txt = async () => p.evaluate(() => document.body.innerText);
  let t = await txt();
  if (!/朝局态势/.test(t) || !/唐明宗/.test(t) || !/安重诲/.test(t) || !/冯道/.test(t)) bad.push('朝局态势没画出来，或没有在位的君主、当权的人');
  if (!/刘赞[\s\S]{0,40}你的上司/.test(t)) bad.push('你的上司（御史中丞刘赞）没排在态势里');
  if (/true ·|核实：|回合整理/.test(t)) bad.push('页面上还有内部字样：' + (t.match(/true ·|核实：[^\n]{0,10}|第\d+回合整理/) || [''])[0]);
  // 真点：打听安重诲（照朝廷数据，他 931 年去位）
  await p.click('[data-c2="ask"][data-n="安重诲"]'); t = await txt();
  if (!/托人打听：安重诲[^\n]*(坐不长|坐不久|去位)/.test(t)) bad.push('点了打听没出结果');
  if (!/安重诲[\s\S]{0,30}风声不好/.test(t)) bad.push('打听过以后没标风声');
  if (!/还能走动 1 回/.test(t)) bad.push('走动的回数没扣');
  // 真点：给冯道送礼——花钱、涨情分
  const c0 = await p.evaluate(() => S.money.cash); await p.click('[data-c2="gift"][data-n="冯道"]');
  const g = await p.evaluate(() => ({ cash: S.money.cash, fav: (S.people['冯道'] || {}).favor, left: c2Left(S) }));
  if (!(g.cash < c0) || !(g.fav >= 8) || g.left !== 0) bad.push('送礼没花钱、没涨情分或回数不对：' + JSON.stringify(g));
  // 第三回：这个月不许再走动
  await p.click('[data-c2="visit"][data-n="范延光"]'); t = await txt(); if (!/已经走动两回/.test(t)) bad.push('一个月走动超过两回没拦');
  // 投门下要先有情分；有了能投；靠山进写戏的材料
  const r = await p.evaluate(() => { const o = [], s = S; s.clock.m = 7; o.push(courtAct2(s, '冯道', 'join')); s.people['冯道'].favor = 30; o.push(courtAct2(s, '冯道', 'join')); o.push(c2Of(s).patron); o.push(instLine(s)); o.push(courtAct2(s, '冯道', 'accuse')); return o; });
  if (!/还没有这个交情/.test(r[0])) bad.push('没交情也能投门下'); if (r[2] !== '冯道' || !/投在[^\n]*冯道门下/.test(r[1])) bad.push('有交情投不了门下：' + r[1]);
  if (!/投在冯道门下/.test(r[3])) bad.push('靠山没进写戏的材料：' + r[3]); if (!/靠山/.test(r[4])) bad.push('弹自己的靠山没拦');
  await p.evaluate(() => { TAB = 'court'; render0(); }); t = await txt(); if (!/冯道[\s\S]{0,60}你的靠山/.test(t)) bad.push('页面上没标靠山');
  // 弹劾：真点，下个月见分晓；弹一个史书上明年去位的人（安重诲）——过一个月有结果、官声有变或留中
  const r2 = await p.evaluate(() => { const s = S; s.clock.m = 8; c2Of(s).moves = {}; TAB = 'court'; render0(); return true; });
  await p.click('[data-c2="accuse"][data-n="安重诲"]');
  const a1 = await p.evaluate(() => ({ open: arr(c2Of(S).cases).filter(c => !c.done).length, fav: (S.people['安重诲'] || {}).favor, msg: ORGMSG }));
  if (a1.open !== 1 || !(a1.fav <= -25) || !/下个月见分晓/.test(a1.msg)) bad.push('弹章没递上去、对方没记恨：' + JSON.stringify(a1));
  const a2 = await p.evaluate(() => { const s = S, g0 = repOf(s).guan; s.clock.m = 9; const out = court2Monthly(s); return { out, done: arr(c2Of(s).cases).every(c => c.done), g0, g1: repOf(s).guan, again: court2Monthly(s).length }; });
  if (!a2.done || !a2.out.some(x => /你弹枢密使安重诲的章/.test(x)) || a2.again) bad.push('弹章过了一个月没见分晓，或同一个月结了两遍：' + JSON.stringify(a2));
  // 靠山倒了受牵连：把靠山从位子上拿掉，过一个月官声跌、靠山没了
  const a3 = await p.evaluate(() => { const s = S, q = findPost(s, '冯道'); for (const n of s.org.nodes) for (const x of n.posts) { if (x.holder === '冯道') x.holder = ''; x.others = arr(x.others).filter(h => h !== '冯道'); } const g0 = repOf(s).guan; s.clock.m = 10; const out = court2Monthly(s); return { out, g0, g1: repOf(s).guan, patron: c2Of(s).patron }; });
  if (a3.patron || !(a3.g1 < a3.g0) || !a3.out.some(x => /冯道去了位/.test(x))) bad.push('靠山去位没有牵连：' + JSON.stringify(a3));
  // 第二步：朝中的人自己动
  const w = await p.evaluate(async () => { const o = {}, oc = callClaude; callClaude = async () => ({ text: '{}' });
    const mk = async () => { const s = newSave({ name: '张砺', gender: '男', age: 35, role: '监察御史', gregorianYear: 930, month: 3, day: 1, place: '洛阳', polity: '后唐' }); s.chat = [{ role: 'gm', text: '开场。' }]; s.settledAt = 0; s.career = { office: '监察御史' }; s.money.cash = 200; await buildOrg(s); c2Of(s); return s; };
    try {
      // 风声：931 年去位的安重诲，930 年九月朝中先有风声（四月还早）
      let s = await mk(); s.clock.m = 4; let r = court2Monthly(s); o.early = r.some(x => /风传[^\n]*安重诲/.test(x));
      s.clock.m = 9; r = court2Monthly(s); o.rumor = r.find(x => /风传/.test(x)) || ''; o.seen = !!c2Of(s).seenFall['安重诲'];
      // 他真去了位：早先弹过他的算有先见
      c2Of(s).cases.push({ target: '安重诲', done: true }); for (const n of s.org.nodes) for (const q of n.posts) { if (q.holder === '安重诲') q.holder = ''; q.others = arr(q.others).filter(h => h !== '安重诲'); }
      const g0 = repOf(s).guan; s.clock.m = 10; r = court2Monthly(s); o.gone = r.find(x => /安重诲果然去了位/.test(x)) || ''; o.up = repOf(s).guan > g0;
      // 上司情分坏：早晚穿小鞋，考成吃亏；情分好：给好差事
      s = await mk(); s.people['刘赞'] = { favor: -30, role: '御史中丞' }; let kc0 = offOf(s).kc, hit = 0; for (let m = 1; m <= 12 && !hit; m++) { s.clock.m = m; s.impeach = { by: 'x' }; if (court2Monthly(s).some(x => /刘赞[^\n]*吃力不讨好/.test(x))) hit = 1; } o.shoe = hit && offOf(s).kc < kc0;
      s = await mk(); s.people['刘赞'] = { favor: 40, role: '御史中丞' }; kc0 = offOf(s).kc; hit = 0; for (let m = 1; m <= 12 && !hit; m++) { s.clock.m = m; if (court2Monthly(s).some(x => /刘赞[^\n]*露脸的差事/.test(x))) hit = 1; } o.plum = hit && offOf(s).kc > kc0;
      // 得罪过的人参你：接进原有的被弹劾
      s = await mk(); s.people['范延光'] = { favor: -40, role: '枢密使' }; hit = 0; for (let yy = 0; yy < 3 && !hit; yy++) for (let m = 1; m <= 12 && !hit; m++) { s.clock.y = 930; s.clock.m = m; c2Of(s).ym = null; s.turn = yy * 12 + m; court2Monthly(s); if (s.impeach && s.impeach.by === '范延光') hit = 1; } o.foe = hit;
      // 官声好、没有靠山：有人来拉；页面上有应下、婉拒，真点应下就有了靠山
      s = await mk(); repOf(s).guan = 70; hit = 0; for (let t = 1; t <= 40 && !hit; t++) { s.turn = t; s.clock.m = (t % 12) + 1; c2Of(s).ym = null; court2Monthly(s); if (c2Of(s).offer) hit = 1; } o.offer = hit ? c2Of(s).offer.from : '';
      store.save = async () => {}; S = s; VIEW = 'game'; SIDE_FOLD = false; TAB = 'court'; ORGMSG = ''; render0();
    } finally { callClaude = oc; }
    return o; });
  if (w.early) bad.push('离去位还有一年多，四月就有风声了'); if (!/风传[^\n]*安重诲/.test(w.rumor) || !w.seen) bad.push('要去位的人，朝中没有风声：' + w.rumor);
  if (!w.gone || !w.up) bad.push('弹过的人真去了位，没算你有先见：' + JSON.stringify([w.gone, w.up]));
  if (!w.shoe) bad.push('上司恼你，一年里没穿小鞋或考成没动'); if (!w.plum) bad.push('上司看重你，一年里没给好差事或考成没动');
  if (!w.foe) bad.push('得罪了枢密使，三年里他没参你'); if (!w.offer) bad.push('官声好、没有靠山，三年里没人来拉');
  if (w.offer) { let tt = await txt(); if (!/遣人来递话/.test(tt)) bad.push('有人来拉，页面上没摆出来'); await p.click('[data-c2="take"]'); const pt = await p.evaluate(() => [c2Of(S).patron, c2Of(S).offer]); if (pt[0] !== w.offer || pt[1]) bad.push('点了应下没成靠山：' + JSON.stringify(pt)); }
  // 没官身的不能弹劾；看不到朝局的人没有这张卡
  const a4 = await p.evaluate(() => { const s = newSave({ name: '王二', gender: '男', age: 24, role: '洛阳城外的佃户', gregorianYear: 930, month: 6, day: 1, place: '洛阳', polity: '后唐' }); return courtGameHtml(s); });
  if (a4) bad.push('佃户也有朝局态势');
  console.log('ERRS', JSON.stringify([...errs, ...bad]));
  await b.close(); process.exit(errs.length || bad.length ? 1 : 0);
})();
