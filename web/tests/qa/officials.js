// 大人物照真官（CLAUDE.md「人事与职权」大人物只许真人、照例不授）：隋唐的尚书令照例不授（隋只有杨素 606、唐只有李世民 618—626），
// 人事树上不许有虚构的尚书令；三品以上、中枢最上两层查不到真人就空着写明待查，不起虚构名字；小官吏役查不到才起虚构的；
// 旧存档里大人物位子上的虚构名字清掉；一方之主可以打破旧制除授，小官保举不了照例不授的位子
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof buildOrg === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    const tree = { A: { nodes: [{ key: '尚书省', name: '尚书省', parent: 'ROOT', level: '省', duty: '总领六部', posts: [{ title: '尚书令', rank: '正二品', quota: 1, holders: ['王子虚'] }, { title: '左仆射', rank: '从二品', quota: 1, holders: [] }] },
      { key: '吏部', name: '吏部', parent: '尚书省', level: '部', duty: '铨选', posts: [{ title: '吏部尚书', rank: '正三品', quota: 1, holders: [] }, { title: '吏部侍郎', rank: '正四品上', quota: 2, holders: [] }] },
      { key: '三公', name: '三公', parent: 'ROOT', level: '加官', duty: '', posts: [{ title: '太尉', rank: '正一品', quota: 1, holders: [] }] }] },
      B: { nodes: [{ key: '京兆郡', name: '京兆郡', parent: 'ROOT', level: '郡', duty: '', path: true, posts: [{ title: '京兆尹', rank: '正三品', quota: 1, holders: [] }] }, { key: '大兴县', name: '大兴县', parent: '京兆郡', level: '县', duty: '', path: true, posts: [{ title: '县令', rank: '从六品', quota: 1, holders: [] }, { title: '书吏', rank: '', quota: 4, holders: [] }] }] },
      C: { nodes: [{ key: '左翊卫', name: '左翊卫', parent: 'ROOT', level: '卫', duty: '', posts: [{ title: '大将军', rank: '正三品', quota: 1, holders: [] }, { title: '校尉', rank: '正六品', quota: 4, holders: [] }] }] } };
    const run = async (y, role, name) => {
      const s = newSave({ name, gender: '男', age: 40, role, gregorianYear: y, month: 3, day: 1, place: '大兴', polity: y < 618 ? '隋' : '唐' }); S = s; s.chat = [{ role: 'gm', text: '开场。' }];
      const oc = callClaude, ob = bochaDeep, of = searchFirst; let k = 0;
      bochaDeep = async () => ({ text: '', items: [] }); searchFirst = async () => '';
      callClaude = async (pr) => { if (/国策书/.test(pr)) return { text: '{"policies":[]}' }; if (/fills/.test(pr)) return { text: '{"fills":[]}' }; const P = /整理「中枢」/.test(pr) ? 'A' : /整理「地方」/.test(pr) ? 'B' : /整理「军事」/.test(pr) ? 'C' : ''; k++; return { text: JSON.stringify(P ? tree[P] : {}) }; };
      try { await buildOrg(s); } finally { callClaude = oc; bochaDeep = ob; searchFirst = of; }
      return s;
    };
    for (const [y, nm] of [[607, '隋'], [700, '唐']]) {
      const s = await run(y, '大兴县县令', '韦待价');
      if (!s.org) { bad.push(nm + ' 人事树没建起来：' + ORGMSG); continue; }
      const P = []; for (const n of s.org.nodes) for (const q of n.posts) P.push({ n, q });
      const sl = P.find(x => x.q.title === '尚书令');
      if (!sl) bad.push(nm + ' 树上没有尚书令这个官名'); else {
        if (sl.q.holder) bad.push(nm + y + '年尚书令有人：' + sl.q.holder + '（' + sl.q.src + '）');
        if (sl.q.status !== '照例不授' || !sl.q.noGrant) bad.push(nm + ' 尚书令没标照例不授：' + JSON.stringify(sl.q)); }
      for (const x of P) if (x.q.src === '拟' && orgMajor(x.n, x.q)) bad.push(nm + ' 大人物位子是虚构的：' + x.n.name + x.q.title + x.q.holder);
      for (const t of ['左仆射', '吏部尚书', '京兆尹', '大将军']) { const x = P.find(z => z.q.title === t); if (!x) { bad.push(nm + ' 没有' + t); continue; } if (x.q.holder) bad.push(nm + ' ' + t + '查不到真人却填了' + x.q.holder); if (!/待查/.test(x.q.status || '')) bad.push(nm + ' ' + t + '空着却没写待查：' + x.q.status); }
      const tw = P.find(x => x.q.title === '太尉'); if (tw && (tw.q.holder || !/虚衔/.test(tw.q.status || ''))) bad.push(nm + ' 太尉没标加官虚衔：' + JSON.stringify(tw.q));
      const shuli = P.find(x => x.q.title === '书吏'); if (!shuli || !shuli.q.holder) bad.push(nm + ' 小吏查不到也该起个虚构名字（标虚拟）');
      if (!orgSeekDue(s) && canSearch()) bad.push(nm + ' 大人物空着，后台没排上再查');
      // 界面上写明照例不授、空缺待查
      TAB = 'court'; render0(); const h = document.body.innerHTML; if (!/照例不授/.test(h)) bad.push(nm + ' 朝局页没写照例不授'); if (!/查无在任真人/.test(h)) bad.push(nm + ' 朝局页没写空缺待查');
      // 小官保举不了照例不授的位子
      s.people = Object.assign(s.people || {}, { 刘文静: { role: '门客', seen: 1, where: '大兴' } });
      ORGMSG = ''; orgAct(s, 'appoint', { node: sl.n, pi: sl.n.posts.indexOf(sl.q), person: '刘文静' });
      if (sl.q.holder === '刘文静' || sl.q.pending === '刘文静') bad.push(nm + ' 县令竟能保举尚书令');
    }
    // 隋大业二年：尚书令是杨素
    { const s = await run(606, '大兴县县令', '韦待价'); const x = s.org && s.org.nodes.flatMap(n => n.posts).find(q => q.title === '尚书令'); if (!x || x.holder !== '杨素') bad.push('606 年尚书令该是杨素：' + JSON.stringify(x)); }
    // 一方之主能打破旧制除授
    { const s = await run(700, '皇帝', '武曌'); s.polPts = 30; s.idm = 'emperor'; const n = s.org.nodes.find(z => z.posts.some(q => q.title === '尚书令')), pi = n.posts.findIndex(q => q.title === '尚书令');
      s.people = Object.assign(s.people || {}, { 狄仁杰: { role: '幕僚', tie: '幕僚', seen: 1, where: '大兴' } });
      ORGMSG = ''; orgAct(s, 'appoint', { node: n, pi, person: '狄仁杰' }); if (/再点一次/.test(ORGMSG)) orgAct(s, 'appoint', { node: n, pi, person: '狄仁杰' }); const q = n.posts[pi];
      if (q.holder !== '狄仁杰' && q.pending !== '狄仁杰') bad.push('一方之主除授照例不授的位子不行：' + ORGMSG + JSON.stringify(q));
      else { orgVacantFix(s); if (q.holder !== '狄仁杰' && q.pending !== '狄仁杰') bad.push('一方之主任命的人被程序清掉了'); } }
    // 旧存档：大人物位子上的虚构名字清掉，小吏的留着
    { const s = newSave({ name: '韦待价', gender: '男', age: 40, role: '大兴县令', gregorianYear: 610, month: 3, day: 1, place: '大兴', polity: '隋' });
      s.org = { nodes: [{ id: 'root', name: '朝廷', depth: 0, posts: [{ title: '皇帝', holder: '杨广' }] }, { id: 'A1', name: '尚书省', depth: 1, parent: 'root', posts: [{ title: '尚书令', rank: '正二品', holder: '张子虚', src: '拟' }, { title: '左仆射', rank: '从二品', holder: '李乌有', src: '拟' }, { title: '右仆射', rank: '从二品', holder: '苏威', src: '博查' }] }, { id: 'B9', name: '大兴县', depth: 4, parent: 'A1', posts: [{ title: '书吏', holder: '王二', src: '拟' }] }], log: [] };
      const t = JSON.parse(JSON.stringify(s)); migrate(t); const q = t.org.nodes[1].posts;
      if (q[0].holder || q[1].holder) bad.push('旧存档大人物位子上的虚构名字没清：' + JSON.stringify(q));
      if (q[2].holder !== '苏威') bad.push('旧存档的真人被清了');
      if (t.org.nodes[2].posts[0].holder !== '王二') bad.push('旧存档的小吏被清了'); }
    // 写给人事树的材料里有照例不授的表
    if (!/尚书令/.test(vacantText(607)) || !/丞相/.test(vacantText(1500)) || !/中书令/.test(vacantText(1000))) bad.push('照例不授的表不全');
    if (vacantOff(1370, '左丞相', '中书省')) bad.push('明初洪武三年的丞相被当成不设');
    if (!vacantOff(1400, '左丞相', '中书省')) bad.push('洪武十三年以后的丞相没当成不设');
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
