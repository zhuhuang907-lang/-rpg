// 大官上网一个个核、核不上的换三种问法再搜；日后显达的人此刻在下位照真人贴进树里；新制的阻力（反对的人情分、派系记恨、清议攻讦）、强推缓行罢议有后果；界面不出怪数（CLAUDE.md「人事与职权」大官上网核、日后显达、新制阻力；「发布与仓库」不出怪数）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof orgVerifyReal === 'function');
  const bad = [];
  const base = () => p.evaluate(() => { S = newSave({ name: '杨坚', gender: '男', age: 60, role: '隋文帝', gregorianYear: 600, month: 6, day: 1, place: '大兴', polity: '隋' }); S.chat = [{ role: 'gm', text: '开场' }];
    S.org = { nodes: [{ id: 'root', name: '朝廷', depth: 0, posts: [{ title: '皇帝', holder: '杨坚' }] }, { id: 'A1', name: '尚书省', depth: 1, parent: 'root', posts: [{ title: '左仆射', rank: '从二品', holder: '高颎', src: 'DS表' }, { title: '右仆射', rank: '从二品', holder: '张三', src: 'DS表' }] }, { id: 'A2', name: '吏部', depth: 2, parent: 'A1', posts: [{ title: '尚书', rank: '正三品', holder: '李四', src: 'DS表' }] }, { id: 'B1', name: '殿中省', depth: 2, parent: 'root', posts: [{ title: '殿内直长', rank: '正七品', holder: '王拟', src: '拟' }] }], log: [] }; });
  // 1 大官上网核：核上的记「博查核」，核不上的换问法再搜、资料里明写另有其人的才换
  await base();
  const v = await p.evaluate(async () => { const om = MODE, ob = bochaDeep, oc = callClaude; MODE = 'web'; let qs = [];
    bochaDeep = async (s, Q) => { qs = qs.concat(Q); return { items: [{ title: '隋书·高颎传', snippet: '开皇中，高颎为尚书左仆射' }, { title: '隋书·杨素传', snippet: '仁寿元年前后，杨素为尚书右仆射' }, { title: '吏部', snippet: '牛弘为吏部尚书' }] }; };
    callClaude = async x => ({ text: JSON.stringify({ fills: [{ i: 1, name: '杨素' }, { i: 2, name: '牛弘' }] }) });
    try { const due = orgVerifyDue(S); await orgVerifyReal(S); } finally { MODE = om; bochaDeep = ob; callClaude = oc; }
    const P = S.org.nodes.flatMap(n => n.posts); return { due0: true, a: [P[1].holder, P[1].src], b: [P[2].holder, P[2].src], c: [P[3].holder, P[3].src], nq: qs.length, log: S.org.log.length }; });
  if (!/^高颎,(原文库|DS表·博查核)/.test(v.a.join()) || v.b[0] !== '杨素' || v.c[0] !== '牛弘' || !(v.nq >= 6) || !v.log) bad.push('大官没上网核、或核不上的没换：' + JSON.stringify(v));
  // 2 日后显达的人此刻在下位：照真人贴进树里，对不上的进名册；不标虚拟
  await base();
  const r = await p.evaluate(async () => { const oc = callClaude; callClaude = async () => ({ text: JSON.stringify({ people: [{ name: '李靖', now: '殿中省殿内直长', place: '大兴', later: '尚书右仆射', source: '旧唐书·李靖传' }, { name: '房玄龄', now: '隰城县尉', place: '隰城县', later: '中书令', source: '旧唐书·房玄龄传' }, { name: '某甲', now: '县丞', place: '', later: '', source: 'x' }] }) }); try { await risingDS(S); } finally { callClaude = oc; }
    const q = S.org.nodes[3].posts[0]; return { h: q.holder, src: q.src, off: arr(S.offices).some(o => o.name === '房玄龄'), fic: fictionShow(S).has('李靖') || fictionShow(S).has('房玄龄'), real: realNameSet(S).has('房玄龄'), mou: JSON.stringify(S.rising).includes('某甲'), due: risingDue(S) }; });
  if (r.h !== '李靖' || r.src !== '史书·后进' || !r.off || r.fic || !r.real || r.mou || r.due) bad.push('日后显达的人没贴进去或标错：' + JSON.stringify(r));
  // 3 新制的阻力：反对的人情分掉、派系记恨、只写当面反对的；强推、缓行、罢议真点有后果
  await base();
  await p.evaluate(() => { S.people = { 苏威: { role: '纳言', favor: 20 }, 杨素: { role: '仆射', favor: 30 } }; S.factions = [{ name: '关陇旧臣', leader: '苏威', members: '苏威', grudge: 0 }]; S.renown = 500;
    S.plans = [{ name: '均田新法', reform: true, state: '推行', month: 1, feasible: 60, actors: [{ who: '苏威', front: '反对', act: '真心反对' }, { who: '杨素', front: '支持', act: '阳奉阴违' }], steps: [{ m: 2, what: '括户', who: '苏威' }, { m: 3, what: '授田' }], effects: [{ key: '民心', delta: 3, inMonths: 3, why: '' }], cost: { months: 3 }, log: [], done: [], applied: [], aid: 'x' }];
    S.clock.m = 7; S.turn = 3; });
  const m = await p.evaluate(() => { const o = reformMonthly(S); return { o, f1: S.people.苏威.favor, f2: S.people.杨素.favor, g: S.factions[0].grudge, fz: S.plans[0].feasible }; });
  if (m.f1 !== 19 || m.f2 !== 29 || m.g !== 1 || !(m.fz < 60) || !m.o.some(t => /抵制/.test(t) && /苏威/.test(t) && !/杨素/.test(t))) bad.push('新制阻力没落账、或把暗地里的人写出来了：' + JSON.stringify(m));
  await p.evaluate(() => { TAB = 'court'; VIEW = 'game'; SIDE_FOLD = false; render0(); });
  if (!(await p.$('button[data-reform="force"]'))) bad.push('朝局页没有强推、缓行、罢议'); else {
    const f0 = await p.evaluate(() => S.plans[0].feasible); await p.click('button[data-reform="force"]'); const f1 = await p.evaluate(() => ({ fz: S.plans[0].feasible, fav: S.people.苏威.favor, g: S.factions[0].grudge }));
    if (f1.fz !== f0 + 10 || f1.fav !== 16 || f1.g !== 4) bad.push('强推没后果：' + JSON.stringify([f0, f1]));
    await p.evaluate(() => { S.clock.m = 8; TAB = 'court'; render0(); }); await p.click('button[data-reform="slow"]'); const sl = await p.evaluate(() => S.plans[0].steps.map(x => x.m).join());
    if (sl !== '4,5') bad.push('缓行没往后推：' + sl);
    await p.evaluate(() => { S.clock.m = 9; TAB = 'court'; render0(); }); await p.click('button[data-reform="drop"]'); const dr = await p.evaluate(() => ({ st: S.plans[0].state, o: reformMonthly(S), ren: S.renown }));
    if (dr.st !== '搁下' || !dr.o.some(t => /罢议/.test(t))) bad.push('罢议没搁下、没记年谱：' + JSON.stringify(dr)); }
  // 4 界面不出怪数
  const t = await p.evaluate(() => { S.gov = { scope: 'realm', stats: { 民心: 52.300000000004, 库银: 1234567.89 } }; S.people.苏威.favor = 12.6; S.money = { cash: 100.12345, unit: '两' }; tidyState(S); return [S.gov.stats.民心, S.gov.stats.库银, S.people.苏威.favor, S.money.cash]; });
  if (t.join() !== '52.3,1234568,13,100.12') bad.push('账里的怪数没取整：' + t);
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
