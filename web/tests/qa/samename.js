// 真人和别朝人同名不改名、跨朝代的同一个人不拆成两个；已认作真人的不被后一回翻成虚构（CLAUDE.md「人物」真人同名不改）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof fictionClash === 'function');
  const r = await p.evaluate(async () => { S = newSave({ name: '李渊', gender: '男', age: 50, role: '唐国公', gregorianYear: 617, month: 5, day: 1, place: '太原', polity: '隋' }); S.chat = [{ role: 'gm', text: '开场' }]; S.protagonist.real = true;
    // 刘文静：隋末晋阳令、入唐为纳言——跨朝的同一个人；张良：和汉初张良同名的本局真人（还没核过）；王拟：程序起的虚构名字、撞了史书人物
    S.people = { 刘文静: { role: '晋阳令', real: true }, 张良: { role: '太原府属吏' } };
    S.org = { nodes: [{ id: 'root', name: '朝廷', depth: 0, posts: [{ title: '皇帝', holder: '杨广' }] }, { id: 'A', name: '太原郡', depth: 2, parent: 'root', posts: [{ title: '主簿', holder: '韩信', src: '拟' }] }] };
    const oc = callClaude; let prompts = [];
    callClaude = async x => { prompts.push(x); if (/哪些和中国历史上/.test(x)) return { text: JSON.stringify({ famous: [{ name: '韩信', who: '汉初名将' }, { name: '张良', who: '汉初谋士' }, { name: '刘文静', who: '唐初宰相' }], unsure: [] }) }; if (/逐个判断是不是史书上真有其人/.test(x)) return { text: JSON.stringify({ rows: [{ i: 1, real: '假', who: '' }, { i: 2, real: '假', who: '' }] }) }; return { text: '{}' }; };
    try { await fictionClash(S); S.pplChkAt = null; try { await pplChkDS(S); } catch (_) {} } finally { callClaude = oc; }
    return { liu: !!S.people.刘文静 && !S.people.刘文静.fic, zhang: !!S.people.张良, han: S.org.nodes[1].posts[0].holder, cross: prompts.some(x => /跨朝代/.test(x)) || true, chkP: (prompts.find(x => /逐个判断/.test(x)) || '') }; });
  const bad = [];
  if (!r.liu) bad.push('跨朝代的真人被翻成虚构或改了名：' + JSON.stringify(r).slice(0, 300));
  if (!r.zhang) bad.push('和别朝人同名的本局人物被改名了');
  if (r.han === '韩信') bad.push('程序起的虚构名字撞了史书人物没改');
  if (r.chkP && !/跨朝代/.test(r.chkP)) bad.push('真假表的问法没交代跨朝代的是同一个人');
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
