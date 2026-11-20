// R-264：参考 Grok 报告修的——健儿认得是兵、招安接上军阶、身份串不叠括号、唐进士黜落、丢城能收复、地名写法不同也对得上、保题要先有阵功、牙兵推戴（真点）、部将密报没记月份也会反
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof setRankRole === 'function');
  const r = await p.evaluate(() => {
    const mk = (role, y, pol, place) => newSave({ name: '张健', gender: '男', age: 25, role, gregorianYear: y, month: 5, day: 1, place: place || '汴州', polity: pol || '唐' });
    const R = {};
    { const s = mk('宣武军健儿', 880); R.jian = (soldierOf(s) || {}).lv; }
    { const s = mk('寨主', 1050, '宋', '曹州'); s.band = { offer: { title: '巡检', ym: Math.floor(ymOf(s.clock)) }, heat: 0, fame: 30 }; s.forces = [{ name: '弟兄', leader: '张健', owner: '你', troops: 300 }]; try { bandAct(s, 'accept'); } catch (e) { R.accErr = e.message; } R.amn = s.rank && s.rank.lv; }
    { const s = { protagonist: { role: '宣武军帐下士兵' } }, L = ['健儿', '十将', '副将']; setRankRole(s, L, '健儿', '十将'); setRankRole(s, L, '十将', '副将'); R.role = s.protagonist.role; }
    { let pass = 0; for (let k = 0; k < 200; k++) { const s = mk('举人', 700 + k, '唐', '长安'); s.exam = { lv: '举人', log: [], pending: { name: '省试（礼部试）', to: '进士', ym: Math.floor(ymOf(s.clock)), at: '长安' } }; s.skills = { 文墨: { lv: 60 } }; s.place.full = '长安'; try { examMonthly(s); } catch (_) {} if (s.exam.lv === '进士') pass++; } R.tang = pass; }
    { const s = mk('节度使', 900); s.idm = 'warlord'; s.powers = [{ name: '晋', seat: '太原' }]; s.mapOwn = { 宋: { owner: '晋', turn: 3, why: '丢了', from: '你', who: '晋' } }; R.cb = warCBs(s, '晋'); }
    { const s = mk('节度使', 900); s.territory = [{ place: '开封府' }]; s.forces = [{ name: '牙军', leader: '张健', troops: 3000, at: '开封府' }]; applyBattle(s, { ours: 3000, ourForces: ['牙军'], outcome: '大败', deadUs: 500, deadThem: 100, lose: '开封', take: '', turn: 2, enemy: '晋' }); R.lose = s.territory.length; }
    { const s = mk('宣武军健儿', 880); soldierOf(s); campAct(s, 'promo'); R.promo = ORGMSG; }
    { const s = mk('皇帝', 934, '后唐', '洛阳'); s.idm = 'emperor'; s.forces = [{ name: '某军', leader: '王某', troops: 9000, at: '许州' }]; s.territory = [{ place: '许州' }]; s.people = { 王某: { favor: -100, traits: ['野心'], warned: true } }; let n = 0; for (let k = 0; k < 14 && !arr(s.wars).length; k++) { s.clock.m = 1 + (k % 12); s.clock.y = 934 + Math.floor(k / 12); vassalTick(s, 3); n++; } R.warn = arr(s.wars).length; }
    return R; });
  const bad = [];
  if (r.jian !== 0) bad.push('「宣武军健儿」没认成营里的兵：' + r.jian);
  if (r.accErr || r.amn == null) bad.push('受招安没接上军阶：' + (r.accErr || r.amn));
  if (r.role !== '宣武军帐下士兵（副将）') bad.push('身份串叠括号：' + r.role);
  if (r.tang > 30) bad.push('唐代考进士两百年中了' + r.tang + '回（史实百中二三）');
  if (!r.cb.includes('收复')) bad.push('丢给晋的城没有「收复」名分：' + r.cb.join());
  if (r.lose !== 0) bad.push('丢了「开封」，地盘里还留着「开封府」');
  if (!/阵上功劳/.test(r.promo)) bad.push('健儿第一天就能求保题：' + r.promo);
  if (!r.warn) bad.push('只记了密报没记月份的部将永远不反');
  // 真点「结纳牙军，谋为留后」
  await p.evaluate(() => { const s = newSave({ name: '张健', gender: '男', age: 35, role: '宣武军都虞候', gregorianYear: 880, month: 5, day: 1, place: '汴州', polity: '唐' }); s.renown = 200; S = s; soldierOf(S); S.rank.merit = 20; VIEW = 'game'; SIDE_FOLD = false; TAB = 'board'; render0(); });
  if (!(await p.$('[data-soldier="tuidai"]'))) bad.push('都虞候看不到「结纳牙军，谋为留后」');
  else { await p.click('[data-soldier="tuidai"]'); await p.waitForTimeout(300); const a = await p.evaluate(() => ({ role: S.protagonist.role, rank: S.rank, idm: S.idm, f: arr(S.forces).map(f => f.name) })); if (!(/留后/.test(a.role) && !a.rank && a.idm === 'warlord') && !/都虞候|兵马使/.test(a.role)) bad.push('点了推戴结果不对：' + JSON.stringify(a)); }
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
