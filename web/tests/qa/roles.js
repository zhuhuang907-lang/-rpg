// 各种身份都能玩（CLAUDE.md「人事与职权」各种身份管得到什么）：地方官管辖区（劝农、缉盗、清积案、赈济、修城、赋税、招乡勇）、山大王管山寨（修寨、招人、下山劫掠）、武官管自己的兵、唐五代节度使和土司酋长是一方之主；
// 开局照史料查统带的兵；局面页直接摆出辖区和兵马
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof myDomain === 'function');
  const out = await p.evaluate(async () => {
    const bad = [], mk = (role, y, place, extra) => { const s = Object.assign(newSave({ name: '甲乙丙', gender: '男', age: 40, role, gregorianYear: y, month: 5, day: 1, place, polity: '' }), extra || {}); s.chat = [{ role: 'gm', text: '开场。' }]; s.money = { cash: 3000, unit: '两', hist: [] }; S = s; return s; };
    const UTS = [{ id: 'xy', name: '乡勇', size: 100, atk: 40, def: 45, shock: 30, org: 40, mob: 40, pay: 1, grain: 0.5, months: 2 }];
    // 1 知县：辖区是本县；劝农、缉盗、清积案从库银出、落到辖区数上；不能派太守；招乡勇一个月最多三百
    let s = mk('江都县知县', 1757, '扬州府江都县'); s.career = { office: '江都县知县', rank: '正七品' }; s.gov = { scope: 'local', keys: [], stats: { 存银: 5000, 仓粮: 3000, 民心: 50, 治安: 40, 积案: 60, 灾情: 30, 吏治: 50 }, basis: {}, hist: [] };
    let D = myDomain(s); if (D.kind !== 'local' || !D.places[0]) bad.push('知县没有辖区：' + JSON.stringify(D)); const town = D.places[0];
    cityDo(s, town, 'bu'); if (!(s.gov.stats['治安'] > 40) || !(s.gov.stats['存银'] < 5000)) bad.push('知县缉捕盗贼没落账：' + JSON.stringify(s.gov.stats) + ORGMSG);
    cityDo(s, town, 'an'); if (!(s.gov.stats['积案'] < 60)) bad.push('清理积案没落账');
    ORGMSG = ''; if (cityDo(s, town, 'gov', '某甲') || !/君主|一方之主/.test(ORGMSG)) bad.push('知县也能派太守');
    if (!tabsFor(s).some(t => t[0] === 'army')) bad.push('知县没有军务页（招不了乡勇）');
    s.unitTypes = UTS; ORGMSG = ''; if (armyAct(s, 'raise', { tpl: 'xy', n: 5 }) || !/最多300人/.test(ORGMSG)) bad.push('知县一个月招五百乡勇也成了：' + ORGMSG);
    const sv0 = s.gov.stats['存银']; if (!armyAct(s, 'raise', { tpl: 'xy', n: 2 }) || !s.forces.length || !(s.gov.stats['存银'] < sv0)) bad.push('知县招两百乡勇没成、或没从库银出：' + ORGMSG);
    const bh = (VIEW = 'game', TAB = 'board', render0(), document.body.innerText); if (!/你的辖区/.test(bh) || !/你的兵马/.test(bh)) bad.push('局面页没摆出辖区和兵马');
    // 2 山大王：山寨；修寨（城防）；不收赋税；下山劫掠，没守军就抢了回来
    s = mk('山寨寨主，啸聚梁山', 1120, '郓州'); D = myDomain(s); if (D.kind !== 'stronghold') bad.push('寨主不是山寨：' + D.kind);
    ORGMSG = ''; if (cityDo(s, D.places[0], 'tax', '重') || !/不收赋税/.test(ORGMSG)) bad.push('山寨也能定赋税');
    s.forces = [{ name: '梁山喽啰', leader: '甲乙丙', troops: '800', at: D.places[0], status: '驻守', grain: '100' }];
    const c0 = s.money.cash, g0 = N0(s.forces[0].grain); s.campaigns = [{ force: '梁山喽啰', mode: '掠', target: '济州', from: D.places[0], state: '行军' }];
    const o = campResolve(s, s.campaigns[0], null); if (!(s.money.cash > c0) || !(N0(s.forces[0].grain) > g0)) bad.push('下山劫掠没抢到东西：' + JSON.stringify(o));
    if (!myDomain(s).raid) bad.push('寨主不能劫掠');
    // 3 总兵：只管自己的兵，管不了城；不能劫掠
    s = mk('登州镇总兵', 1630, '登州府'); s.career = { office: '登州镇总兵' }; D = myDomain(s); if (D.kind !== 'army') bad.push('总兵不是统兵的武官：' + D.kind); if (D.raid) bad.push('总兵也能劫掠'); ORGMSG = ''; if (cityDo(s, '登州府', 'nong')) bad.push('总兵也能开发城池');
    // 4 唐末节度使、土司、酋长是一方之主
    for (const [role, y] of [['宣武军节度使', 900], ['播州土司', 1580], ['奚族部落酋长', 800]]) { const t = mk(role, y, '汴州'); if (myDomain(t).kind !== 'realm') bad.push(role + '不是一方之主：' + myDomain(t).kind); }
    // 5 开局查统带的兵：照史料，写依据
    s = mk('江都县知县', 1757, '扬州府江都县'); s.career = { office: '江都县知县' }; const oc = callClaude, of = searchFirst; searchFirst = async () => ''; callClaude = async () => ({ text: JSON.stringify({ forces: [{ name: '江都县民壮', troops: 157, quality: '弱', basis: '照《大清会典》州县民壮定额推' }] }) });
    try { if (!cmdDue(s)) bad.push('知县开局没去查统带的兵'); await cmdInfer(s); } finally { callClaude = oc; searchFirst = of; }
    const f = arr(s.forces)[0]; if (!f || f.troops !== '157' || f.src !== '推算' || !/会典/.test(f.why) || !myForce(s, f)) bad.push('开局统带的兵没立上、或没写依据：' + JSON.stringify(f));
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
