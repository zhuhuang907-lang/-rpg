// 百姓科举、经营（CLAUDE.md「人事与职权」科举之路、经营）：功名照朝代的科举一级级考，日子照制度，到月程序定中不中、改功名、进士授官；隋以前走察举；
// 开铺子、置田产由 DeepSeek 判行情、程序按月结算盈亏落到现钱，增资、收铺当场办；记账改不了铺子本钱
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof examApply === 'function' && typeof shopOpen === 'function');
  const out = await p.evaluate(async () => {
    const bad = [], mk = (y, m) => { const s = newSave({ name: '甲乙丙', gender: '男', age: 20, role: '耕读人家的读书人', gregorianYear: y, month: m, day: 1, place: '扬州府江都县', polity: '清', nativePlace: '扬州府江都县' }); s.chat = [{ role: 'gm', text: '开场。' }]; s.money = { cash: 5000, unit: '两', hist: [] }; s.skills = { 文墨: { lv: 95 } }; S = s; VIEW = 'game'; return s; };
    // 1 清代：童生先考院试，日子照制度（每年三月），报考扣盘费
    let s = mk(1747, 1); let nx = examNext(s); if (!nx || nx.name !== '院试' || nx.m !== 3) bad.push('童生下一场不是三月的院试：' + JSON.stringify(nx));
    const c0 = s.money.cash; examApply(s); if (!s.exam.pending || !(s.money.cash < c0)) bad.push('报考没记下、没扣盘费');
    // 到月份程序定中不中；文墨好、闭门读书久的十有八九中；中了改功名、履历
    s.exam.studyFrom = Math.floor(ymOf(s.clock)) - 36; s.clock.m = 3; let r = examMonthly(s); if (!r.length) bad.push('到了院试的月份没结算');
    let tries = 0; while (s.exam.lv === '童生' && tries < 6) { s.clock.y += 1; s.clock.m = 2; examApply(s); s.clock.m = 3; examMonthly(s); tries++; } if (s.exam.lv !== '生员') bad.push('文墨九十五、读书三年，考六次院试都没中');
    if (!arr((s.career || {}).titles).includes('生员') || !arr(s.careerLog).length) bad.push('中了没改功名、没记履历');
    // 2 乡试只在子午卯酉年八月
    nx = examNext(s); if (!nx || nx.name !== '乡试' || nx.m !== 8 || nx.y % 3 !== 1) bad.push('生员的下一场不是子午卯酉年八月的乡试：' + JSON.stringify(nx));
    // 3 殿试必中、进士程序授官（明清三甲授知县、回避本省）
    s.exam.lv = '贡士'; s.clock.y = 1748; s.clock.m = 3; nx = examNext(s); if (!nx || nx.name !== '殿试') bad.push('贡士下一场不是殿试：' + JSON.stringify(nx)); examApply(s); s.clock.m = 4; examMonthly(s);
    if (s.exam.lv !== '进士' || !(s.career && s.career.office)) bad.push('殿试后没成进士、没授官：' + JSON.stringify(s.career)); else if (!/知县|翰林/.test(s.career.office)) bad.push('进士授的官不对：' + s.career.office);
    if (/知县/.test((s.career || {}).office || '') && identityOf(s).admin !== 'local') bad.push('授了知县却不是地方官');
    // 4 隋以前走察举
    const t = newSave({ name: '甲乙丙', gender: '男', age: 25, role: '读书人', gregorianYear: 180, month: 3, day: 1, place: '许县', polity: '汉' }); t.renown = 200; S = t; if (examNext(t)) bad.push('东汉也有科举'); examRecommend(t); if (!/孝廉|别人/.test(ORGMSG)) bad.push('求举孝廉没回音');
    // 5 仕途页摆出功名与科举
    S = mk(1747, 1); if (!/功名与科举/.test(examHtml(S)) || !/报考/.test(examHtml(S))) bad.push('仕途页没有科举');
    // 6 开铺子：DeepSeek 判行情，程序按月结算盈亏落到现钱；增资、收铺当场办；记账改不了本钱
    s = mk(1757, 3); s.skills = { 经商: { lv: 60 } }; const oc = callClaude; callClaude = async () => ({ text: JSON.stringify({ ok: true, why: '扬州米价、米行利息照《扬州画舫录》推', need: 800, lo: 0.012, hi: 0.025, risk: '米价涨落', name: '广源米行' }) });
    try { await shopOpen(s, '米行', 2000, '扬州'); } finally { callClaude = oc; }
    const b0 = arr(s.business).find(x => x.prog); if (!b0 || s.money.cash !== 3000) bad.push('开铺子没扣本钱、没立铺子：' + JSON.stringify(b0) + ORGMSG);
    const c1 = s.money.cash; shopMonthly(s, 1); if (!(s.money.cash !== c1)) bad.push('铺子一个月没结算盈亏');
    shopDo(s, '广源米行', 'add', 500); if (!b0 || b0.capital !== 2500) bad.push('增资没办');
    applyReply(s, { business: [{ name: '广源米行', capital: 999999, kind: '米行' }] }, '去看看铺子'); if (arr(s.business).find(x => x.name === '广源米行').capital !== 2500) bad.push('记账把铺子本钱改了');
    const c2 = s.money.cash; shopDo(s, '广源米行', 'close'); if (!(s.money.cash > c2) || arr(s.business).some(x => x.name === '广源米行')) bad.push('收铺没办');
    callClaude = async () => ({ text: JSON.stringify({ ok: false, why: '盐归官卖，私开盐铺犯禁，要先领盐引' }) }); try { const r2 = await shopOpen(s, '盐铺', 1000); if (r2 || !/盐引/.test(ORGMSG)) bad.push('犯禁的买卖也开成了'); } finally { callClaude = oc; }
    if (!/开张/.test(shopHtml(s))) bad.push('营生页没有开铺子');
    // 7 真点按钮（以前按钮的处理写在变量定义前面，一点就报错，函数测得过、按钮点不动）
    s = mk(1747, 1); TAB = 'career'; render0(); const be = document.querySelector('#bExam'); if (!be) bad.push('仕途页没有「报考」按钮'); else { be.click(); await new Promise(r => setTimeout(r, 300)); if (!S.exam || !S.exam.pending) bad.push('点了「报考」没报上：' + ORGMSG); }
    TAB = 'career'; render0(); const bs = document.querySelector('#bStudy'); if (bs) { bs.click(); await new Promise(r => setTimeout(r, 300)); if (S.exam.studyFrom == null) bad.push('点了「闭门读书」没开始'); }
    TAB = 'trade'; render0(); const ki = document.querySelector('#shopKind'), ca = document.querySelector('#shopCap'); if (!ki || !document.querySelector('#bShop')) bad.push('营生页没有开张的输入和按钮'); else { ki.value = '米行'; ca.value = '1000'; const oc2 = callClaude; callClaude = async () => ({ text: JSON.stringify({ ok: true, why: '推', need: 500, lo: 0.01, hi: 0.02, risk: '', name: '福源米行' }) }); document.querySelector('#bShop').click(); await new Promise(r => setTimeout(r, 600)); callClaude = oc2; if (!arr(S.business).some(x => x.prog)) bad.push('点了「开张」没开成：' + ORGMSG); }
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
