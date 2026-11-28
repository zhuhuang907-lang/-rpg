// 操作板块要真（R-287，2026-11-28 项目主人：「操作板块问题还是非常大……数据是假的、内容也假的，也没有任何影响，很多点都没用」；参照十字军之王、骑马与砍杀）：
// 真点按钮：点完面板顶上出结果卡，逐条写改了什么；此月之事（世事库的几条路，明写代价、成算、成败得失）真点能结算、进年谱、进下一回写戏材料；
// 一国之主不挑别人处境的事；请亲友吃酒请的是家里人不是县丞；富商的乡勇队没有「纵兵劫掠」「传檄」；米麦价照本地米价核正；家室表不铺推算由头
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof ckNow === 'function' && typeof effSnap === 'function');
  const bad = [];
  await p.evaluate(() => {
    S = newSave({ name: '沈怀远', gender: '男', age: 20, role: '东京绸缎行富商之子', gregorianYear: 1126, month: 2, day: 20, place: '东京开封府开封县', polity: '北宋', real: false });
    S.turn = 5; S.money = { cash: 100000, unit: '文' }; S.econ = { unit: '文', rice: 150, wage: 16, feast: 4000, opera: 300, incense: 30, doctor: 300, pay: 400, payOff: 3000, landPrice: 1000, cloth: 400, wageChk: 1, unitChk: 1 };
    S.household = [{ relation: '父', name: '沈伯衡', age: 47 }, { relation: '母', name: '程婉贞', age: 44, basis: '推算：宋代富商之家常情（宋刑统）', inferred: true }];
    S.people = { 沈伯衡: { relation: '父', favor: 50, where: '家中', seen: 3 }, 王襄: { role: '开封县县丞', favor: 10, where: '东京开封府开封县', seen: 2 }, 周大牛: { role: '伙计', relation: '伙计', favor: 40, where: '家中', seen: 4 } };
    S.forces = [{ name: '沈家助守壮丁队', leader: '沈怀远', owner: '你', troops: 30, morale: 40, at: '宣泽门' }];
    S.local = { place: '东京开封府开封县', goods: [{ item: '粳米', price: 3, unit: '斗', basis: '推算' }, { item: '小麦', price: 2, unit: '斗', basis: '史载' }] };
    S.chat = [{ role: 'gm', text: '开场' }]; VIEW = 'game'; TAB = 'board'; SIDE_FOLD = false; render();
  });
  // 一、请亲友吃酒：真点，结果卡写出现钱和好感；请的是家里人
  const feast = await p.$('aside.side button[data-priv="feast"]');
  if (!feast) bad.push('局面页没有「请亲友吃酒」'); else { await feast.click(); await p.waitForTimeout(200);
    const card = await p.evaluate(() => (document.querySelector('.effcard') || {}).innerText || '');
    if (!/现钱\s*−/.test(card)) bad.push('点了请客，结果卡没写现钱少了多少：' + card);
    if (/王襄/.test(card)) bad.push('请亲友吃酒请来了县丞王襄：' + card);
    if (!/沈伯衡/.test(card)) bad.push('请亲友吃酒没请家里人：' + card); }
  // 二、富商的乡勇队：没有纵兵劫掠、传檄
  const btns = await p.evaluate(() => [...document.querySelectorAll('aside.side button')].map(x => x.innerText.trim()));
  if (btns.some(t => /纵兵劫掠|传檄/.test(t))) bad.push('富商的乡勇队也能纵兵劫掠、传檄邻近州县');
  // 三、此月之事：有选项、写明成算和代价；真点结算、进年谱和写戏材料
  const ck = await p.evaluate(() => { const C = ckNow(S); return C && !C.none ? { t: C.t, n: C.opts.length, txt: (document.querySelector('.ckev') || {}).innerText || '' } : null; });
  if (!ck) bad.push('靖康开封富商这个月没有「此月之事」'); else {
    if (!/成算/.test(ck.txt) || !/代价|成则|败则/.test(ck.txt)) bad.push('此月之事没写成算、代价、成败得失：' + ck.txt.slice(0, 120));
    const before = await p.evaluate(() => JSON.stringify(effSnap(S)));
    await p.click('[data-ck="0"]'); await p.waitForTimeout(200);
    const r = await p.evaluate(b0 => ({ diff: effDiff(JSON.parse(b0), effSnap(S)).map(x => x.t), chron: arr(S.chronicle).slice(-1)[0], done: ckNow(S).done, msg: (() => { const m = storyInput(S, '去街上走走', '', '', false, null); return m[m.length - 1].content; })() }), before);
    if (!r.done) bad.push('点了此月之事的选项没结算');
    if (!r.diff.length) bad.push('此月之事结算了账上却没变化：' + r.done);
    if (!r.chron || !String(r.chron.what).includes(ck.t)) bad.push('此月之事没进年谱');
    if (!/面板上亲手办了的事[\s\S]*此月|面板上亲手办了的事[\s\S]*选了/.test(r.msg)) bad.push('此月之事选的路没进下一回写戏材料'); }
  // 四、一国之主不挑别人处境的事（致仕、驸马不得预政、冒籍应举）
  const emp = await p.evaluate(() => { const T = new Set(); const s = newSave({ name: '赵祯', gender: '男', age: 33, role: '皇帝', gregorianYear: 1043, month: 3, day: 2, place: '东京开封府开封县', polity: '北宋', real: true }); for (let i = 1; i < 60; i++) { s.turn = i; for (const e of eventsNow(s, 6)) T.add(e.t); } return [...T]; });
  if (emp.some(t => /致仕|驸马|冒籍|应举/.test(t))) bad.push('皇帝挑到了别人处境的事：' + emp.filter(t => /致仕|驸马|冒籍|应举/.test(t)).join('、'));
  // 五、米麦价照本地米价核正；家室表不铺推算由头
  await p.evaluate(() => { TAB = 'trade'; render(); });
  const tr = await p.evaluate(() => document.querySelector('aside.side').innerText);
  if (/粳米[^\n]*\b3文\/斗/.test(tr) || /小麦[^\n]*\b2文\/斗/.test(tr)) bad.push('米麦价没照本地米价核正：' + (tr.match(/粳米[^\n]*|小麦[^\n]*/g) || []).join(' | '));
  await p.evaluate(() => { TAB = 'people'; render(); });
  const pp = await p.evaluate(() => document.querySelector('aside.side').innerText);
  if (/宋代富商之家常情/.test(pp)) bad.push('家室表还铺着推算由头');
  if (!/推算/.test(pp)) bad.push('家室表看不到推算标记');
  // 六、富商的势力页不摆「你的国势」；天下名录没在查不写「正在查」；乡勇队不摆研究科技；旧存档米价照物价表重定
  const pw = await p.evaluate(() => { TAB = 'power'; render(); const a = document.querySelector('aside.side').innerText; TAB = 'army'; render(); const b = document.querySelector('aside.side').innerText; ROSTER_P = null; const r = rosterHtml ? rosterHtml(S) : ''; return { a, b, r }; }).catch(e => ({ err: e.message }));
  if (pw.err) bad.push('势力、军务页出错：' + pw.err); else {
    if (/你的国势/.test(pw.a)) bad.push('富商的势力页还摆着「你的国势」');
    if (/研究/.test(pw.b) && /甲胄|屯田/.test(pw.b)) bad.push('富商的乡勇队也能研究科技');
    if (/正在查这一年全国/.test(pw.r)) bad.push('天下名录没在查也写「正在查」'); }
  const er = await p.evaluate(() => { const s = newSave({ name: '沈怀远', gender: '男', age: 20, role: '东京绸缎行富商之子', gregorianYear: 1126, month: 2, day: 20, place: '东京开封府开封县', polity: '北宋' }); s.money = { cash: 1000, unit: '文' }; s.econ = { unit: '文', rice: 150, wage: 16, landPrice: 1000, fromPreset: ['rice', 'wage', 'landPrice'], base: { rice: 100, wage: 13, landPrice: 1000 }, wageChk: 1, unitChk: 1 }; econRefresh(s); return s.econ.rice; });
  if (!(er >= 600)) bad.push('旧存档米价没照物价表重定：' + er);
  // 七、名臣同一年换几任官：靖康元年二月的李纲不写九月才有的「知扬州」；家里的正室、丫鬟按钮写「找她」
  const lg = await p.evaluate(() => { const f = figByName('李纲', 1126); return f ? [figPost(f, 1126, 2), figPost(f, 1126, 11)] : null; });
  if (!lg) bad.push('名臣表里查不到李纲'); else { if (/扬州/.test(lg[0])) bad.push('靖康元年二月的李纲写成了「' + lg[0] + '」'); if (!/扬州/.test(lg[1])) bad.push('靖康元年十一月的李纲没写知扬州：' + lg[1]); }
  const fz = await p.evaluate(() => { S.household = [{ relation: '正室', name: '王婉如', age: 19 }, { relation: '丫鬟', name: '春莺', age: 17 }]; S.people = {}; TAB = 'people'; render(); return [...document.querySelectorAll('aside.side .pc')].filter(x => /王婉如|春莺/.test(x.innerText)).map(x => x.innerText.replace(/\s+/g, ' ')); });
  if (fz.some(t => /找他/.test(t))) bad.push('正室、丫鬟的按钮写「找他」：' + fz.join(' | '));
  console.log('ERRS', JSON.stringify(bad.concat(errs)));
  await b.close(); if (bad.length || errs.length) process.exit(1);
})();
