// 虚构人物戏份（任务三，R-221 御示）：程序补的虚构人物，玩家没提拔、没打过交道的，写给模型的人事树里标「虚构·照常供职」并附规矩（不给戏份）；
// 玩家提拔了、有了情分、在话里找上他，就照常写；史书真人从不标
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof buildFacts === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    S = newSave({ name: '杨坚', gender: '男', age: 60, role: '隋文帝', real: true, gregorianYear: 600, month: 6, day: 1, place: '大兴', polity: '隋' }); S.chat = [{ role: 'gm', text: '开场。' }];
    S.org = { nodes: [{ id: 'root', name: '朝廷', depth: 0, posts: [{ title: '皇帝', holder: '杨坚' }] }, { id: 'A1', name: '尚书省', depth: 1, parent: 'root', posts: [{ title: '右仆射', holder: '杨素', src: '史书' }, { title: '都事', holder: '柳虚生', src: '拟' }] }] };
    if (!fictionShow(S).has('柳虚生')) return ['程序补的柳虚生没算成虚构（测试前提不成立）'];
    const oc = callClaude; let last = ''; callClaude = async pr => { last = String(pr); return { text: '{}' }; };
    const facts = async () => { last = ''; try { await buildFacts(S); } catch (_) {} return last; };
    let t = await facts();
    if (!/柳虚生（虚构·照常供职）/.test(t)) bad.push('没打过交道的虚构人物没标「虚构·照常供职」');
    if (!/虚构人物的戏份/.test(t)) bad.push('没附虚构人物戏份的规矩');
    if (/杨素（虚构/.test(t)) bad.push('史书真人杨素被标了虚构');
    S.people = { 柳虚生: { role: '都事', favor: 6, seen: 1 } };
    t = await facts();
    if (/柳虚生（虚构·照常供职）/.test(t)) bad.push('有了情分的虚构人物还被压着不给戏份');
    S.people = {}; S.chat.push({ role: 'user', text: '召柳虚生来问话' });
    t = await facts();
    if (/柳虚生（虚构·照常供职）/.test(t)) bad.push('玩家在话里找上的虚构人物还被压着');
    callClaude = oc; return bad;
  });
  errs.push(...out);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
