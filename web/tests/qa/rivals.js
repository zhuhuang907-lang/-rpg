// 敌国之主、手下大臣和将领由 DeepSeek 扮演，打仗不止攻城（需求台账 R-145；2026-11-07 玩家：「难道战争只有攻城？这样吧，让ds扮演敌对势力和手下大臣，主动操作他们」）
// 假 AI 回固定的计较；查：交给 DeepSeek（不走 GLM）、敌军真开拔真走到真打、劫粮真断粮、设伏真截击、野战不占城、和书允了真议和、
// 不合账的令不办（攻不是你的城）；大臣奏章准了真落账（犒军扣钱涨士气）、驳回好感掉；将领便宜行事；按钮都真点
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof foePlan === 'function');
  const bad = [];
  const r1 = await p.evaluate(async () => {
    const bad = [];
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.realm = { treasury: 500000 }; S.fisc = { kind: 'realm', base: { tianfu: 600000, shang: 200000, yan: 200000 }, pol: { tax: '常' } };
    S.forces = [{ name: '闽王亲军', leader: '王审知', owner: '你', troops: 30000, at: '福州', status: '驻守', grain: 900000, morale: 60 }, { name: '南路军', leader: '王延钧', owner: '你', troops: 8000, at: '漳州', status: '驻守', grain: 50000, morale: 60 }];
    S.territory = [{ place: '福州', troops: 3000 }, { place: '泉州', troops: 2000 }, { place: '漳州', troops: 1500 }];
    S.powers = [{ name: '南汉', leader: '刘䶮', seat: '广州', troops: '60000', stance: '敌' }, { name: '吴越', leader: '钱镠', seat: '杭州', troops: '40000', stance: '和' }];
    S.people = { 王延钧: { favor: 20, role: '将' }, 黄滔: { favor: 10, role: '判官' }, 王延禀: { favor: 5, role: '将' } };
    S.org = { nodes: [{ id: 'root', name: '闽', depth: 0, posts: [] }, { id: 'n1', name: '节度使府', depth: 1, parent: 'root', posts: [{ title: '判官', holder: '黄滔' }, { title: '都押衙', holder: '王延禀' }] }] };
    warStart(S, '南汉', warCBs(S, '南汉')[0] || '', false); if (!warOf(S, '南汉')) bad.push('开不了战');
    // 假 AI：记下每次的选项
    const CALLS = []; let REPLY = null; window.callClaude = async (input, _o, extra) => { CALLS.push({ input: String(input), extra: extra || {} }); return { text: JSON.stringify(REPLY) }; };
    // 1. 敌国之主：进攻漳州、攻一座不是你的城（不办）、求和
    REPLY = { orders: [{ power: '南汉', act: '进攻', target: '漳州', share: 0.5, general: '苏章', why: '闽兵分守，漳州最近' }, { power: '南汉', act: '进攻', target: '杭州', share: 0.3, why: '' }] };
    if (!foeDue(S)) bad.push('交战中，敌国这个月该定计较却没排上');
    await foePlan(S);
    if (!CALLS.length || !CALLS[0].extra.ds) bad.push('敌国之主没指名交给 DeepSeek 扮演');
    if (/示例|例如：\d|"share":0\.\d/.test(CALLS[0].input)) bad.push('格式里放了示例数');
    const G = foeArmies(S).find(g => g.owner === '南汉'); if (!G || !G.march || G.march.to !== '漳州') bad.push('敌军没开拔往漳州：' + JSON.stringify(foeArmies(S)));
    if (G && G.troops !== 30000) bad.push('敌军人数没照他能调的兵的五成算：' + (G && G.troops));
    if (arr(S.foeLog).some(x => /杭州/.test(x.what) && x.ok)) bad.push('攻一座不是你的城也照办了');
    if (foeDue(S)) bad.push('这个月定过了还要再定');
    // 2. 你设伏：南路军在漳州前头埋伏，敌军经过截击
    const sv = { ...G.march }; const A = S.forces[1]; A.status = '设伏'; A.ambTill = Math.floor(ymOf(S.clock)) + 2; A.at = '漳州';
    const L0 = campaignTick(S, 60).join('；'); if (!/设伏/.test(L0)) bad.push('敌军经过设伏的地方没截击：' + L0);
    // 3. 敌军走到了真打（换一支没人设伏的）
    S.forces[1].status = '驻守'; S.forces = S.forces.filter(f => !f.foe).concat([{ name: '南汉别部', owner: '南汉', leader: '', troops: 6000, quality: '中', at: '潮州', status: '行军', foe: true, march: { from: '潮州', to: '泉州', li: 300, done: 0, pace: 35 } }]);
    const t0 = S.territory.length; let L1 = ''; for (let i = 0; i < 4; i++) L1 += campaignTick(S, 10).join('；');
    if (!/兵临泉州/.test(L1) || !/来攻泉州|泉州.*(丢|守)/.test(L1 + JSON.stringify(S.lastCampBattle || {}))) bad.push('敌军走到泉州没打：' + L1);
    // 4. 劫粮：你的兵远离自家城池，粮道被断
    const far = { name: '偏师', leader: '王延禀', owner: '你', troops: 5000, at: '广州', status: '驻扎', grain: 40000, morale: 60 }; S.forces.push(far); const g0 = far.grain;
    let cut = false; for (let k = 0; k < 6 && !cut; k++) { S.clock.m = (S.clock.m % 12) + 1; S.foeYM = null; REPLY = { orders: [{ power: '南汉', act: '劫粮', target: '偏师', share: 0.1, why: '断其粮道' }] }; await foePlan(S); cut = far.grain < g0; }
    if (!cut) bad.push('远离自家城池的兵马被劫粮六个月都没得手：' + JSON.stringify(S.foeLog.slice(-3)));
    if (cut && !(supplyLine(S, far).cut)) bad.push('粮道被劫了补给线没再打折');
    // 劫粮自家境内的：护得住
    S.foeYM = null; REPLY = { orders: [{ power: '南汉', act: '劫粮', target: '闽王亲军', share: 0.1, why: '' }] }; const gq = S.forces[0].grain; await foePlan(S); if (S.forces[0].grain !== gq) bad.push('自家境内的粮道也被劫了');
    // 5. 求和：和书递来
    S.foeYM = null; REPLY = { orders: [{ power: '南汉', act: '求和', term: '纳币', share: 0, why: '连败，国中空虚' }] }; await foePlan(S);
    if (!arr(S.peaceOffers).some(o => o.with === '南汉' && o.term === '纳币')) bad.push('敌国求和没有和书：' + JSON.stringify(S.peaceOffers));
    // 6. 大臣上奏、将领便宜行事
    S.forces = S.forces.filter(f => f.name !== '偏师'); S.forces.push({ name: '南汉前锋', owner: '南汉', troops: 4000, at: '潮州', status: '驻扎', foe: true });
    REPLY = { memorials: [{ who: '黄滔', act: '犒军', target: '', share: 0, why: '将士久戍，宜加犒赏以励军心' }, { who: '王延禀', act: '加赋', target: '', share: 0, why: '军用浩繁，请加赋' }, { who: '无此人', act: '请战', target: '吴越', why: '' }], generals: [{ who: '王延钧', act: '固守', target: '', why: '敌锋正锐' }] };
    if (!memDue(S)) bad.push('一方之主手下有大臣，这个月该议事却没排上');
    await memPlan(S); const call = CALLS[CALLS.length - 1]; if (!call.extra.ds) bad.push('大臣议事没交给 DeepSeek');
    if (arr(S.memos).filter(m => m.state === '待批').length !== 2) bad.push('奏章不是两道（不在朝的人不该能上奏）：' + JSON.stringify(S.memos));
    if (S.forces.find(f => f.name === '南路军').status !== '固守') bad.push('将领便宜行事固守没落账');
    return { bad, troops0: S.forces[0].morale, tr: S.realm.treasury, fav: S.people.王延禀.favor };
  });
  bad.push(...r1.bad);
  // 真点：朝局页的奏章「准」「驳回」
  await p.evaluate(() => { VIEW = 'game'; TAB = 'court'; SIDE_FOLD = false; render(); });
  const ok1 = await p.$('[data-memo][data-mv="准"]'); if (!ok1) bad.push('朝局页没有奏章的「准」按钮'); else {
    const id = await ok1.getAttribute('data-memo'); await ok1.click(); await p.waitForTimeout(200);
    const r = await p.evaluate(id => ({ m: S.memos.find(x => x.id === id), mor: S.forces[0].morale, tr: S.realm.treasury, msg: ORGMSG }), id);
    if (r.m.act === '犒军' && !(r.mor > r1.troops0 && r.tr < r1.tr)) bad.push('准了犒军，士气没涨或钱没扣：' + JSON.stringify(r));
    if (r.m.state !== '已准') bad.push('准了奏章状态没改：' + JSON.stringify(r.m)); }
  const no1 = await p.$('[data-memo][data-mv="驳"]'); if (!no1) bad.push('没有「驳回」按钮'); else { await no1.click(); await p.waitForTimeout(200); const f = await p.evaluate(() => S.people.王延禀.favor); if (!(f < r1.fav)) bad.push('驳回王延禀的奏章，他的好感没掉'); }
  // 真点：军务页敌情「迎击」，走到了野战，不占城
  await p.evaluate(() => { TAB = 'army'; S.forces.find(f => f.name === '南路军').status = '驻守'; render(); });
  const yj = await p.$('[data-fop="迎击"][data-g="南汉前锋"]'); if (!yj) bad.push('军务页敌情里没有「迎击」按钮'); else {
    await p.selectOption('[data-fopf="南汉前锋"]', '南路军'); await yj.click(); await p.waitForTimeout(200);
    const r = await p.evaluate(() => { const c = S.campaigns.find(c => c.force === '南路军'); const terr = S.territory.length; S.turn++; let L = campaignTick(S, 1).join('；'); for (let i = 0; i < 6 && !/迎击|扑了个空|散了/.test(L); i++) L += campaignTick(S, 10).join('；'); return { c, L, terr, terr2: S.territory.length, own: (S.mapOwn || {})[geoStem('潮州')], g: foeArmies(S).find(g => g.name === '南汉前锋') }; });
    if (!r.c || r.c.mode !== '迎') bad.push('点了迎击没下成军令：' + JSON.stringify(r.c));
    if (!/迎击南汉前锋/.test(r.L)) bad.push('走到了没跟敌军野战：' + r.L);
    if (r.own && r.own.owner === '你') bad.push('野战打赢了却把潮州算成拿下');
  }
  // 真点：劫粮按钮（当月见分晓）、和书「允和」、便宜行事开关
  await p.evaluate(() => { S.forces.push({ name: '南汉后军', owner: '南汉', troops: 5000, at: '潮州', status: '行军', foe: true, march: { from: '潮州', to: '漳州', li: 300, done: 100, pace: 35 } }); render(); });
  const jl = await p.$('[data-fop="劫粮"][data-g="南汉后军"]'); if (!jl) bad.push('没有「劫粮」按钮'); else { await p.selectOption('[data-fopf="南汉后军"]', '南路军'); await jl.click(); await p.waitForTimeout(200); const r = await p.evaluate(() => ({ msg: ORGMSG, raid: S.forces.find(f => f.name === '南路军').raidYM, n: S.campNews })); if (r.raid == null) bad.push('点了劫粮没派轻骑：' + JSON.stringify(r)); }
  const yes = await p.$('[data-poff="yes"][data-to="南汉"]'); if (!yes) bad.push('军务页没有和书的「允和」按钮'); else { await yes.click(); await p.waitForTimeout(200); const w = await p.evaluate(() => ({ w: warOf(S, '南汉'), st: S.wars.map(w => w.state), msg: ORGMSG })); if (w.w) bad.push('允和了还在交战：' + JSON.stringify(w)); }
  const gf = await p.$('[data-gfree]'); if (!gf) bad.push('没有便宜行事开关'); else { await gf.click(); await p.waitForTimeout(150); if (await p.evaluate(() => S.genFree) !== false) bad.push('收回便宜行事没生效'); }
  // 设伏按钮：交战时出征面板有
  await p.evaluate(() => { warStart(S, '吴越', warCBs(S, '吴越')[0] || '', false); render(); });
  if (!await p.$('[data-army="go"][data-mode="伏"]')) bad.push('出征面板没有「设伏」');
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
