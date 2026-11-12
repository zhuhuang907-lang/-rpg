// R-194：开局一次查齐——联网整不成人事树就照本朝制度库立起来（内置史料里的真人照官位填）；开局以后不再回头改已经摆出来的人和数（不改名、不改年岁、不「查实是某某」换人、不「常理更正」）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof orgFromLib === 'function');
  const r = await p.evaluate(async () => { const bad = [];
    S = newSave({ name: '赵顼', gender: '男', age: 23, role: '皇帝', real: true, gregorianYear: 1070, month: 6, day: 1, place: '开封', polity: '北宋' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 1; VIEW = 'game';
    window.afterTurn = async () => {}; window.bgJobs = () => [];
    await prepAll(S);
    if (!S.org || arr(S.org.nodes).length < 5) bad.push('开局整不成人事树时没照制度库立起来：' + JSON.stringify(S.org && S.org.nodes.length));
    else { const H = S.org.nodes.flatMap(n => n.posts.filter(q => q.holder && q.src === '内置史料').map(q => q.holder)); if (!H.length) bad.push('照制度库立的树上没有内置史料里的真人'); }
    if (S.settledAt == null || !settled(S)) bad.push('开局一次查齐以后没定下');
    // 定下以后：重名不改名、年岁不改、常理不回头更正、大官不再上网换人
    S.people = { 张大: { age: 40, ageV: 0, seen: 1 } }; S.household = [{ relation: '长子', name: '赵大郎', age: 3, ageV: 0 }];
    if (clashDue(S)) bad.push('开局以后还在查重名改名'); if (logicDue(S)) bad.push('开局以后还在常理更正');
    if (ageTodo(S).some(([, v]) => v.age != null)) bad.push('开局以后还要改已经定下的年岁：' + JSON.stringify(ageTodo(S).map(x => x[0])));
    return bad; });
  const all = r.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
