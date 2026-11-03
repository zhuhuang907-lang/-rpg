// 起义流寇、入仕门路、不写待查、招贤真人、进士真名（CLAUDE.md「人事与职权」起义与入仕、「舆图」起义路线）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof rebelsNow === 'function');
  const bad = [];
  const mk = (role, y, m, pl, pol, nm, extra) => p.evaluate(([role, y, m, pl, pol, nm, extra]) => { S = newSave({ name: nm, gender: '男', age: 30, role, gregorianYear: y, month: m, day: 1, place: pl, polity: pol }); S.chat = [{ role: 'gm', text: '开场。' }]; S.money = { cash: 2000, unit: '两' };
    S.econ = { y, pl: geoCenter(S), unit: '两', rice: 1.2, wage: 0.05, landPrice: 8, yield: 2, rentRate: 0.5, caravan: 300, ransom: 500, protect: 20, cloth: 1.5, interest: 0.03, juan: 108 }; Object.assign(S, extra || {}); TAB = 'board'; VIEW = 'game'; SIDE_FOLD = false; render0(); return document.body.innerText; }, [role, y, m, pl, pol, nm, extra]);
  // 1 身份
  const id = await p.evaluate(() => [['闯王，率流寇转战河南', 1641, '洛阳', '大顺'], ['冲天大将军，率义军转战', 879, '广州', '唐'], ['太平天国天王', 1853, '天京', '太平天国'], ['闯营中的小兵', 1641, '洛阳', '明']].map(([r, y, pl, pol]) => { const s = newSave({ name: 'x', gender: '男', age: 30, role: r, gregorianYear: y, month: 5, day: 1, place: pl, polity: pol }); const d = identityOf(s); return [d.rebel, d.ruler, myDomain(s).kind]; }));
  if (id[0].join() !== 'leader,true,rebel' || id[1].join() !== 'leader,true,rebel' || id[2][1] !== true || id[3][0] !== 'member') bad.push('起义身份认错：' + JSON.stringify(id));
  // 2 史书路线：1641 年正月李自成在洛阳；图上画路线
  const rn = await p.evaluate(() => { S = newSave({ name: 'x', gender: '男', age: 30, role: '洛阳县知县', gregorianYear: 1641, month: 1, day: 1, place: '洛阳', polity: '明' }); return rebelsNow(S).map(r => r.name + '@' + r.at); });
  if (!rn.includes('李自成@洛阳')) bad.push('1641 年正月李自成不在洛阳：' + rn);
  const mp = await p.evaluate(() => { S.chat = [{ role: 'gm', text: '开场' }]; MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 112.4, lat: 34.6 }; MAPZ.span = 4; MAPC.k = ''; return /class="rebroute"/.test(stratMap(S)) && /李自成军/.test(stratMap(S)); });
  if (!mp) bad.push('图上没画李自成的转战路线');
  // 3 义军逼近：知县闭城固守（真打一仗）、百姓投义军成了小兵
  await mk('洛阳县知县', 1641, 1, '洛阳', '明', '冯任', { career: { office: '洛阳县知县' }, forces: [{ name: '洛阳守军', leader: '冯任', owner: '你', troops: 3000, at: '洛阳', status: '驻守' }] });
  if (!(await p.$('button[data-threat="hold"]'))) bad.push('知县面前没有闭城固守'); else { await p.click('button[data-threat="hold"]'); if (!(await p.evaluate(() => arr(S.battles).length > 0))) bad.push('闭城固守没真打'); }
  await mk('洛阳城外的佃户', 1641, 1, '洛阳', '明', '王二');
  if (!(await p.$('button[data-threat="join"]'))) bad.push('百姓面前没有投义军'); else { await p.click('button[data-threat="join"]'); const r = await p.evaluate(() => ({ role: S.protagonist.role, rank: S.rank, rebel: identityOf(S).rebel })); if (!/小兵/.test(r.role) || r.rebel !== 'member' || !r.rank) bad.push('投了义军没成小兵：' + JSON.stringify(r)); }
  // 4 小兵冲锋立功升级
  await p.evaluate(() => { TAB = 'board'; render0(); });
  const up = await p.evaluate(() => { for (let i = 0; i < 30 && S.rank.lv < 1; i++) { S.clock.m = (i % 12) + 1; S.clock.y = 1641 + Math.floor(i / 12); S.turn = i; soldierAct(S, 'charge'); } return { lv: S.rank.lv, role: S.protagonist.role }; });
  if (!(up.lv >= 1) || !/伍长/.test(up.role)) bad.push('小兵立功升不上去：' + JSON.stringify(up));
  // 5 起义首领：裹挟流民、开仓放粮、均田免粮（真点）
  await mk('闯王，率流寇转战河南', 1641, 2, '洛阳', '大顺', '李自成', { forces: [{ name: '闯营', leader: '李自成', owner: '你', troops: 30000, at: '洛阳', status: '流动' }], popEst: null });
  await p.evaluate(() => { S.popEst = { k: popKey(S), m: { 洛阳: { hh: 60000, pop: 300000, why: '推' } } }; render0(); });
  if (!(await p.$('button[data-rebel="sweep"]'))) bad.push('起义首领没有义军页'); else { const m0 = await p.evaluate(() => S.forces[0].troops); await p.click('button[data-rebel="sweep"]'); if (!(await p.evaluate(() => S.forces[0].troops)) > m0) bad.push('裹挟流民没添人'); await p.click('button[data-rebel="slogan"]'); if (!(await p.evaluate(() => S.rebel.slogan))) bad.push('号令均田免粮没记上'); }
  // 6 科举：皇帝、起义首领不考；宗室看朝代；唐有别的门路
  const ex = await p.evaluate(() => { const g = (role, y) => { const s = newSave({ name: 'x', gender: '男', age: 20, role, gregorianYear: y, month: 3, day: 1, place: '京师', polity: '明' }); return examBar(s); }; return { emp: g('隋文帝', 600), reb: g('闯王，率流寇转战', 1641), roy1: g('宗室子弟', 1500), roy2: g('宗室子弟', 1600), song: g('宗室子弟', 1100) }; });
  if (!ex.emp || !ex.reb || !ex.roy1 || ex.roy2 || ex.song) bad.push('科举门槛不对：' + JSON.stringify(ex));
  await mk('长安城里的读书人', 760, 3, '长安', '唐', '杜生', { household: [{ relation: '父', name: '杜某甲', note: '正四品上 刺史' }] });
  await p.evaluate(() => { TAB = 'career'; render0(); });
  if (!(await p.$('button[data-entry="yin"]'))) bad.push('唐代没有门荫这条门路'); else { await p.click('button[data-entry="yin"]'); const c = await p.evaluate(() => S.career); if (!/斋郎|千牛/.test(c.office || '')) bad.push('门荫没授官：' + JSON.stringify(c)); }
  await mk('长安城里的读书人', 760, 3, '长安', '唐', '杜生'); await p.evaluate(() => { TAB = 'career'; render0(); }); await p.click('button[data-entry="mu"]');
  const mu = await p.evaluate(() => { S.renown = 900; S.clock.m = 4; S.turn = 5; const o = entryMonthly(S); return { o, c: S.career }; }); if (!mu.o.length) bad.push('入幕下个月没回音');
  await mk('长安城里的读书人', 760, 3, '长安', '唐', '杜生'); await p.evaluate(() => { TAB = 'career'; render0(); }); await p.click('button[data-entry="li"]');
  const li = await p.evaluate(() => { S.clock.y += 8; entryMonthly(S); return S.career.office; }); if (li !== '县尉') bad.push('流外入流八考满了没出职：' + li);
  // 7 人事树不写待查；出缺的大官后台强问一遍
  const og = await p.evaluate(async () => { S = newSave({ name: '杨坚', gender: '男', age: 60, role: '隋文帝', gregorianYear: 600, month: 6, day: 1, place: '大兴', polity: '隋' }); S.chat = [{ role: 'gm', text: '开场' }];
    S.org = { nodes: [{ id: 'root', name: '朝廷', depth: 0, posts: [{ title: '皇帝', holder: '杨坚' }] }, { id: 'A1', name: '尚书省', depth: 1, parent: 'root', posts: [{ title: '左仆射', rank: '从二品', holder: '' }] }], log: [] }; orgVacantFix(S);
    let pr = ''; const oc = callClaude; callClaude = async x => { pr = x; return { text: JSON.stringify({ rows: [{ i: 1, names: ['高颎'] }] }) }; }; try { await orgTableDS(S, S.org.nodes, true, true); } finally { callClaude = oc; }
    TAB = 'court'; S.idm = 'emperor'; render0(); return { st: S.org.nodes[1].posts[0], forced: /不许再写不知道/.test(pr), txt: /待查/.test(document.body.innerText) }; });
  if (og.st.holder !== '高颎' || !og.forced) bad.push('出缺的大官没强问、没填上：' + JSON.stringify(og)); if (og.txt) bad.push('朝局页还写着「待查」');
  // 8 招贤：本地史书有名的人照性子定来不来；进士搜不到照史书做表
  const tl = await p.evaluate(async () => { S = newSave({ name: '刘备', gender: '男', age: 46, role: '左将军，领豫州牧，屯新野', gregorianYear: 207, month: 1, day: 1, place: '新野', polity: '汉' }); S.idm = 'warlord'; S.chat = [{ role: 'gm', text: '开场' }]; S.renown = 600;
    S.talent = { y: 207, list: [{ name: '诸葛亮', real: true, local: true, will: '难', traits: '清高，躬耕待时', y: 207 }, { name: '徐庶', real: true, local: true, will: '肯', traits: '重义，热中功名', y: 207 }, { name: '庞德公', real: true, local: true, will: '不肯', traits: '隐逸清高', y: 207 }] };
    const ob = bochaDeep, oc = callClaude; bochaDeep = async () => ({ text: '', items: [] }); callClaude = async () => ({ text: '{}' }); let names = []; try { names = await recruit(S, 'call'); } finally { bochaDeep = ob; callClaude = oc; }
    const L = talentList(S); return { names, called: L.filter(t => t.real).map(t => [t.name, !!t.answered, !!t.refused]) };
  });
  if (!tl.called.every(x => x[1] || x[2])) bad.push('本地有名的人没轮到招：' + JSON.stringify(tl)); if (!tl.called.some(x => x[0] === '徐庶' && x[1])) bad.push('肯来又热中功名的徐庶没来：' + JSON.stringify(tl.called));
  const js = await p.evaluate(async () => { const ob = bochaDeep, oc = callClaude; bochaDeep = async () => ({ text: '', items: [] }); callClaude = async () => ({ text: JSON.stringify({ jinshi: [{ name: '张居正', jia: '二甲', ming: '第九', jiguan: '江陵', source: '明清进士题名碑录' }], zuoshi: ['孙承恩'] }) }); try { return await examReal(S, 1547); } finally { bochaDeep = ob; callClaude = oc; } });
  if (!js.list.some(x => x.name === '张居正')) bad.push('搜不到时没照史书列进士');
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
