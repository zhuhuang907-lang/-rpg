// 国计民生按季推演（R-168）：GLM 推年成、米价、工钱、商贸、银钱、流民、制度落地，程序照档折算落账；
// 推演交 GLM（不强制 DeepSeek）；写正文的材料带这一季的市面民生；囤米、粜米、施粥、开仓平粜、以工代赈全真点
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof msSim === 'function');
  const bad = [], ev = (f, a) => p.evaluate(f, a), click = async (sel, what) => { const el = await p.$(sel); if (!el) { bad.push('没有「' + what + '」按钮'); return false; } await p.click(sel); await p.waitForTimeout(150); return true; };
  const setup = (ruler) => ev(ruler => {
    S = newSave({ name: ruler ? '朱由检' : '张三', gender: '男', age: 30, role: ruler ? '皇帝' : '佃农', real: !!ruler, gregorianYear: 1640, month: 7, day: 1, place: '开封', polity: '明' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3; S.renown = 40;
    S.money = { cash: 5000, unit: '两' }; S.econ = { v: 2, y: 1640, pl: geoCenter(S), unit: '两', rice: 2, wage: 0.05, landPrice: 5, cloth: 0.5, yield: 2, rentRate: 0.5 };
    if (ruler) { S.realm = { treasury: 3000000, granary: 2000000 }; S.fisc = { kind: 'realm', unit: '两', base: { tianfu: 6000000, shang: 2000000 }, pol: { tax: '重', yan: '照旧', coin: '足值', cp: false, yao: '常' }, works: [], kc: { due: 0, paid: 0 }, price: 100 };
      S.gov = { scope: 'realm', stats: { 民心: 45, 腐败: 50, 治安: 50, 灾情: 30 }, keys: ['民心', '腐败', '治安', '灾情'] }; S.polBook = [{ id: 'p1', area: '经济', name: '加派练饷', state: '已行' }];
      S.org = { nodes: [{ id: 'root', name: '明', depth: 0, posts: [] }, { id: 'n1', name: '户部', depth: 1, parent: 'root', posts: [{ title: '户部尚书', holder: '李待问' }, { title: '内阁首辅', holder: '薛国观' }, { title: '兵部尚书', holder: '陈新甲' }] }] }; }
    VIEW = 'game'; TAB = 'board'; SIDE_FOLD = false; render(); }, ruler);
  const R = { harvest: '大歉', harvestWhy: '河南大旱，蝗起', rice: '暴涨', riceWhy: '秋粮绝收，商贩囤积', wage: '跌', cloth: '平', land: '跌', coin: '钱荒', coinWhy: '银贵钱贱', trade: '衰', tradeWhy: '流寇阻断商路', refugee: '遍野', refugeeWhy: '饥民四出', inst: [{ name: '加派练饷', exec: '扰民', who: '李待问', why: '州县催科如火' }, { name: '没这条国策', exec: '照行' }], events: ['开封城外人相食'] };
  // 皇帝：推演走 GLM、不强制 DeepSeek；落账
  await setup(true);
  { const r = await ev(async R => { let opt = null, q = ''; window.callClaude = async (x, sys, o) => { opt = o; q = x; return { text: JSON.stringify(R) }; }; const G0 = { ...S.gov.stats }, sh0 = 1;
      await msSim(S); render(); return { opt, route: routeOf(opt.kind), q, G0, G: S.gov.stats, rice: S.econ.rice, base: S.econ.base.rice, ms: S.ms, rp: ricePrice(S), card: cardBlock(S), side: document.body.innerText, press: arr(S.press).map(x => x.title), polExec: S.polBook[0].exec }; }, R);
    if (r.opt.ds || r.opt.kind !== '推演') bad.push('国计民生推演没交给推演那一路（GLM）：' + JSON.stringify(r.opt));
    if (!/本朝赋役/.test(r.q) || !/加派练饷/.test(r.q) || /"harvest":"[^"]/.test(r.q)) bad.push('推演的材料缺本朝赋役、国策，或格式里放了示例');
    if (!(r.rice >= r.base * 1.4)) bad.push('米价暴涨没落到行情：' + r.rice);
    if (r.rp !== r.rice) bad.push('军粮米价没照这一季的行情：' + r.rp);
    if (!(r.G['灾情'] > r.G0['灾情']) || !(r.G['民心'] < r.G0['民心']) || !(r.G['治安'] < r.G0['治安'])) bad.push('大歉、流民遍野没落到灾情民心治安：' + JSON.stringify({ a: r.G0, b: r.G }));
    if (r.polExec !== '扰民' || r.ms.inst.length !== 1 || r.ms.inst[0].who !== '李待问') bad.push('制度落地没照名单记、或收了名单外的：' + JSON.stringify(r.ms.inst));
    if (!r.press.some(x => /饥民聚众/.test(x))) bad.push('流民遍野民心低没来饥民聚众');
    if (!/这一季的市面民生：年成大歉/.test(r.card)) bad.push('写正文的材料没带这一季的市面民生');
    if (!/市面与民生/.test(r.side) || !/河南大旱/.test(r.side) || !/加派练饷扰民/.test(r.side)) bad.push('页上没有市面与民生、或没写缘由与制度落地'); }
  // 商税照市面衰减
  { const r = await ev(() => { const F = S.fisc; F.ym = null; fiscalMonthly(S); const a = F.last.R['商税']; S.ms.tradeK = 1; F.ym = null; S.clock.m++; fiscalMonthly(S); return { low: a, mid: F.last.R['商税'] }; }); if (!(r.low < r.mid)) bad.push('市面萧条商税没少：' + JSON.stringify(r)); }
  // 开仓平粜、以工代赈：真点，一季一回
  { const r0 = await ev(() => ({ rice: S.econ.rice, g: S.realm.granary, mx: S.gov.stats['民心'] }));
    if (await click('[data-ms="pingtiao"]', '开仓平粜')) { const r = await ev(() => ({ rice: S.econ.rice, g: S.realm.granary, mx: S.gov.stats['民心'] })); if (!(r.rice < r0.rice) || !(r.g < r0.g) || !(r.mx > r0.mx)) bad.push('开仓平粜没压米价、没出仓粮或民心没涨：' + JSON.stringify({ r0, r })); }
    await click('[data-ms="pingtiao"]', '再开仓'); if ((await ev(() => S.realm.granary)) < r0.g * 0.95 - 1) bad.push('一季里开了两回仓');
    const f0 = await ev(() => ({ ref: S.ms.ref, t: S.realm.treasury })); if (await click('[data-ms="gongzhen"]', '以工代赈')) { const r = await ev(() => ({ ref: S.ms.ref, t: S.realm.treasury })); if (!(r.ref < f0.ref) || !(r.t < f0.t)) bad.push('以工代赈没少流民或没花钱：' + JSON.stringify({ f0, r })); } }
  // 佃农：囤米粜米、施粥；没有开仓按钮；米贵时一家吃穿更贵
  await setup(false);
  { const n0 = await ev(() => hhNeed(S)); await ev(async R => { window.callClaude = async () => ({ text: JSON.stringify({ ...R, inst: [] }) }); await msSim(S); render(); }, R);
    const n1 = await ev(() => hhNeed(S)); if (!(n1 > n0)) bad.push('米价暴涨一家吃穿没变贵：' + JSON.stringify({ n0, n1 }));
    if (await ev(() => !!document.querySelector('[data-ms="pingtiao"]'))) bad.push('佃农也能开仓平粜');
    await p.fill('#msQty', '20'); const c0 = await ev(() => S.money.cash);
    if (await click('[data-ms="buy"]', '囤米')) { const r = await ev(() => ({ c: S.money.cash, st: S.ms.store })); if (r.st !== 20 || !(r.c < c0)) bad.push('囤米没记上或没花钱：' + JSON.stringify(r)); }
    await ev(() => { S.ms.k.rice *= 1.5; msApply(S); render(); }); await p.fill('#msQty', '20'); const c1 = await ev(() => ({ c: S.money.cash, r: S.renown }));
    if (await click('[data-ms="sell"]', '粜米')) { const r = await ev(() => ({ c: S.money.cash, st: S.ms.store, r: S.renown, m: ORGMSG })); if (r.st !== 0 || !(r.c > c1.c) || !(r.r < c1.r) || !/囤积居奇/.test(r.m)) bad.push('荒年高价粜米没赚钱、没挨骂：' + JSON.stringify(r)); }
    const z0 = await ev(() => ({ c: S.money.cash, r: S.renown })); if (await click('[data-ms="zhou"]', '施粥')) { const r = await ev(() => ({ c: S.money.cash, r: S.renown })); if (!(r.c < z0.c) || !(r.r >= z0.r + 3)) bad.push('流民遍野施粥没花钱或名声没涨：' + JSON.stringify({ z0, r })); } }
  // 推不出来就不动：坏 JSON 不改行情
  { const r = await ev(async () => { const rice = S.econ.rice; S.ms.q = null; window.callClaude = async () => ({ text: '不知道' }); try { await msSim(S); } catch (_) {} return { a: rice, b: S.econ.rice }; }); if (r.a !== r.b) bad.push('没推出来也改了米价'); }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
