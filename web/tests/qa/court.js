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
  // 不同身份不同面板：盐商没有朝局、军务；知县有衙署、没有军务；武官有军务；皇帝都有
  const tabs = await p.evaluate(() => { const save = { idm: S.idm, role: S.protagonist.role, career: S.career, forces: S.forces }; const k = () => tabsFor(S).map(x => x[0]).join(','); const r = {};
    r.merchant = k(); S.career = { office: '江都县知县', rank: '正七品' }; r.local = k() + '|' + tabsFor(S).find(x => x[0] === 'court')?.[1];
    S.career = { office: '扬州营游击', rank: '从三品' }; r.mil = k(); S.career = { office: '户部主事', rank: '正六品' }; r.court = k();
    S.career = save.career; S.idm = 'emperor'; S.protagonist.role = '皇帝'; r.ruler = k(); S.idm = save.idm; S.protagonist.role = save.role; return r; });
  if (/court|army/.test(tabs.merchant)) bad('盐商也有朝局或军务：' + tabs.merchant);
  if (!/court/.test(tabs.local) || /army/.test(tabs.local) || !/衙署/.test(tabs.local)) bad('知县的面板不对：' + tabs.local);
  if (!/army/.test(tabs.mil)) bad('武官没有军务：' + tabs.mil);
  if (!/court/.test(tabs.court) || /army/.test(tabs.court)) bad('京官的面板不对：' + tabs.court);
  if (!/court/.test(tabs.ruler) || !/army/.test(tabs.ruler)) bad('皇帝的面板不全：' + tabs.ruler);
  if (await p.$('[data-tab="court"]')) bad('盐商的侧栏上有朝局');
  // 眼下的事：每个月理一回，合常情，摆在输入框上面，点了写进框里（CLAUDE.md「剧情」）
  { const ag = await p.evaluate(async () => { S.agenda = null; await buildAgenda(S); TAB = 'board'; render(); const g = document.querySelector('.agenda'); return { n: arr(S.agenda && S.agenda.items).length, ui: g ? g.innerText : '' }; });
    if (ag.n < 3 || !/盐课/.test(ag.ui)) bad('这个月手头的事没理出来、或没摆在输入框上面：' + JSON.stringify(ag));
    await p.evaluate(() => { const t = document.querySelector('#said'); if (t) t.value = ''; }); await p.click('.agenda .goal'); if (!/盐课/.test(await p.inputValue('#said'))) bad('点眼下的事没写进框里'); await p.evaluate(() => { document.querySelector('#said').value = ''; }); }
  // 势力着色：做个盐商，督标、商帮这些不占地盘的不画到图上（只有一方之主、割据的才画地盘）
  { const ow = await p.evaluate(() => { const k = S.powers; S.powers = [{ name: '两江督标', leader: '尹继善', seat: '江宁府', land: '苏州府' }]; const m = mapOwners(S); S.powers = k; return [...m.keys()]; });
    if (ow.length) bad('不占地盘的势力也画了地盘：' + ow.join()); }
  // 当成一方之主
  await p.evaluate(async () => { S.idm = 'emperor'; S.protagonist.role = '皇帝'; S.dossiers = { ...(S.dossiers || {}), 年羹尧: { real: true, born: 1679, died: 1726 }, 刘统勋: { real: true, born: 1698, died: 1773 }, 傅恒: { real: true, born: 1720, died: 1770 }, 来保: { real: true } }; while (ORGING) await new Promise(r => setTimeout(r, 200)); S.org = null; await buildOrg(S); });
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
  // 人事树先填真人：史料里这一年在任的（杨应琚 1757 年陕甘总督）换掉虚构的
  { const fr = await p.evaluate(() => { S.org.nodes.push({ id: 'T1', name: '陕甘总督衙门', tier: '地方', parent: 'root', depth: 1, posts: [{ title: '陕甘总督', holder: '王守成', src: '拟', quota: 1 }] }); orgFillReal(S); const q = S.org.nodes.find(n => n.id === 'T1').posts[0]; return { h: q.holder, src: q.src, fake: fictionSet(S).has(q.holder) }; });
    if (fr.h !== '杨应琚' || fr.fake) bad('史料里有在任的真人，人事树上还是虚构的：' + JSON.stringify(fr)); }
  // 人选只能是开科、招贤来的人、身边的门客幕僚、已在官的人；凭空写个名字不行；开科取的下一回才到；真人照真实处境肯不肯来（王猛不会给别人当官）
  { const tl = await p.evaluate(async () => { const n = S.org.nodes.find(x => x.id === 'A2'); const r = {}; ORGMSG = ''; orgAct(S, 'appoint', { node: n, pi: 0, person: '张三丰' }); r.free = ORGMSG;
      const got = recruitFake(S, 'exam'); ORGMSG = ''; orgAct(S, 'appoint', { node: n, pi: 0, person: got[0] }); r.wait = ORGMSG; r.got = got.length; r.fake = got.every(x => fictionSet(S).has(x));
      S.talent.list.push({ name: '王猛', real: true, from: '查访', where: '长安', situation: '前秦丞相', will: '不肯' }); const w = await willCheck(S, '王猛', '户部尚书'); r.wm = w; return r; });
    if (!/不在人选里/.test(tl.free)) bad('凭空写个名字也能委任：' + tl.free);
    if (tl.got < 3 || !tl.fake) bad('开科取士没来人、或来的人没标虚构：' + JSON.stringify(tl));
    if (!/还在路上/.test(tl.wait)) bad('开科取的人当回就能用：' + tl.wait);
    if (tl.wm.ok) bad('王猛竟肯来：' + JSON.stringify(tl.wm)); }
  // 死人委任不了
  const unfold = () => p.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
  await unfold(); await p.fill('[data-oin="A2_0"]', '年羹尧'); await p.click('[data-org="appoint"][data-n="A2"][data-p="0"]'); await p.waitForTimeout(300);
  if (!/去世/.test(await p.evaluate(() => ORGMSG))) bad('委任已死的人没拦下');
  // 委任刘统勋为户部尚书：写进输入框，花一点国策点
  await unfold(); await p.fill('[data-oin="A2_0"]', '刘统勋'); await p.click('[data-org="appoint"][data-n="A2"][data-p="0"]'); await p.waitForFunction(() => !/正在看/.test(ORGMSG), null, { timeout: 60000 }).catch(() => bad('看刘统勋肯不肯来卡住了'));
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
  // 国策点：照上次结算到的月份，过一个月涨三点（不靠这一回假 AI 写过了几天）
  const acc = await p.evaluate(() => { const a = S.polPts; S.polYM = Math.floor(ymOf(S.clock)) - 1; applyReply(S, { reply: '日子照常过去。', mode: 'play', elapsedDays: 0 }, '歇着'); return [a, S.polPts]; });
  if (acc[1] !== Math.min(30, acc[0] + 3)) bad('过了一个月国策点没涨三点：' + JSON.stringify(acc));
  // 职权照辖区和品级：知县只管得到自己的县衙——吏役自己辟用，县丞这些朝廷命官只能详请保举；别的衙门、设官定员、国策都轮不到他
  { const sc = await p.evaluate(() => { const keep = { idm: S.idm, role: S.protagonist.role, career: S.career }; S.idm = 'official'; S.protagonist.role = '江都县知县'; S.career = { office: '江都县知县', rank: '正七品' };
      const hx = S.org.nodes.find(n => n.name === '江都县署'); hx.posts[0].holder = S.protagonist.name; const sub = S.org.nodes.find(n => n.parent === hx.id && /房|班/.test(n.name)) || hx;
      const staff = sub.posts.find(q => /吏|役|班|房|书|快|皂|壮/.test(sub.name + q.title)) || sub.posts[0], zf = hx.posts.find(q => /县丞|主簿|典史/.test(q.title)), hb = S.org.nodes.find(n => n.id === 'A2');
      const r = { lv: orgScope(S).lv, other: orgCan(S, hb, hb.posts[0], 'appoint'), staff: orgCan(S, sub, staff, 'appoint'), zf: zf ? orgCan(S, hx, zf, 'appoint') : 'none', node: orgCan(S, hx, null, 'addNode'), pol: orgCan(S, null, null, 'policy') };
      ORGMSG = ''; orgAct(S, 'appoint', { node: hb, pi: 0, person: '刘统勋' }); r.msg = ORGMSG;
      hx.posts[0].holder = ''; S.idm = keep.idm; S.protagonist.role = keep.role; S.career = keep.career; return r; });
    if (sc.lv !== 'scoped' || sc.other || sc.node || sc.pol) bad('小官管得着别的衙门、设官、国策：' + JSON.stringify(sc));
    if (sc.staff !== 'hire') bad('知县不能自己辟用吏役：' + JSON.stringify(sc));
    if (sc.zf !== 'none' && sc.zf !== 'propose') bad('知县竟能直接任命县丞：' + JSON.stringify(sc));
    if (!/不归你管/.test(sc.msg)) bad('知县委任户部尚书没拦下：' + sc.msg); }
  // 逐年核人事：查到调走、有接任真人的就换上，记进人事记录；名册里查定的真人换掉虚构的
  const rf = await p.evaluate(async () => { S.org.checkedY = null; const n = await orgRefresh(S); const jj = S.org.nodes.find(x => x.id === 'A1').posts[0]; return { n, h: jj.holder, log: arr(S.org.log).some(x => /傅恒/.test(x.text) && /来保/.test(x.text)) }; });
  if (rf.h !== '来保' || !rf.log) bad('逐年核人事没把调走的人换掉：' + JSON.stringify(rf));
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
