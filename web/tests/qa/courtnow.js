// 朝局令程序当场办（CLAUDE.md「人事与职权」朝局令当场办）：一方之主任命跟前的人当场到任、远处的下一回到任；罢免、增设、裁撤当场办；国策走诏令，回报了才算已行；不再等记账的 AI 报
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof orgAct === 'function');
  const out = await p.evaluate(() => {
    const bad = [], s = newSave({ name: '张九四', gender: '男', age: 45, role: '自立为吴王，割据平江', gregorianYear: 1365, month: 3, day: 1, place: '平江', polity: '张士诚（吴）' }); S = s; s.polPts = 30; s.chat = [{ role: 'gm', text: '开场。' }];
    s.org = { regime: '吴', nodes: [{ id: 'root', name: '吴王府', depth: 0, parent: '', posts: [{ title: '王', holder: '张九四' }] }, { id: 'n1', name: '参军府', depth: 1, parent: 'root', posts: [{ title: '参军事', holder: '', quota: 2 }, { title: '记室', holder: '旧人甲', quota: 1 }] }], log: [] };
    s.people = { 吕珍: { role: '部将', tie: '部将', seen: 1, where: '平江' }, 李伯升: { role: '部将', tie: '部将', seen: 1, where: '湖州' }, 旧人甲: { role: '记室', seen: 1 } };
    const n1 = s.org.nodes[1];
    orgAct(s, 'appoint', { node: n1, pi: 0, person: '吕珍' }); if (n1.posts[0].holder !== '吕珍') bad.push('一方之主任命跟前的人没当场到任：' + JSON.stringify(n1.posts[0]) + ORGMSG);
    if (!arr(s.acts).some(x => /吕珍/.test(x.what) && x.state === '办成')) bad.push('任命没记成办成的行动单');
    n1.posts.push({ title: '长史', holder: '', quota: 1 }); orgAct(s, 'appoint', { node: n1, pi: 2, person: '李伯升' });
    if (n1.posts[2].holder === '李伯升' || n1.posts[2].pending !== '李伯升') bad.push('远处的人当场就到任了，或没记下要来');
    s.turn += 1; applyOrgResults(s, {}); if (n1.posts[2].holder !== '李伯升') bad.push('远处的人下一回没到任（还在等记账报）：' + JSON.stringify(n1.posts[2]));
    orgAct(s, 'dismiss', { node: n1, pi: 1 }); if (n1.posts[1].holder) bad.push('罢免没当场办');
    orgAct(s, 'addPost', { node: n1, person: '司马' }); if (!n1.posts.some(x => x.title === '司马' && !x.status)) bad.push('增设官职没当场办');
    s.org.nodes.push({ id: 'n2', name: '冗署', depth: 1, parent: 'root', posts: [] }); orgAct(s, 'cut', { node: s.org.nodes[2] }); if (s.org.nodes[2].status !== '已裁撤') bad.push('裁撤没当场办');
    // 国策：走诏令，回报了才算已行（不等记账）
    s.polBook = [{ id: 'q1', name: '屯田', desc: '兵士屯田', area: '经济', cost: 3, need: [], state: '' }];
    orgAct(s, 'policy', { pol: s.polBook[0] }); const e = arr(s.edicts).find(x => x.pol === 'q1'); if (!e) bad.push('国策没发诏令');
    else { s.clock.d += 0; for (let i = 0; i < 6; i++) { s.clock.m += 1; if (s.clock.m > 12) { s.clock.m = 1; s.clock.y += 1; } edictTick(s, 30); } if (s.polBook[0].state !== '已行' && s.polBook[0].state !== '受阻') bad.push('国策诏令回报了还没算已行：' + s.polBook[0].state + ' ' + e.stage); }
    // 正文的规矩：吩咐了就办、不说空话
    if (!/应一声就去办/.test(storyRules()) || !/不说寒暄客套和空话/.test(storyRules())) bad.push('写正文的规矩里没有「吩咐了就办、不说空话」');
    // 更多周边：日本、新罗、西域、西南夷、南越
    for (const [y, n] of [[750, '日本'], [500, '新罗'], [100, '龟兹'], [-150, '滇'], [-150, '南越'], [300, '林邑']]) { const R = realmsAt(y, 6); if (!R || !R.list.some(x => x.name === n)) bad.push(y + '年没有' + n); }
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
