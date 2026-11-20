// R-263：第二轮审查——不标虚拟真实、朝议不重复结算一派一票、身份转换交割、兵马账实（没编营的饷、baseMen、兵种表换新）、认兵、混编、小胜不占城、打下城的账、藩属叛乱成战争、守军估算、盟友出兵
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof shedIdentity === 'function');
  const r = await p.evaluate(() => {
    const mk = (role, y, pol, extra) => Object.assign(newSave({ name: '周文', gender: '男', age: 30, role, gregorianYear: y || 1100, month: 5, day: 1, place: pol === '后唐' ? '洛阳' : '开封府', polity: pol || '宋' }), extra || {});
    const R = {};
    // 不标虚拟、真实
    R.mark = markFict(mk('知县'), '张三（虚拟）来了，李四（真人）也来了');
    // 朝议：一派一票、结了不再结
    { const s = mk('宰相'); s.issue = { k: '盐法', ym: Math.floor(ymOf(s.clock)), stances: [{ f: '甲党', st: '赞成' }, { f: '甲党', st: '赞成' }, { f: '甲党', st: '赞成' }, { f: '乙党', st: '反对' }], verdict: '' };
      const t = issueTally(s); R.tally = [t.pro, t.con]; issueSettle(s); const c1 = arr(s.chronicle).length; courtIssueApply(s, { stances: [{ faction: '丙党', stance: '赞成' }] }); R.twice = arr(s.chronicle).length - c1; }
    // 身份转换：出家交出兵马官身、田施入寺；投军留田离乡
    { const s = mk('知县'); s.career = { office: '知县' }; s.forces = [{ name: '乡勇', leader: '周文', troops: 300 }]; s.land = { mu: 100, rent: 0.5, loans: [] }; s.base = { place: '黑风寨' }; vowAct(s, 'fo'); R.vow = [arr(s.forces).length, s.career.office, s.land.mu, s.base]; }
    { const s = mk('地主'); s.land = { mu: 80, rent: 0.5, loans: [] }; s.business = [{ name: '米铺', capital: 100 }]; s.hh = s.hh || {}; try { shedIdentity(s, '逃荒', { land: 'sell', biz: 'sell' }); } catch (e) { R.fleeErr = e.message; } R.flee = [s.land && s.land.mu, arr(s.business).length]; }
    // 认兵：挂着别家名号、溃兵不归一方之主
    { const s = mk('皇帝', 934, '后唐'); s.idm = 'emperor'; R.my = [myForce(s, { name: '禁军', owner: '', leader: '康义诚' }), myForce(s, { name: '溃兵', owner: '溃兵', leader: '某' }), myForce(s, { name: '吴军', owner: '吴', leader: '徐温' })]; }
    // 兵种表查不到不丢营；没编营的人照算饷
    { const s = mk('都头'); s.unitTypes = [{ id: 'a', name: '步卒', size: 100, pay: 2, grain: 0.6, atk: 50, def: 50, shock: 45, org: 55, mob: 45 }]; const f = { name: '营', units: [{ tpl: 'zzz', men: 300 }, { tpl: 'a', men: 200 }], baseMen: 100 }; const st = forceStats(s, f); R.fs = [st.men, st.pay]; }
    // 小胜不占城（守军还剩大半）
    { const s = mk('节度使', 900, '唐'); s.forces = [{ name: '牙军', leader: '周文', troops: 5000, at: '汴州' }]; let take = 0, small = 0; for (let k = 0; k < 40; k++) { s.turn = k; const r1 = resolveBattle(s, { enemy: '贼', enemyTroops: 4000, place: '郑州', terrain: '城池', attacker: '我', ourForces: ['牙军'] }); if (r1 && /小胜/.test(r1.outcome)) { small++; if (r1.take) take++; } s.forces[0].troops = 5000; } R.small = [small, take]; }
    // 打下城：驻军从出征的兵里拨，敌方地盘删掉
    { const s = mk('节度使', 900, '唐'); s.forces = [{ name: '牙军', leader: '周文', troops: 5000, at: '汴州' }]; s.powers = [{ name: '朱温', land: '郑州、滑州', seat: '汴州' }]; const g = conquerBook(s, '郑州', s.forces, '打下', '朱温'); R.cq = [g, N0(s.forces[0].troops), s.powers[0].land]; }
    // 守军：小国都城不是两万
    { const s = mk('节度使', 900, '唐'); s.powers = [{ name: '小镇', seat: '郑州', troops: '6000' }]; R.gar = garrisonGuess(s, '郑州').troops; }
    // 盟友真出兵
    { const s = mk('皇帝', 1100); s.idm = 'emperor'; s.powers = [{ name: '甲', troops: '30000', seat: '大名府', land: '大名府' }, { name: '乙', troops: '20000', seat: '真定府', land: '真定府' }]; s.diplo = { 甲: { att: 60, ties: ['盟'] } }; s.wars = [{ with: '乙', state: '交战', allies: ['甲'], won: 0, lost: 0, took: [] }]; let hit = 0; for (let k = 0; k < 8 && !hit; k++) { s.clock.m = 1 + k; hit = levyMonthly(s).filter(x => /依约出兵/.test(x)).length; } R.ally = [hit, N0(s.powers[1].troops)]; }
    return R; });
  const bad = [];
  if (/虚拟|真人/.test(r.mark)) bad.push('正文还标虚拟、真人：' + r.mark);
  if (r.tally[0] > r.tally[1] * 2 + 3) bad.push('同一派写三条立场票力叠加：' + r.tally);
  if (r.twice) bad.push('已有结论的朝议又结算了一次');
  if (r.vow[0] !== 0 || r.vow[1] || r.vow[2] !== 0 || r.vow[3]) bad.push('出家没交出兵马、官身、田产、山寨：' + JSON.stringify(r.vow));
  if (r.fleeErr || r.flee[0] !== 0 || r.flee[1] !== 0) bad.push('逃荒没处置田产铺子：' + JSON.stringify(r.flee) + (r.fleeErr || ''));
  if (r.my.join() !== 'true,false,false') bad.push('一方之主认兵不对（自家、溃兵、吴军）：' + r.my.join());
  if (r.fs[0] !== 600 || !(r.fs[1] > 1000)) bad.push('兵种查不到整营丢了、或没编营的人不算饷：' + r.fs.join());
  if (r.small[1] > r.small[0] * 0.5) bad.push('小胜大多直接占城：' + r.small.join('/'));
  if (r.cq[0] !== 500 || r.cq[1] !== 4500 || /郑州/.test(r.cq[2])) bad.push('打下城的账不闭合：' + JSON.stringify(r.cq));
  if (!(r.gar < 20000)) bad.push('六千兵的小镇都城守军还是两万：' + r.gar);
  if (!r.ally[0] || !(r.ally[1] < 20000)) bad.push('盟友没真出兵：' + JSON.stringify(r.ally));
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
