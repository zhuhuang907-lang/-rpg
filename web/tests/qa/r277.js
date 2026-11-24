// zcode 考卷一查出的（R-277，2026-11-22）：记账把同一支兵换个写法（加个括号注）又记一条，兵册一支兵两行；
// 记账每回照抄同一条「拖着」，回执连八回一个样；对账改正把秦王改成皇帝、把现钱 905 改成 30000
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof applyReply === 'function' && typeof forceAlias === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    const s = newSave({ name: '李从荣', gender: '男', age: 30, role: '秦王、河南尹、判六军诸卫事', real: true, gregorianYear: 933, month: 8, day: 1, place: '洛阳', polity: '后唐' }); s.chat = [{ role: 'gm', text: '开场。' }]; s.turn = 10; S = s;
    s.forces = [{ name: '河东军（北京留守司）', leader: '石敬瑭', troops: '9454', at: '太原', owner: '后唐' }, { name: '捧圣军', leader: '朱洪实', troops: '5000', at: '洛阳', owner: '后唐' }];
    CUR_RULING = null; applyReply(s, { elapsedDays: 1, turnSummary: '议事', forces: [{ name: '河东军（北京留守）', leader: '石敬瑭', troops: 9454, at: '太原' }, { name: '天雄军', leader: '范延光', troops: 8000, at: '魏州' }] }, '召冯道议事');
    const F = arr(s.forces).map(f => f.name);
    if (F.filter(n => /^河东军/.test(n)).length !== 1) bad.push('同一支河东军记成两条：' + F.join('、'));
    if (!F.includes('天雄军')) bad.push('真新来的一支没记上：' + F.join('、'));
    // 名字不同、将不同的不并
    applyReply(s, { elapsedDays: 1, turnSummary: '议事', forces: [{ name: '河东军（代州）', leader: '安重荣', troops: 3000, at: '代州' }] }, '召冯道议事');
    if (arr(s.forces).filter(f => /^河东军/.test(f.name)).length !== 2) bad.push('不同将领的两支河东军被并成一条');
    // 回执不重样
    { s.actsNow = []; const x = actNew(s, { type: '令', what: '除卢晏为给事中' }); x.state = '在办'; s.turn = 3;
      const r1 = applyActs(s, { actResults: [{ id: x.id, state: '拖着', why: '皆受告身，然系权拟' }] }); s.turn = 4; s.actsNow = [];
      const r2 = applyActs(s, { actResults: [{ id: x.id, state: '拖着', why: '皆受告身，然系权拟' }] }); s.turn = 5; s.actsNow = [];
      const r3 = applyActs(s, { actResults: [{ id: x.id, state: '办成', why: '正式除授' }] });
      if (!r1.some(o => o.id === x.id)) bad.push('头一回拖着没进回执');
      if (r2.some(o => o.id === x.id)) bad.push('同一条拖着下一回又进回执');
      if (!r3.some(o => o.id === x.id && o.state === '办成')) bad.push('状态变了（办成）没记'); }
    // 对账改正不越界
    { s.protagonist.role = '秦王、河南尹、判六军诸卫事'; s.money.cash = 905;
      applyLogicFixes(s, [{ target: 'protagonist', field: 'role', value: '皇帝', why: '照名册' }, { target: 'money', value: 30000, why: '对账' }]);
      if (/皇帝/.test(s.protagonist.role)) bad.push('对账把没即位的秦王改成了皇帝');
      if (s.money.cash !== 905) bad.push('对账把现钱 905 改成了 ' + s.money.cash);
      applyLogicFixes(s, [{ target: 'money', value: 850, why: '少记了一笔开销' }]); if (s.money.cash !== 850) bad.push('合理的现钱改正没照改'); }
    // 考卷三：查账括注不进正文
    if (/查账/.test(stripLookNotes('周文看完卷宗。\n【查账：钱粮实数（县仓、库银）】'))) bad.push('正文末尾的查账括注没删');
    // 考卷三：「到年底」照到年底算
    { const k = newSave({ name: '周文', gender: '男', age: 35, role: '吴县知县', gregorianYear: 1600, month: 6, day: 5, place: '苏州府吴县', polity: '明' }); S = k;
      const m = spanMonths('', '这一年照常理政，到年底考成'); if (m > 7) bad.push('六月说「这一年照常理政，到年底」排了 ' + m + ' 个月'); S = s; }
    // 考卷三：账上有官，身份不写罢官在籍
    { const k = newSave({ name: '周文', gender: '男', age: 35, role: '吴县知县', gregorianYear: 1600, month: 6, day: 5, place: '苏州府吴县', polity: '明' }); k.career = { office: '吴县知县' }; k.protagonist.role = '罢官在籍（原吴县典史）'; roleSync(k);
      if (k.protagonist.role !== '吴县知县') bad.push('账上还是知县，身份仍写' + k.protagonist.role); }
    // 年号过了头
    { const k = newSave({ name: '周铁山', gender: '男', age: 30, role: '成都县吏', gregorianYear: 937, month: 3, day: 20, place: '成都', polity: '后蜀' });
      if (!futureEras(k, '清泰四年三月二十午时，成都县……').some(x => /清泰四年/.test(x))) bad.push('清泰四年没查出来');
      const k2 = newSave({ name: '周铁山', gender: '男', age: 30, role: '福州小吏', gregorianYear: 930, month: 1, day: 5, place: '福州', polity: '闽' });
      if (futureEras(k2, '天成五年正月，福州城里张榜').length) bad.push('天成五年正月（改元长兴之前）被当成错'); }
    // 错词表：看词义的不打回，今词照打回
    { const k = newSave({ name: '周铁山', gender: '男', age: 30, role: '潭州小吏', gregorianYear: 945, month: 5, day: 5, place: '潭州', polity: '楚' });
      if (vocabFaults(k, '秀才们在城门口看榜，父母大人在堂。').length) bad.push('看词义的（秀才、大人）也打回了：' + vocabFaults(k, '秀才们在城门口看榜，父母大人在堂。'));
      if (!vocabFaults(k, '这件事要落实到人').length) bad.push('今词「落实」没打回'); }
    // 考卷一：人物写「御史中丞迁御史大夫」，人事树照迁去的官补上
    { s.org = { nodes: [{ name: '御史台', posts: [{ title: '御史大夫', holder: '' }, { title: '御史中丞', holder: '' }] }, { name: '内阁', posts: [{ title: '中极殿大学士（首辅）', holder: '' }] }] };
      s.people = Object.assign(s.people || {}, { 刘赞: { role: '御史中丞迁御史大夫', seen: 1 }, 赵志皋: { role: '大学士（1594年起为首辅）', seen: 1 } }); orgSync(s);
      const po = n => s.org.nodes.flatMap(x => x.posts).find(q => q.title === n);
      if (po('御史大夫').holder !== '刘赞') bad.push('迁御史大夫没落到人事树：' + JSON.stringify(po('御史大夫')));
      if (po('中极殿大学士（首辅）').holder !== '赵志皋') bad.push('首辅一席空着'); }
    return bad;
  });
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
