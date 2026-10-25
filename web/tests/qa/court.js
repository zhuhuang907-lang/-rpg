// 朝局：一方之主看得到政治经济民生军事总览、人事树、国策书；在树上委任（写成下一步命令、花国策点），记账回报到任就落到树上；颁行国策；死人委任不了；身份低的只能看；久不来往的人照关系淡出、不删
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('dialog', d => d.accept());
  const bad = m => errs.push(m);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !BG && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  // 身份低（盐商）：只能看
  const v0 = await p.evaluate(() => permLevel(S));
  if (v0 !== 'view') bad('盐商竟能改人事：' + v0);
  // 当成一方之主
  await p.evaluate(async () => { S.idm = 'emperor'; S.protagonist.role = '皇帝'; S.dossiers = { ...(S.dossiers || {}), 年羹尧: { real: true, born: 1679, died: 1726 }, 刘统勋: { real: true, born: 1698, died: 1773 } }; await buildOrg(S); });
  const o = await p.evaluate(() => ({ n: S.org && S.org.nodes.length, pols: arr(S.policies).length, pts: S.polPts, fake: S.org && S.org.nodes.some(n => n.posts.some(x => /某/.test(x.holder))) }));
  if (!o.n || o.pols < 2) bad('人事树、国策书没整理出来：' + JSON.stringify(o));
  if (o.fake) bad('人事树里填了「某」这种编的名字');
  const deep = await p.evaluate(() => ({ max: Math.max(...S.org.nodes.map(n => n.depth || 0)), vac: S.org.nodes.filter(n => n.id !== 'root').some(n => n.posts.some(x => !x.holder)), fz: S.org.nodes.find(n => /保甲/.test(n.name)).posts[0], fs: fictionSet(S).size }));
  if (deep.max < 4) bad('人事树没有一路通到基层：最深 ' + deep.max + ' 层');
  if (deep.vac) bad('还有空着没起名的位子');
  if (!(deep.fz.others && deep.fz.others.length >= 2)) bad('保正员额四十，只列了一个人');
  if (!deep.fs) bad('虚构的官员没标虚拟');
  await p.click('[data-tab="court"]'); await p.waitForTimeout(500);
  const t0 = await p.evaluate(() => document.querySelector('.side, #side, body').innerText);
  for (const w of ['政治', '经济', '民生', '军事', '人事树', '国策书', '户部', '尚书', '国策点', '线路：', '江都县署', '保正', '虚拟', '扬州营']) if (!t0.includes(w)) bad('朝局页上没有：' + w);
  // 死人委任不了
  const unfold = () => p.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
  await unfold(); await p.fill('[data-oin="A2_0"]', '年羹尧'); await p.click('[data-org="appoint"][data-n="A2"][data-p="0"]'); await p.waitForTimeout(300);
  if (!/去世/.test(await p.evaluate(() => ORGMSG))) bad('委任已死的人没拦下');
  // 委任刘统勋为户部尚书：写进输入框，花一点国策点
  await unfold(); await p.fill('[data-oin="A2_0"]', '刘统勋'); await p.click('[data-org="appoint"][data-n="A2"][data-p="0"]'); await p.waitForTimeout(300);
  const said = await p.inputValue('#said'), pts1 = await p.evaluate(() => S.polPts);
  if (!/下令：任命刘统勋为户部尚书/.test(said)) bad('委任没写进下一步：' + said);
  if (pts1 !== o.pts - 1) bad(`国策点没扣：${o.pts} → ${pts1}`);
  // 颁行国策：有前置的先不能行
  await p.evaluate(() => { const q = S.policies.find(x => x.id === 'p2'); orgAct(S, 'policy', { pol: q }); });
  if (!/要先推行/.test(await p.evaluate(() => ORGMSG))) bad('有前置的国策没拦下');
  await unfold(); await p.click('[data-org="policy"][data-pol="p1"]'); await p.waitForTimeout(300);
  await p.click('#bSend'); if (!(await idle())) bad('下令那一回卡住');
  const r = await p.evaluate(() => ({ h: S.org.nodes.find(n => n.id === 'A2').posts[0].holder, pol: S.policies.find(x => x.id === 'p1').state, log: arr(S.org.log).length, pend: arr(S.orgPending).length, pts: S.polPts }));
  if (r.h !== '刘统勋') bad('记账回报到任了，人事树上没换人：' + JSON.stringify(r));
  if (r.pol !== '已行') bad('国策颁行了，国策书上没标已行：' + JSON.stringify(r));
  if (!r.log) bad('人事与施政记录是空的');
  if (r.pend) bad('结过账的待办还挂着');
  if (!(r.pts > pts1 - 3)) bad('过了一个月国策点没涨：' + JSON.stringify(r) + ' 时间 ' + JSON.stringify(await p.evaluate(() => [S.clock, S.polYM])));
  // 提前梳理：照资料定常见量级，账上离谱的物价临时拉回量级（标待核），人事树上的错当场改；朝局页看得到
  const fx = await p.evaluate(async () => { S.prices = [{ item: '米', price: 30, per: '石' }]; await buildFacts(S); return { p: S.prices[0], rank: S.org.nodes.find(n => n.id === 'A2').posts[0].rank, facts: S.factSheet && S.factSheet.facts.length, blk: factBlock(S).length, doubt: dataDoubts(S).some(x => /待核|临时改为/.test(x)) }; });
  if (!fx.facts) bad('提前梳理没做出来');
  if (fx.p.price !== 2.2 || fx.p.note !== '待核') bad('离谱的米价没临时拉回量级：' + JSON.stringify(fx.p));
  if (!/满汉/.test(fx.rank)) bad('梳理挑出的人事树错误没改：' + fx.rank);
  if (!fx.blk) bad('梳理没进写正文的材料');
  if (!fx.doubt) bad('临时改过的数没交给记账去定准');
  await p.click('[data-tab="court"]'); await p.waitForTimeout(300);
  if (!/史实梳理/.test(await p.evaluate(() => document.body.innerText))) bad('朝局页上看不到史实梳理');
  // 久不来往的人：萍水相逢的过几回断，家人不断；不删
  const f = await p.evaluate(() => { S.people['卖饼的王二'] = { role: '小贩', tie: '路人', seen: S.turn - 5 }; S.people['周先生'] = { role: '塾师', tie: '老师', seen: S.turn - 5 }; S.people['汪承裕'] = { role: '儿子', tie: '儿子', seen: S.turn - 99 }; fadePeople(S); return { a: !!S.people['卖饼的王二'].faded, b: !!S.people['周先生'].faded, c: !!S.people['汪承裕'].faded, kept: '卖饼的王二' in S.people, live: livePeople(S).some(([k]) => k === '卖饼的王二') }; });
  if (!f.a) bad('萍水相逢的过了几回还没断');
  if (f.b) bad('老师才几回没见就断了');
  if (f.c) bad('儿子竟然断了来往');
  if (!f.kept) bad('断了来往的人被删了');
  if (f.live) bad('断了来往的人还在往材料里塞');
  await p.click('[data-tab="people"]'); await p.waitForTimeout(400);
  if (!/断了来往的旧识/.test(await p.evaluate(() => document.body.innerText))) bad('人物页没有「断了来往的旧识」');
  console.log('COURT', JSON.stringify({ o, r, f }));
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
