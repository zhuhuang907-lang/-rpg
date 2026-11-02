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
    let TABLE_ASKS = 0, TABLE_MODE = 'full';
    const run = async (y, role, name) => {
      const s = newSave({ name, gender: '男', age: 40, role, gregorianYear: y, month: 3, day: 1, place: '大兴', polity: y < 618 ? '隋' : '唐' }); S = s; s.chat = [{ role: 'gm', text: '开场。' }];
      const oc = callClaude, ob = bochaDeep, of = searchFirst; let k = 0;
      bochaDeep = async () => ({ text: '', items: [] }); searchFirst = async () => '';
      callClaude = async (pr) => { if (/在任官员表/.test(pr)) { TABLE_ASKS++; const rows = []; pr.split('\n').forEach(l => { const m = /^(\d+)\. (.+?)｜(.+?)(（|，|$)/.exec(l); if (!m) return; const ti = m[3]; const i = +m[1];
          if (TABLE_MODE === 'none') return; if (ti === '左仆射') rows.push({ i, names: [y < 618 ? '苏威' : '豆卢钦望'] }); else if (ti === '吏部尚书') rows.push({ i, names: [y < 618 ? '牛弘' : '韦巨源'] }); else if (ti === '京兆尹') rows.push({ i, vacant: true, names: [], why: '此时京兆尹出缺' }); else if (ti === '大将军') rows.push({ i, names: ['某将军'] }); else rows.push({ i, unknown: true, names: [] }); }); return { text: JSON.stringify({ rows }) }; }
        if (/国策书/.test(pr)) return { text: '{"policies":[]}' }; if (/fills/.test(pr)) return { text: '{"fills":[]}' }; const P = /整理「中枢」/.test(pr) ? 'A' : /整理「地方」/.test(pr) ? 'B' : /整理「军事」/.test(pr) ? 'C' : ''; k++; return { text: JSON.stringify(P ? tree[P] : {}) }; };
      try { await buildOrg(s); } finally { callClaude = oc; bochaDeep = ob; searchFirst = of; }
      return s;
    };
    for (const [y, nm] of [[607, '隋'], [700, '唐']]) {
      TABLE_MODE = 'none'; const s = await run(y, '大兴县县令', '韦待价');
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
    // DS 做表（一次列全）：大官照表填真人；表上说史载空着的空着、写依据；表上编「某」的不收、照旧待查；小吏照旧起名
    for (const [y, nm] of [[607, '隋'], [700, '唐']]) {
      TABLE_MODE = 'full'; TABLE_ASKS = 0; const s = await run(y, '大兴县县令', '韦待价');
      const P = []; for (const n of s.org.nodes) for (const q of n.posts) P.push({ n, q });
      const g = t => (P.find(x => x.q.title === t) || {}).q || {};
      if (g('左仆射').holder !== (y < 618 ? '苏威' : '豆卢钦望') || g('左仆射').src !== 'DS表') bad.push(nm + ' 表上的左仆射没填：' + JSON.stringify(g('左仆射')));
      if (g('吏部尚书').holder !== (y < 618 ? '牛弘' : '韦巨源')) bad.push(nm + ' 表上的吏部尚书没填');
      if (g('京兆尹').holder || g('京兆尹').status !== '史载此时空缺' || !g('京兆尹').histVacant) bad.push(nm + ' 表上说史载空着的京兆尹没照空：' + JSON.stringify(g('京兆尹')));
      if (/某/.test(g('大将军').holder || '') || g('大将军').src === '拟') bad.push(nm + ' 大将军填了「某」或虚构的：' + JSON.stringify(g('大将军')));
      if (g('尚书令').holder) bad.push(nm + ' 有表以后尚书令反倒有人了');
      if (!g('县令').holder && !g('县令').histVacant) bad.push(nm + ' 小官县令空着没名字');
      if (TABLE_ASKS < 1 || TABLE_ASKS > 2) bad.push(nm + ' 在任官员表该一次（分块）问完，问了 ' + TABLE_ASKS + ' 回');
      for (const x of P) if (!x.q.holder && x.n.id !== 'root' && !x.q.noGrant && !x.q.histVacant && !orgMajor(x.n, x.q)) bad.push(nm + ' 小官位子空着没名字：' + x.n.name + x.q.title);
    }
    // 不漏查：头一回 DeepSeek 漏答的行，挑出来再问一回
    { TABLE_MODE = 'none'; const s = await run(700, '大兴县县令', '韦待价'); const P = []; for (const n of s.org.nodes) for (const q of n.posts) if (q.title === '左仆射' || q.title === '吏部尚书') { q.holder = ''; q.src = ''; P.push(q); }
      const oc = callClaude; let calls = 0, second = '';
      callClaude = async pr => { calls++; const rows = []; pr.split('\n').forEach(l => { const m = /^(\d+)\. (.+?)｜(.+?)(（|，|$)/.exec(l); if (!m) return; if (calls === 1 && m[3] === '吏部尚书') return; if (calls > 1) second += m[3] + ','; rows.push({ i: +m[1], names: [m[3] === '左仆射' ? '豆卢钦望' : m[3] === '吏部尚书' ? '韦巨源' : ''].filter(Boolean), unknown: !/左仆射|吏部尚书/.test(m[3]) }); }); return { text: JSON.stringify({ rows }) }; };
      try { await orgTableDS(s, s.org.nodes, true); } finally { callClaude = oc; }
      if (P[1].holder !== '韦巨源') bad.push('头一回漏答的吏部尚书没再问：' + JSON.stringify(P[1]));
      if (/左仆射/.test(second)) bad.push('答过的行又重问了一回：' + second); }
    // 往后几年的更替开局就查好存进存档，走到月份照表换人；玩家任命的位子照玩家的
    { TABLE_MODE = 'none'; const s = await run(700, '大兴县县令', '韦待价'); const n = s.org.nodes.find(z => z.posts.some(q => q.title === '左仆射')), q = n.posts.find(z => z.title === '左仆射'), q2 = n.posts.find(z => z.title === '尚书令'); q.holder = '豆卢钦望'; q.src = 'DS表';
      const nb = s.org.nodes.find(z => z.posts.some(q => q.title === '吏部尚书')), qb = nb.posts.find(z => z.title === '吏部尚书'); qb.holder = '韦巨源'; qb.byPlayer = true;
      if (!orgFutureDue(s)) bad.push('开局没排上「往后几年的更替表」');
      const oc = callClaude; let asked = '';
      callClaude = async pr => { asked = pr; const rows = []; pr.split('\n').forEach(l => { const m = /^(\d+)\. (.+?)｜(.+?)｜/.exec(l); if (!m) return; if (m[3] === '左仆射') rows.push({ i: +m[1], y: 701, m: 3, name: '魏元忠', prev: '罢' }); if (m[3] === '吏部尚书') rows.push({ i: +m[1], y: 701, m: 1, name: '李峤' }); }); return { text: JSON.stringify({ changes: rows }) }; };
      try { await orgFutureDS(s); } finally { callClaude = oc; }
      if (!/705年底/.test(asked)) bad.push('更替表没往后查五年');
      if (arr(s.org.future).length !== 2 || s.org.futureTo !== 705) bad.push('更替表没存进存档：' + JSON.stringify(s.org.future));
      if (orgFutureDue(s)) bad.push('更替表查好了还排着');
      s.clock.y = 701; s.clock.m = 2; const out0 = histTick(s); if (q.holder !== '豆卢钦望') bad.push('还没到月份就换人了');
      s.clock.m = 4; const out = histTick(s);
      if (q.holder !== '魏元忠' || q.src !== '史书') bad.push('到了月份没照表换人：' + JSON.stringify(q));
      if (qb.holder !== '韦巨源' || !out0.concat(out).some(x => /史事已改/.test(x))) bad.push('玩家任命的位子被史书表覆盖了：' + JSON.stringify(qb) + JSON.stringify(out));
      s.clock.y = 704; if (!orgFutureDue(s)) bad.push('快到表尾了没再往后查'); }
    TABLE_MODE = 'none';
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
