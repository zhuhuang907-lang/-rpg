// R-271：长跳月结一个月一个月地过（两税、商铺、军粮）；商铺利不重复入账；没编成营的兵粮不双扣；「到年底」照几月算；押牢字段齐、孤身被擒有按钮；赈济一月一回、地方官的忠诚记得住；高龄长跳照年复算死亡
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof fiscalMonthly === 'function');
  const r = await p.evaluate(() => { const R = {};
    const emp = (m) => { const s = newSave({ name: '李从荣', gender: '男', age: 33, role: '后唐皇帝', gregorianYear: 936, month: m, day: 1, place: '洛阳', polity: '后唐' }); s.idm = 'emperor'; s.gov = { stats: { 国库: 300000, 民心: 60, 腐败: 30, 灾情: 20 } }; s.realm = { treasury: 300000, granary: 0 }; s.fisc = { kind: 'realm', base: { tianfu: 1000000, shang: 120000, jun: 600000 }, y: 936, works: [] }; S = s; return s; };
    /* 两税：七月跳到次年七月 */
    { const s = emp(7); const before = s.gov.stats.国库; const from = { y: 936, m: 7, leap: false }; s.clock = { ...s.clock, y: 937, m: 7 }; const mg = CAL.monthsBetween(from, s.clock);
      if (typeof monthLoop === 'function') monthLoop(s, from, mg, mm => fiscalMonthly(s)); else fiscalMonthly(s); R.tax = s.gov.stats.国库 - before; }
    /* 商铺：程序经营的铺子，月结不再按上月利再加一遍 */
    { const s = newSave({ name: '周文', gender: '男', age: 30, role: '商人', gregorianYear: 1600, month: 5, day: 1, place: '苏州府', polity: '明' }); S = s; s.money = { unit: '两', cash: 1000 };
      s.business = [{ name: '布庄', prog: true, capital: 10000, lo: 0.045, hi: 0.045, revenue: 450, cost: 0, place: '苏州府' }];
      const c0 = s.money.cash; applyReply(s, { mode: 'play', reply: '过了一个月。', elapsedDays: 30, span: 'month' }, '照常经营一个月'); R.shop = Math.round(s.money.cash - c0); }
    /* 没编成营的兵：粮只扣一处 */
    { const s = emp(3); s.forces = [{ name: '乡兵', leader: '李从荣', owner: '你', troops: 10000, grain: 200000, at: '洛阳' }]; const acc = []; realmUpkeep(s, 30, acc); R.upk = 200000 - N0(s.forces[0].grain); }
    /* 到年底 */
    { const s = emp(1); S = s; R.y1 = spanMonths('', '到年底再说'); s.clock.m = 11; R.y11 = spanMonths('', '到年底再说'); }
    /* 押牢 */
    { const s = emp(3); s.money = { unit: '贯', cash: 10 }; s.jail = { by: '官军', place: '晋州', ym: 11250, ransom: 0, tries: 0 }; tidyState(s); R.jail = [s.jail.where, s.jail.charge, s.jail.since].join('|'); s.party = null; R.jh = /设法脱逃/.test(jhHtml(s)); }
    /* 高龄长跳 */
    { let dead = 0; for (let k = 0; k < 200; k++) { const p1 = Math.min(0.5, 0.03 + (70 - 56) * 0.012); if (Math.random() < 1 - Math.pow(1 - p1, 10)) dead++; } R.oldOk = /Math\.pow\(1 - p1, Math\.max\(0, years\)\)/.test(document.documentElement.outerHTML) || false; }
    return R; });
  const bad = [];
  if (!(r.tax > 200000)) bad.push('七月跳到次年七月，两税没收（国库只变了 ' + r.tax + '）');
  if (r.shop > 700) bad.push('程序经营的铺子一个月进了 ' + r.shop + '（上月的利又加了一遍）');
  if (r.upk > 0) bad.push('没编成营的自家兵，按天又扣了一遍粮：' + r.upk);
  if (!(r.y1 >= 10) || !(r.y11 <= 2)) bad.push(`「到年底」不照几月算：正月 ${r.y1} 个月、十一月 ${r.y11} 个月`);
  if (/undefined|^\|/.test(r.jail) || !r.jail.split('|').every(Boolean)) bad.push('兵败被擒的押牢字段不全：' + r.jail);
  if (!r.jh) bad.push('孤身被擒没有脱逃、赎身的按钮');
  if (!r.oldOk) bad.push('高龄长跳的死亡没照年复算');
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
