// 读书人以上（宗室贵族、读书人、乡绅）没官职也能看朝局，百姓看不到；这一年这一家的真官员不被当成撞名改掉，以前改掉的改回来（需求台账 R-136、R-137；2026-11-05 玩家开王延政：「为什么要真正的官员改名啊？你现在朝局系统完全被删除了」）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof fictionClash === 'function');
  const bad = await p.evaluate(async () => {
    const bad = [];
    S = newSave({ name: '王延政', gender: '男', age: 21, role: '闽王王审知之子', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' });
    S.chat = [{ role: 'gm', text: '开场' }];
    // 没官职的宗室也有朝局页、人事树也建
    if (!tabsFor(S).some(([k]) => k === 'court')) bad.push('闽王之子王延政看不到朝局页');
    if (!orgDue(S)) bad.push('王延政的人事树不建');
    if (permLevel(S) !== 'view') bad.push('没官职的也能在朝局下令：' + permLevel(S));
    // 读书人以上看得到，平头百姓、没读过书的看不到（2026-11-05 玩家：「贵族也能看到……只有平头百姓、没有读过书的人……正常读书人以上都能知道」）
    { const keep = { role: S.protagonist.role, hh: S.household }, see = role => { S.protagonist.role = role; return tabsFor(S).some(([k]) => k === 'court'); };
      for (const r of ['县学生员', '秀才', '乡绅', '宗室', '闽王之子']) if (!see(r)) bad.push(r + '看不到朝局');
      for (const r of ['佃农', '货郎', '营兵', '木匠', '山寨寨主', '盐商']) if (see(r)) bad.push(r + '也看得到朝局');
      S.protagonist.role = '公子'; S.household = [{ relation: '父', name: '王审知' }]; if (!see('公子')) bad.push('父亲是闽王的看不到朝局');
      S.protagonist.role = keep.role; S.household = keep.hh; }
    S.org = { pol: '闽', ruler: false, nodes: [{ id: 'root', name: '闽王府', depth: 0, posts: [{ title: '闽王', holder: '王审知', src: '史书' }] }, { id: 'a', name: '中书', depth: 1, parent: 'root', posts: [{ title: '同平章事', rank: '正三品', holder: '陈峤', src: '拟' }, { title: '礼部侍郎', rank: '正四品', holder: '孟威', src: '拟' }] }] };
    S.people['陈峤'] = { role: '同平章事', seen: S.turn }; S.people['孟威'] = { role: '礼部侍郎', seen: S.turn };
    TAB = 'court'; VIEW = 'game'; SIDE_FOLD = false; render0();
    if (!document.querySelector('[data-tab="court"]')) bad.push('标签栏上没有朝局');
    if (!/陈峤/.test(document.body.innerText)) bad.push('朝局页没摆出人事树');
    window.__btns = [...document.querySelectorAll('.side button, .side [data-org], .side .link')].length;
    // 查重名：史书上那位就是这一年闽国的这个人的，认作真人、不改名；别朝别地同名的照改
    callClaude = async pr => { if (/哪些和中国历史上/.test(pr)) return { text: JSON.stringify({ famous: [{ name: '陈峤', who: '五代闽国官员', same: true }, { name: '孟威', who: '北魏将领', same: false }], unsure: [] }) };
      if (/哪些就是这一年、这一家/.test(pr)) return { text: JSON.stringify({ same: ['郑元弼'] }) }; return { text: '{}' }; };
    BOCHA_KEY = ''; MODE = 'web'; KEY = { has: true };
    const out = await fictionClash(S);
    const q = n => S.org.nodes[1].posts.find(x => x.title === n);
    if (q('同平章事').holder !== '陈峤') bad.push('闽国真官员陈峤被改了名：' + JSON.stringify(out));
    if (/拟/.test(q('同平章事').src)) bad.push('陈峤查实是真人，还标着虚构');
    if (q('礼部侍郎').holder === '孟威') bad.push('撞了北魏孟威的虚构名字没改');
    if (!realNameSet(S).has('陈峤')) bad.push('陈峤没记成真人，下回还会再查');
    // 以前改掉的名字：复查是这一年这一家的真人，改回原名
    S.people['郑世基'] = { role: '礼部尚书', seen: S.turn, formerly: '郑元弼' }; S.org.nodes[1].posts.push({ title: '礼部尚书', rank: '正三品', holder: '郑世基', src: '拟' });
    S.clashLog = [{ turn: 1, t: '郑元弼→郑世基（郑元弼：五代十国闽国官员（DeepSeek））' }, { turn: 1, t: '孟威→孟瓒（孟威：北魏将领（DeepSeek））' }];
    if (!clashUndoDue(S)) bad.push('旧档里改过名的不复查');
    await clashUndo(S);
    if (!S.people['郑元弼'] || S.people['郑世基']) bad.push('郑元弼没改回原名');
    if (q('礼部尚书').holder !== '郑元弼') bad.push('人事树上郑元弼没改回原名');
    if (clashUndoDue(S)) bad.push('复查过的还要再查');
    return bad;
  });
  // 朝局页的按钮真点一遍，不许报错
  await p.evaluate(() => { TAB = 'court'; render0(); });
  const n = await p.$$eval('.side button', xs => xs.length);
  for (let i = 0; i < Math.min(n, 30); i++) { try { await p.evaluate(i => { const x = document.querySelectorAll('.side button')[i]; if (x && !x.disabled) x.click(); }, i); await p.waitForTimeout(80); await p.evaluate(() => { if (TAB !== 'court') { TAB = 'court'; render0(); } }); } catch (e) { errs.push('点按钮出错：' + e.message); } }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
