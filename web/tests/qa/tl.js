// 官员系统·三：人才年表进人物档案、名臣谱只写此刻不剧透、没碰过的照史书调、靠山没了的转本局、君主手下的甲等要你裁决、招揽来的转本局（CLAUDE.md「人事与职权」官员系统总纲）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof talentDS === 'function');
  const bad = [];
  const setup = (role, y) => p.evaluate(async ([role, y]) => { S = newSave({ name: '荀彧', gender: '男', age: 38, role, gregorianYear: y, month: 1, day: 1, place: '许县', polity: '汉' }); S.chat = [{ role: 'gm', text: '开场' }];
    S.org = { nodes: [{ id: 'root', name: '朝廷', depth: 0, posts: [{ title: '皇帝', holder: '刘协' }] }, { id: 'X1', name: '丞相府', depth: 1, parent: 'root', posts: [{ title: '丞相', rank: '万石', holder: '曹操', src: '史书' }] }], log: [] };
    const oc = callClaude; callClaude = async () => ({ text: JSON.stringify({ people: [{ name: '诸葛亮', born: 181, died: 234, native: '琅邪阳都', now: '隆中躬耕，每自比管乐', temper: '淡泊', will: '难', path: [{ y: 207, m: 11, post: '出山辅佐刘备，为军师', how: '投靠', patron: '刘备' }, { y: 221, m: 4, post: '丞相府丞相', how: '升', patron: '刘备' }], source: '三国志·诸葛亮传' }, { name: '司马懿', born: 179, died: 251, native: '河内温县', now: '在野', temper: '深沉', will: '难', path: [{ y: 208, post: '丞相府文学掾', how: '征辟', patron: '曹操' }], source: '晋书' }] }) });
    try { await talentDS(S); } finally { callClaude = oc; } }, [role, y]);
  // 1 年表进档案；名臣谱只写此刻
  await setup('许县的读书人', 200);
  const a = await p.evaluate(() => { TAB = 'people'; VIEW = 'game'; SIDE_FOLD = false; render0(); const t = document.body.innerText; return { car: arr(S.dossiers.诸葛亮.career).length, now: figNow(S, '诸葛亮'), html: /名臣谱/.test(t) && /隆中躬耕/.test(t), spoil: /丞相府丞相|出山辅佐刘备/.test(t), due: talentDue(S), to: S.tl.to }; });
  if (a.car !== 2 || a.now.st !== '在野' || !a.html || a.spoil || a.due || a.to !== 230) bad.push('人才年表、名臣谱不对（或剧透了）：' + JSON.stringify(a));
  // 2 没碰过的照史书调；刘备死了，诸葛亮转本局、不再照史书走
  const b2 = await p.evaluate(() => { S.clock.y = 221; S.clock.m = 6; S.turn = 9; histTick(S); const ok = S.org.nodes[1].posts[0].holder; S.org.nodes[1].posts[0].holder = '曹操'; S.carApplied = {}; S.dossiers.刘备 = { died: 220, real: true }; histTick(S); return { ok, after: S.org.nodes[1].posts[0].holder, tr: trackOf(S, '诸葛亮'), why: S.dossiers.诸葛亮.trackWhy }; });
  if (b2.ok !== '诸葛亮' || b2.after !== '曹操' || b2.tr !== '局') bad.push('照史轨道、靠山没了转本局不对：' + JSON.stringify(b2));
  // 3 你是君主：没碰过的人照史书调，照常到任、报进人事动态（不另设裁决）
  await setup('汉献帝', 200);
  const c = await p.evaluate(() => { S.clock.y = 221; S.clock.m = 6; S.turn = 9; const o = histTick(S); return { o, holder: S.org.nodes[1].posts[0].holder }; });
  if (c.holder !== '诸葛亮' || !c.o.some(t => /诸葛亮/.test(t))) bad.push('君主治下没碰过的人没照史书调：' + JSON.stringify(c));
  // 4 名臣谱招揽：来了进人选、转本局
  await setup('汉献帝', 200);
  await p.evaluate(() => { S.dossiers.司马懿.will = '肯'; S.renown = 1500; TAB = 'people'; VIEW = 'game'; SIDE_FOLD = false; render0(); });
  if (!(await p.$('button[data-fig="call"][data-n="司马懿"]'))) bad.push('名臣谱上没有招揽按钮'); else {
    await p.click('button[data-fig="call"][data-n="司马懿"]'); const d = await p.evaluate(() => ({ t: !!talentOf(S, '司马懿'), tr: trackOf(S, '司马懿'), msg: arr(S.chronicle).slice(-1)[0].what }));
    if (!(d.t && d.tr === '局') && !/没有来/.test(d.msg)) bad.push('招揽没结果：' + JSON.stringify(d));
    await p.click('button[data-fig="visit"][data-n="诸葛亮"]'); if (!/拜访诸葛亮/.test(await p.inputValue('#said'))) bad.push('拜访没写进输入框'); }
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
