// zcode 那批（R-163）的改正：朝臣互谋由 DeepSeek 扮演；臣子不会举荐、构陷君主本人；敛财写钱的单位；
// 票拟、封驳照朝代（汉没有，唐宋是中书拟议，明宣德以后内阁票拟，清雍正以后没有封驳）；行军渡河看对岸真有没有敌军
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof intrigueMonthly === 'function');
  const bad = [], ev = (f, a) => p.evaluate(f, a);
  const setup = y => ev(y => {
    S = newSave({ name: '某帝', gender: '男', age: 40, role: '皇帝', real: true, gregorianYear: y, month: 6, day: 1, place: '开封', polity: '宋' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3; S.money = { cash: 0, unit: '贯' };
    S.org = { nodes: [{ id: 'root', name: '朝廷', depth: 0, posts: [] }, { id: 'n1', name: '中书', depth: 1, parent: 'root', posts: [{ title: '宰相', holder: '甲相' }, { title: '参知政事', holder: '乙参' }, { title: '给事中', holder: '丙谏' }, { title: '户部尚书', holder: '丁户' }] }] };
    S.factions = [{ name: '新党', leader: '甲相', members: '甲相、乙参、丁户' }, { name: '旧党', leader: '丙谏', members: '丙谏' }];
    S.council = { 宰辅: { who: '甲相', task: '' } };
  }, y);
  // 朝臣互谋：走 DeepSeek；构陷、举荐主角本人的作废；敛财带单位
  await setup(1080);
  { const r = await ev(async () => { let opt = null; window.callClaude = async (q, sys, o) => { opt = o; return { text: JSON.stringify({ acts: [{ who: '乙参', op: '构陷', target: '某帝', why: '想独揽' }, { who: '丁户', op: '举荐', target: '某帝', why: '' }, { who: '甲相', op: '敛财', target: '', why: '家用不足' }] }) }; };
      await intrigueMonthly(S); return { ds: opt && opt.ds, th: opt && opt.thinking, log: arr(S.intrigueLog).map(x => x.who + ':' + x.did) }; });
    if (r.ds !== true || r.th !== false) bad.push('朝臣互谋没交给 DeepSeek：' + JSON.stringify(r));
    if (r.log.some(x => /^(乙参|丁户)/.test(x))) bad.push('臣子构陷、举荐君主本人也落了账：' + JSON.stringify(r.log));
    if (!r.log.some(x => /^甲相:.*敛财.*贯|^甲相:.*揩油.*贯/.test(x))) bad.push('敛财没写钱的单位：' + JSON.stringify(r.log)); }
  // 票拟、封驳照朝代
  const memo = async y => { await setup(y); return ev(async () => { window.callClaude = async () => ({ text: JSON.stringify({ memorials: [{ who: '乙参', act: '加赋', target: '', why: '国用不足' }], generals: [] }) }); await memPlan(S); const m = arr(S.memos).find(x => x.who === '乙参') || {}; VIEW = 'game'; TAB = 'court'; SIDE_FOLD = false; render(); return { draft: m.draft || '', block: m.block || '', t: document.body.innerText }; }); };
  { const r = await memo(200); if (r.draft || r.block) bad.push('东汉也有票拟、封驳：' + JSON.stringify({ d: r.draft, b: r.block })); }
  { const r = await memo(1080); if (!r.draft || r.block !== '丙谏') bad.push('北宋没有中书拟议、给事中封驳：' + JSON.stringify({ d: r.draft, b: r.block })); if (/内阁票拟/.test(r.t)) bad.push('北宋写成了内阁票拟'); }
  { const r = await memo(1750); if (!r.draft || r.block) bad.push('乾隆朝票拟没了或还能封驳：' + JSON.stringify({ d: r.draft, b: r.block })); }
  // 渡河：对岸真有敌军才写；拿河名比不出来
  await setup(1080);
  { const r = await ev(() => { const R = { pts: [{ n: '甲渡', lon: 114, lat: 30 }, { n: '乙岸', lon: 114.05, lat: 30.2 }], legs: [{ k: 0, li: 50, eff: 50, river: '长江' }], li: 50, eff: 50, gates: [], rivers: ['长江'] };
      S.forces = [{ name: '我军', owner: '你', leader: '某帝', troops: 10000, at: '甲渡' }];
      const a = routeRisk(S, R, S.forces[0], '乙岸').join('；');
      S.forces.push({ name: '敌水师', owner: '敌', troops: 5000, at: '长江', foe: true, march: { to: '乙岸' }, wrPos: { lon: 114.05, lat: 30.2 } });
      const b2 = routeRisk(S, R, S.forces[0], '乙岸').join('；'); return { a, b: b2 }; });
    if (/对岸/.test(r.a)) bad.push('对岸没敌军也说有：' + r.a); if (!/对岸乙岸有敌水师/.test(r.b)) bad.push('对岸有敌军没查出来：' + r.b); }
  // 用重臣过的那道关照朝代叫，换掉在位的人也要过（2026-11-10 补正 zcode 的廷推）
  for (const [y, nm] of [[1080, '封还词头'], [1600, '廷推'], [200, '公卿廷议']]) { await setup(y);
    const r = await ev(() => { S.renown = 10; lawsOf(S).crown = 2; const n0 = arr(S.chronicle).length; councilSet(S, '宰辅', '乙参', null); return { add: arr(S.chronicle).slice(n0).map(x => x.what).join('；'), m: ORGMSG }; });
    if (!r.add.includes(nm) || (nm !== '廷推' && /廷推|九卿/.test(r.add + r.m))) bad.push(`${y}年换宰辅没照朝代叫「${nm}」、或换掉在位的人没过这道关：` + JSON.stringify(r)); }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
