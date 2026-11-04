// 自己不进自己的家谱、史书往后一直接着修（存进存档、不靠博查）、天下消息照身份传到、国丧禁宴乐、各州府长官一表补齐（CLAUDE.md「人物」自己不进家谱、「剧情」史书一直往后走、「人事与职权」各州府长官表）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof newsTick === 'function');
  const bad = [];
  // 1 宗室子弟的兄弟里不许有他自己
  const k = await p.evaluate(() => { S = newSave({ name: '朱常洵', gender: '男', age: 20, role: '万历皇帝第三子，宗室子弟', gregorianYear: 1600, month: 3, day: 1, place: '京师', polity: '明' }); S.chat = [{ role: 'gm', text: '开场' }];
    S.household = [{ relation: '兄', name: '朱常洛' }, { relation: '弟', name: '福王朱常洵' }, { relation: '本人', name: '常洵' }, { relation: '弟', name: '朱常洵' }, { relation: '弟', name: '朱常浩' }]; tidyState(S); TAB = 'people'; VIEW = 'game'; render0();
    return { hh: S.household.map(x => x.name), self: [isSelfKin(S, '朱常洵', '弟'), isSelfKin(S, '福王朱常洵', '弟'), isSelfKin(S, '朱常洛', '兄')] }; });
  if (k.hh.join() !== '朱常洛,朱常浩' || k.self.join() !== 'true,true,false') bad.push('主角自己进了自己的家谱：' + JSON.stringify(k));
  // 2 史书往后一直接着修：没有博查也修、存进存档、离尽头不到六年就再修
  const hp = await p.evaluate(async () => { S = newSave({ name: '汪景和', gender: '男', age: 40, role: '扬州盐商', gregorianYear: 1500, month: 1, day: 1, place: '扬州', polity: '明' }); S.chat = [{ role: 'gm', text: '开场' }]; RUNHIST = [];
    const oc = callClaude; let pr = '';
    callClaude = async x => { pr = x; const m = x.match(/公元 (-?\d+) 年到 (-?\d+) 年/), a = +m[1], z = +m[2]; const ev = []; for (let y = a; y <= z; y++) for (let mm = 1; mm <= 12; mm += 3) ev.push({ y, m: mm, text: `${y}年${mm}月 朝中大事${y}`, where: '京师', who: ['某臣'], scope: '天下', tag: '政局', src: '记忆' }); return { text: JSON.stringify({ rulers: [], events: ev, figures: [] }) }; };
    try { const n1 = packNeed(S); await ensureHistPack(S); const has = hasHist(S), saved = arr(S.hsPacks).length, end1 = Math.max(...S.hsPacks.map(h => h.range[1]));
      S.clock.y = end1 - 4; const n2 = packNeed(S); RUNHIST = []; const keep = hasHist(S); return { n1, has, saved, n2, keep, dense: /一百条/.test(pr) }; } finally { callClaude = oc; } });
  if (!hp.n1 || !hp.has || !hp.saved || !hp.n2 || !hp.keep || !hp.dense) bad.push('史书没往后接着修、或没存进存档：' + JSON.stringify(hp));
  // 3 天下消息照身份传到；本朝皇帝驾崩国丧百日禁宴乐
  const nw = await p.evaluate(() => { S = newSave({ name: '汪景和', gender: '男', age: 40, role: '扬州盐商', gregorianYear: 1620, month: 7, day: 1, place: '扬州', polity: '明' }); S.chat = [{ role: 'gm', text: '开场' }];
    S.hsPacks = [{ id: 'tst', title: 't', range: [1620, 1620], polity: '明', grade: 'B', rulers: [], figures: [], events: [{ y: 1620, m: 7, text: '神宗皇帝驾崩，光宗即位', where: '京师', who: ['朱翊钧'], scope: '天下', tag: '政局' }, { y: 1620, m: 7, text: '翰林院修撰升转', where: '京师', who: ['某'], scope: '地方', tag: '人事' }] }];
    S.econ = { v: 2, y: 1620, pl: geoCenter(S), unit: '两', feast: 3, opera: 0.5, incense: 0.3, doctor: 0.8, wage: 0.05, pay: 1.5, payOff: 5 }; S.money = { cash: 500, unit: '两' }; S.newsYM = Math.floor(ymOf(S.clock)) - 1;
    const o = newsTick(S); const m = inMourn(S); const r = privAct(S, 'feast'); TAB = 'board'; VIEW = 'game'; render0(); return { o, m, r, msg: ORGMSG, how: (S.news[0] || {}).how, n: S.news.length, html: /天下消息/.test(document.body.innerText) }; });
  if (!nw.o.length || nw.how !== '风闻' || nw.n !== 1 || !nw.m || nw.r || !/国丧/.test(nw.msg) || !nw.html) bad.push('天下消息、国丧不对：' + JSON.stringify(nw));
  // 4 各州府长官一表补齐：表上的填上（真人、史书无载的标虚拟）、待查不收；城池卡、名册照表
  const po = await p.evaluate(async () => { S = newSave({ name: '汪景和', gender: '男', age: 40, role: '扬州盐商', gregorianYear: 1757, month: 3, day: 1, place: '扬州府江都县', polity: '清' }); S.chat = [{ role: 'gm', text: '开场' }];
    const oc = callClaude; let n = 0; callClaude = async x => { n++; const L = [...x.matchAll(/^(\d+)\. (.+)$/gm)]; return { text: JSON.stringify({ rows: L.map(([, i, nm], j) => ({ i: +i, title: '知府', name: j === 0 ? '待查' : j % 2 ? '高晋' + j : '周允' + j, real: j % 2 === 1, basis: 'x' })) }) }; };
    try { await prefOffDS(S); } finally { callClaude = oc; } const M = S.prefOff.map, ks = Object.keys(M), fake = ks.map(k => M[k]).find(o => !o.real), real = ks.map(k => M[k]).find(o => o.real);
    return { n, cnt: ks.length, due: prefOffDue(S), gov: cityOf(S, ks[0]).gov, fs: fictionShow(S).has(fake && fake.name), rs: fictionShow(S).has(real && real.name), ros: nationalRoster(S).some(r => r.name === (real && real.name)), tbd: Object.values(M).some(o => /待查/.test(o.name)) }; });
  if (!(po.cnt >= 20) || po.due || !po.gov || !po.fs || po.rs || !po.ros || po.tbd) bad.push('各州府长官表没补齐或标错：' + JSON.stringify(po));
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
