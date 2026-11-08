// 各朝入仕（需求台账 R-156；2026-11-08 玩家：「当官怎么办，科举举孝廉九平中正怎么办，你都没有写」）
// 全真点（仕途页）：西晋士族、寒门各请中正品评（寒门上不了上品）、三年清定、托人打点、照乡品起家（清官浊官）；
// 东汉求举孝廉（举了拜郎中、满一年外补县长）、名望够了举茂才（除县令）；唐门荫授官；明清有报考
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof zhongzhengAct === 'function');
  const bad = [], click = async (sel, what) => { const el = await p.$(sel); if (!el) { bad.push('没有「' + what + '」按钮'); return false; } await p.click(sel); await p.waitForTimeout(100); return true; };
  const mk = (y, role, ch, ren, wen) => p.evaluate(([y, role, ch, ren, wen]) => { S = newSave({ name: '王导', gender: '男', age: 22, role, real: false, gregorianYear: y, month: 3, day: 1, place: y < 600 ? '洛阳' : y < 1000 ? '长安' : '北京', polity: y < 220 ? '汉' : y < 600 ? '晋' : y < 1000 ? '唐' : '明' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 2;
    S.protagonist.ident = { chushen: ch }; S.renown = ren; S.skills = { 文墨: { lv: wen, xp: 0 }, 谋略: { lv: 10, xp: 0 } }; S.traits = { 仁: 1, 义: 1, 信: 1, 勇: 0, 智: 0 }; S.money = { cash: 500, unit: '贯' }; S.econ = { unit: '贯', wage: 0.1, rice: 0.5 };
    VIEW = 'game'; TAB = 'career'; SIDE_FOLD = false; render(); }, [y, role, ch, ren, wen]);
  // 西晋士族
  await mk(280, '读书人', '琅琊王氏，士族', 60, 50);
  if (!/九品中正/.test(await p.evaluate(() => document.body.innerText))) bad.push('西晋仕途页没有九品中正');
  if (/求郡守举孝廉/.test(await p.evaluate(() => document.body.innerText)) && !/九品中正/.test(await p.evaluate(() => document.body.innerText))) bad.push('西晋还照两汉察举办');
  if (await click('[data-zz="ping"]', '请中正品评')) { const r = await p.evaluate(() => examOf(S).xp); if (!(r >= 2 && r <= 3)) bad.push('琅琊王氏士族品评不在上品：乡品' + r); }
  await click('[data-zz="ping"]', '请中正清定'); if (!/三年一清定|没到清定/.test(await p.evaluate(() => ORGMSG))) bad.push('刚定的乡品又能清定');
  if (await click('[data-zz="start"]', '照乡品起家')) { const r = await p.evaluate(() => ({ c: S.career, log: arr(S.careerLog).slice(-1)[0] })); if (!r.c || !/秘书郎|太子舍人/.test(r.c.office) || r.c.qing !== '清' || !r.log) bad.push('士族上品起家不是清官：' + JSON.stringify(r)); }
  // 西晋寒门：名望再高也难上品
  await mk(280, '读书人', '寒门', 300, 90);
  if (await click('[data-zz="ping"]', '请中正品评')) { const r = await p.evaluate(() => examOf(S).xp); if (!(r >= 4)) bad.push('寒门品评进了上品（上品无寒门）：乡品' + r); }
  // 托人打点：花钱，下回抬一等或败露降等
  { await p.evaluate(() => { examOf(S).xpYM -= 36; render(); }); const c0 = await p.evaluate(() => S.money.cash);
    if (await click('[data-zz="bribe"]', '托人打点中正')) { const r = await p.evaluate(() => ({ c: S.money.cash, z: examOf(S).zzPlus })); if (!(r.c < c0) || !r.z) bad.push('托人打点没花钱或没记下：' + JSON.stringify(r)); }
    const x0 = await p.evaluate(() => examOf(S).xp), z = await p.evaluate(() => examOf(S).zzPlus); await click('[data-zz="ping"]', '请中正清定'); const x1 = await p.evaluate(() => examOf(S).xp);
    if (z > 0 && !(x1 <= x0 && x1 >= 4)) bad.push(`打点了清定没抬（或寒门抬进了上品）：${x0}→${x1}`); if (z < 0 && !(x1 >= x0)) bad.push(`打点败露清定没降：${x0}→${x1}`);
    if (await click('[data-zz="start"]', '照乡品起家')) { const r = await p.evaluate(() => S.career); if (!r || r.qing !== '浊') bad.push('寒门起家不是浊官：' + JSON.stringify(r)); } }
  // 东汉：举孝廉拜郎中、满一年外补县长；举茂才除县令
  await mk(160, '读书人', '寒门', 150, 50);
  if (/九品中正/.test(await p.evaluate(() => document.body.innerText))) bad.push('东汉出现了九品中正');
  { let ok = false; for (let i = 0; i < 12 && !ok; i++) { await click('#bXiao', '求郡守举孝廉'); ok = await p.evaluate(() => (S.career || {}).office === '郎中'); if (!ok) await p.evaluate(() => { examOf(S).askYm -= 12; render(); }); }
    if (!ok) bad.push('名望一百五求了十二年孝廉都没举上');
    else { const r = await p.evaluate(() => { for (let k = 0; k < 13; k++) { S.clock = CAL.addMonths ? CAL.addMonths(S.clock, 1) : (S.clock.m === 12 ? { ...S.clock, y: S.clock.y + 1, m: 1 } : { ...S.clock, m: S.clock.m + 1 }); rushiMonthly(S); } return S.career; });
      if (!/县长/.test(r.office || '')) bad.push('做郎中满一年没外补县长：' + JSON.stringify(r)); } }
  await mk(160, '读书人', '寒门', 150, 50);
  { let ok = false; for (let i = 0; i < 12 && !ok; i++) { await click('#bMao', '求州刺史举茂才'); ok = await p.evaluate(() => /县令/.test((S.career || {}).office || '')); if (!ok) await p.evaluate(() => { examOf(S).maoYm -= 12; render(); }); }
    if (!ok) bad.push('名望一百五求了十二年茂才都没举上'); }
  await mk(160, '读书人', '寒门', 20, 50); await click('#bMao', '求州刺史举茂才'); if (!/名望/.test(await p.evaluate(() => ORGMSG))) bad.push('名望二十也能求茂才');
  // 唐：门荫授官、落到履历
  await mk(700, '官宦子弟', '官宦', 20, 30); await p.evaluate(() => { S.household = [{ relation: '父', name: '王敦', note: '刺史，正四品' }]; render(); });
  if (await click('[data-entry="yin"]', '门荫')) { const r = await p.evaluate(() => ({ c: S.career, l: arr(S.careerLog).length })); if (!r.c || !r.c.office || !r.l) bad.push('唐门荫没授官：' + JSON.stringify(r)); }
  // 明：有报考
  await mk(1600, '读书人', '寒门', 20, 30); if (!(await p.$('#bExam'))) bad.push('明代仕途页没有报考');
  const html = await p.evaluate(() => document.body.innerText); for (const w of ['undefined', 'NaN']) if (html.includes(w)) bad.push('页面上出现 ' + w);
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
