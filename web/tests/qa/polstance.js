// 政令有阻力、要时间（R-242 第二步）：真点赋税、盐法按钮；朝中各派照主张表态，反对的记怨；新令一两个月后才落地，没落地前账上照旧；
// 吏治坏，减赋的好处落不到百姓身上；筹钱也有各派表态
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1800 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof polStance === 'function');
  await p.evaluate(() => { S = newSave({ name: '赵顼', gender: '男', age: 22, role: '皇帝', real: true, gregorianYear: 1070, month: 3, day: 1, place: '开封', polity: '北宋' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.realm = { treasury: 1000000, granary: 2000000 }; S.fisc = { kind: 'realm', unit: '贯', base: { tianfu: 6000000, dingyi: 1200000, shang: 2000000, yan: 1500000, feng: 1200000 }, pol: { tax: '常', yan: '照旧', coin: '足值', cp: false, yao: '常' }, works: [], kc: { due: 0, paid: 0 }, price: 100 };
    S.gov = { scope: 'realm', stats: { 民心: 50, 腐败: 30, 治安: 50, 灾情: 20, 威望: 40 }, keys: ['民心', '腐败', '治安', '灾情', '威望'] };
    S.factions = [{ name: '新党', leader: '王安石', members: '吕惠卿、曾布', aim: '变法理财、富国强兵', grudge: 0 }, { name: '旧党', leader: '司马光', members: '文彦博、富弼', aim: '守成旧法、宽恤民力', grudge: 0 }];
    VIEW = 'game'; TAB = 'board'; SIDE_FOLD = false; render(); });
  // 加赋：新党拥护、旧党反对记怨；要过些时日才落地
  await p.click('button[data-fisc="tax"][data-v="重"]');
  const r1 = await p.evaluate(() => ({ pol: S.fisc.pol.tax, pend: S.fisc.polPend && S.fisc.polPend.tax, g: S.factions.map(f => f.grudge), log: arr(S.facLog).map(x => x.text), note: arr(S.lifeLog || S.life || []).slice(-1), now: polNow(S.fisc, Math.floor(ymOf(S.clock))).tax, html: document.body.innerText.includes('新令在推行') }));
  if (r1.pol !== '重') errs.push('点了加赋，政令没改');
  if (!r1.pend || r1.now !== '常') errs.push('加赋当月就照行了，没有推行的时日：' + JSON.stringify(r1));
  if (!(r1.g[1] >= 2 && r1.g[0] === 0)) errs.push('旧党反对没记怨、或新党记了怨：' + r1.g);
  if (!r1.log.some(x => /新党.*拥护/.test(x)) || !r1.log.some(x => /旧党.*反对/.test(x))) errs.push('派系表态没记：' + JSON.stringify(r1.log));
  if (!r1.html) errs.push('页面没显示新令在推行');
  // 月结：没落地前照旧收，落地后多收
  const r2 = await p.evaluate(() => { const F = S.fisc, out = [], tf = []; for (let i = 0; i < 5; i++) { S.clock.m = S.clock.m % 12 + 1; if (S.clock.m === 1) S.clock.y++; F.ym = null; out.push(...fiscalMonthly(S)); tf.push(F.last.R['丁役']); } return { out, tf, pend: F.polPend && F.polPend.tax }; });
  if (!r2.out.some(x => /赋税新令各地已照行/.test(x))) errs.push('新令落地没报：' + JSON.stringify(r2.out));
  if (!(r2.tf[r2.tf.length - 1] > r2.tf[0])) errs.push('加赋落地后丁役没多收：' + r2.tf);
  if (r2.pend) errs.push('落地后还挂着推行');
  // 吏治坏：减赋的好处落不到百姓
  const r3 = await p.evaluate(() => { const one = fu => { S.fisc.pol.tax = '轻'; S.fisc.pol.yao = '常'; S.fisc.polPend = {}; S.gov.stats.腐败 = fu; S.gov.stats.民心 = 50; S.fisc.price = 100; S.clock.m = S.clock.m % 12 + 1; S.fisc.ym = null; fiscalMonthly(S); return S.gov.stats.民心; }; return { clean: one(5), dirty: one(90) }; });
  if (!(r3.clean > r3.dirty)) errs.push('吏治清浊减赋一样得民心：' + JSON.stringify(r3));
  // 筹钱也有表态：括户清丈新党拥护、守旧的反对
  const r4 = await p.evaluate(() => { S.fisc.fundYM = {}; S.facLog = []; fundRaise(S, '括户'); return arr(S.facLog).map(x => x.text); });
  if (!r4.some(x => /括户.*新党.*拥护/.test(x)) || !r4.some(x => /括户.*旧党.*反对/.test(x))) errs.push('括户新党没拥护、旧党没反对：' + JSON.stringify(r4));
  console.log('POLST', JSON.stringify({ g: r1.g, tf: r2.tf, r3 })); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
