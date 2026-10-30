// 每回材料（CLAUDE.md「发布与仓库」局面卡与按需材料）：先给一张短的局面卡（身份、权限、手里的、在办的）；记账只附跟这一回相干的字段，没给的字段程序保留旧值；要紧的不丢
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof ledgerInput === 'function' && typeof cardBlock === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    const mk = (o) => { const st = Object.assign({ id: 'c', v: 2, turn: 6, title: 't', protagonist: { name: '汪景和', role: '扬州盐商', age: 41, gender: '男' }, career: null, idm: 'commoner', clock: { y: 1757, m: 3, d: 6, h: 10, yearLabel: '乾隆二十二年' }, place: { full: '扬州府江都县', polity: '清' }, people: { 程立德: { role: '账房', tie: '账房', seen: 3, favor: 10 } }, household: [], chat: [], canon: [], deeds: [], chronicle: [], summaries: [], orders: [], goals: [], status: {}, prices: [{ item: '盐', price: 4, per: '引' }], powers: [], territory: [], forces: [], places: { 仪征县: { now: '扬州府仪征县', note: '掣验所在' }, 邵伯镇: { now: '江都县邵伯镇' } }, world: { overview: '乾隆中叶', events: [], upcoming: [] }, money: { cash: 5000, unit: '两' } }, o); return migrate(st) || st; };
    const L = (st, said, story) => { S = st; CUR_SAID = said; return ledgerInput(st, said, story || '程立德拱手回话。', '', '', null); };
    // 局面卡：三处都有，写明身份与权限
    S = mk({}); CUR_SAID = '派人去仪征打听行情';
    const r = rulingInput(S, CUR_SAID), led = L(S, CUR_SAID), sto = storyInput(S, CUR_SAID, '', '', false, null, ''), stoT = Array.isArray(sto) ? sto.map(m => m.content || '').join('') : String(sto);
    for (const [n, t] of [['推演', r], ['记账', led], ['写正文', stoT]]) if (!/【局面卡/.test(t) || !/政治权力：没有官府权力/.test(t) || !/现钱 5,?000/.test(t)) bad.push(n + '材料里没有局面卡或身份、现钱不对');
    // 记账只附相干字段：盐商打听行情不给兵马、案子、国势的字段；带兵、告状、做官时才给
    if (/"forces":\[/.test(led)) bad.push('盐商打听行情，记账还附兵马字段');
    if (/"cases":\[/.test(led)) bad.push('没有官司，记账还附案子字段');
    if (/"govChanges":\[/.test(led)) bad.push('没有辖区，记账还附国势字段');
    if (!/"business":\[/.test(led)) bad.push('盐商的生意字段被拿掉了');
    if (!/只给这一回有变化的项/.test(led) || !/程序保留旧值/.test(led)) bad.push('记账没写明只报变化、不确定的不给');
    if (!/"forces":\[/.test(L(mk({}), '带家丁去江边巡视，招募护卫'))) bad.push('玩家说带兵募人，记账没附兵马字段');
    if (!/"cases":\[/.test(L(mk({}), '去县衙告状'))) bad.push('玩家告状，记账没附案子字段');
    const zb = mk({ idm: 'official', protagonist: { name: '甲', role: '狼山镇总兵' }, career: { office: '狼山镇总兵', rank: '正二品' }, forces: [{ name: '镇标', leader: '甲', troops: 3000 }] });
    const lz = L(zb, '歇着'); if (!/"forces":\[/.test(lz)) bad.push('总兵歇着，记账也得有兵马字段（他管着兵）'); if (!/朝廷命官/.test(lz) || !/只有自己统带的3000人/.test(lz)) bad.push('总兵的局面卡没写对：' + (lz.match(/· 身份：[^\n]*/) || [''])[0]);
    const lx = L(mk({ idm: 'official', protagonist: { name: '甲', role: '江都县知县' }, career: { office: '江都县知县' }, gov: { scope: 'local', keys: [], stats: {} } }), '升堂'); if (!/"govChanges":\[/.test(lx)) bad.push('知县记账没附辖区国势字段');
    // 地理册：不是问路也要带上话里提到的地方
    if (!/仪征县/.test(led)) bad.push('话里提到的仪征，地理册没附上');
    // 开局这类没有账册的场合：规则全给
    if (!/"forces":\[/.test(ledgerRules())) bad.push('开局记账规则被删了字段');
    // 在办的事进局面卡
    S = mk({}); actNew(S, { type: '令', what: '派程立德去仪征打听', who: '程立德' }); if (!/在办的事：a?\w*「令」派程立德去仪征打听/.test(cardBlock(S))) bad.push('在办的行动单没进局面卡：' + cardBlock(S));
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
