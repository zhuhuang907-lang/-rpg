// 真人硬门槛（R-209~211）：名单外的古人（李白）不收；档案只列此刻在世且核实过的；旧档打开就清
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html')));
  await p.waitForFunction(() => typeof eraPersonOk === 'function' && typeof eraPersonOkName === 'function' && typeof eraPurge === 'function' && typeof ensureDossiers === 'function' && typeof pane === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    const s = newSave({ name: '王二', gender: '男', age: 35, role: '盐商', gregorianYear: 1757, month: 3, day: 1, place: '扬州府江都县', polity: '清' });
    // 1 生卒门槛：已故超过四十年、未出生的不收；死了十七年的、生卒不详的不挡
    if (eraPersonOk(s, '李白', 701, 762)) bad.push('李白（701—762）在1757年竟然放行');
    if (!eraPersonOk(s, '卢见曾', 1690, 1768)) bad.push('同时代的人被挡了');
    if (eraPersonOk(s, '甲', 1800, 1880)) bad.push('还没出生的人放行了');
    if (!eraPersonOk(s, '乙', 1700, 1740)) bad.push('死了十七年的人被当成古人挡了');
    if (!eraPersonOk(s, '丙', null, null)) bad.push('生卒不详的不该直接挡');
    // 2 照史料认人：内置史料里 762 年有「李白卒于当涂」，清朝这一局必须认出来是古人
    const e1 = eraPersonOkName(s, '李白');
    if (e1.ok) bad.push('史料里查得到李白卒于762年，却没认出是唐人：' + JSON.stringify(e1));
    if (!eraPersonOkName(s, '卢见曾').ok) bad.push('史料里没有生卒的同代人被误挡');
    // 3 旧档清理：档案、见闻里的古人删掉，同代人留着
    s.dossiers = { 李白: { real: true, born: 701, died: 762, doubt: true, y: 1757 }, 卢见曾: { real: true, born: 1690, died: 1768, y: 1757 } };
    s.locals = [{ name: '李白', role: '诗人', y: 1757 }, { name: '卢见曾', role: '盐运使', y: 1757 }];
    eraPurge(s);
    if (s.dossiers['李白']) bad.push('旧档里的李白没清掉');
    if (!s.dossiers['卢见曾']) bad.push('旧档清理把同代人也删了');
    if (arr(s.locals).some(x => x.name === '李白')) bad.push('见闻「此时此地的真人」里的李白没清掉');
    if (s.eraPurged !== 2) bad.push('清理标记没落下（会每次重扫）');
    // 4 真人档案只列此刻在世、核实过的：李白、已故的、存疑的都不上表
    s.dossiers['王先谦'] = { real: true, born: 1700, died: 1740, y: 1757, identity: '已故的人' };
    s.dossiers['冯存疑'] = { real: true, doubt: true, y: 1757, identity: '查不到的人' };
    const html = (() => { S = s; return pane('news'); })();
    if (html.includes('李白')) bad.push('见闻页还印着李白');
    if (html.includes('王先谦')) bad.push('已故的人上了真人档案');
    if (html.includes('冯存疑')) bad.push('存疑的人名上了真人档案');
    if (!html.includes('卢见曾')) bad.push('该列的当代真人没列出来');
    // 5 模型夹带：名单外的名字（李白）一律不立档
    const oc = callClaude, os = S; S = s;
    callClaude = async () => ({ text: JSON.stringify({ people: [
      { name: '卢见曾', real: true, born: 1690, died: 1768, identity: '两淮盐运使', state: '在世', post: '两淮盐运使' },
      { name: '李白', real: true, born: 701, died: 762, identity: '唐代诗人', state: '已故' }
    ] }) });
    try { s.dossiers = {}; await ensureDossiers(s, ['卢见曾']); } finally { callClaude = oc; }
    if (s.dossiers['李白']) bad.push('模型夹带的李白被立了档');
    // 6 名单上的人也要照生卒再核：模型把同名古人当本朝人，立档时退掉
    callClaude = async () => ({ text: JSON.stringify({ people: [{ name: '李白', real: true, born: 701, died: 762, identity: '唐代诗人', state: '已故' }] }) });
    try { await ensureDossiers(s, ['李白']); } finally { callClaude = oc; S = os; }
    if (s.dossiers['李白']) bad.push('名单上的古人被立了档');
    // 7 AI 把本朝人的生卒写错（写成几百年前）：史料里这名字在这一朝有人，只当日期不可信、清掉，别把真人误退
    s.dossiers = {};
    const op = personCheck; personCheck = async () => ({ real: true, src: '测', born: null, died: null, evidence: [] });
    callClaude = async () => ({ text: JSON.stringify({ people: [{ name: '永常', real: true, born: 1200, died: 1280, identity: '本朝武将', state: '在世' }] }) });
    try { await ensureDossiers(s, ['永常']); } finally { callClaude = oc; personCheck = op; }
    if (!s.dossiers['永常']) bad.push('模型把本朝人的生卒写错，真人被误退了');
    else if (s.dossiers['永常'].born != null || s.dossiers['永常'].died != null) bad.push('错误的生卒没清掉：' + JSON.stringify({ b: s.dossiers['永常'].born, d: s.dossiers['永常'].died }));
    return bad;
  });
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
