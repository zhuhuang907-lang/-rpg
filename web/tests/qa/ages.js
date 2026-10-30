// 年岁（CLAUDE.md「人物」年龄不许瞎编、名字）：长幼次序必须对（兄姐比本人大、弟妹比本人小、伯比父大叔比父小、长子＞次子）；推年岁一定给数、带上冲突；颠倒的交 DeepSeek 重推；叙述里不许「某地某日某事」
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof familyAgeIssues === 'function' && typeof ageInfer === 'function');
  const out = await p.evaluate(async () => {
    const bad = [], mk = H => ({ id: 'a', v: 2, turn: 3, protagonist: { name: '汪景和', role: '扬州盐商', age: 40, gender: '男' }, clock: { y: 1757, m: 3, d: 1, yearLabel: '乾隆二十二年' }, place: { full: '扬州府江都县', polity: '清' }, people: {}, household: H, chat: [], world: {} });
    // 长幼颠倒，程序指出来（不改数）
    let st = mk([{ relation: '兄', name: '汪景福', age: 35 }, { relation: '弟', name: '汪景禄', age: 44 }, { relation: '父', name: '汪世昌', age: 66 }, { relation: '伯父', name: '汪世隆', age: 60 }, { relation: '叔父', name: '汪世盛', age: 70 }, { relation: '长子', name: '汪承裕', age: 12 }, { relation: '次子', name: '汪承德', age: 16 }]);
    const iss = familyAgeIssues(st);
    for (const [k, w] of [['汪景福', '兄比本人小'], ['汪景禄', '弟比本人大'], ['汪世隆', '伯父比父亲小'], ['汪世盛', '叔父比父亲大'], ['汪承德', '次子比长子大']]) if (!iss.some(x => x.includes(k))) bad.push('长幼颠倒没指出来：' + w);
    if (st.household[0].age !== 35) bad.push('程序自己改了年岁');
    // 顺序对的不报
    const ok = mk([{ relation: '兄', name: '汪景福', age: 44 }, { relation: '弟', name: '汪景禄', age: 35 }, { relation: '长子', name: '汪承裕', age: 18 }, { relation: '次子', name: '汪承德', age: 15 }]);
    if (familyAgeIssues(ok).length) bad.push('顺序对的也报了：' + familyAgeIssues(ok));
    // 推年岁：提示词里带着冲突和长幼规矩、一定要给数；推完还颠倒的，下回重推
    let prompt = ''; const orig = callClaude; callClaude = async (pr) => { prompt = pr; return { text: JSON.stringify({ people: [{ name: '汪景福', age: 33, about: true, why: '推' }, { name: '汪景禄', age: 46, about: true, why: '推' }] }) }; };
    try { st = mk([{ relation: '兄', name: '汪景福', age: null }, { relation: '弟', name: '汪景禄', age: null }]); await ageInfer(st); } finally { callClaude = orig; }
    if (!/兄、姐比本人大，弟、妹比本人小/.test(prompt) || !/一定要给出一个推断的岁数/.test(prompt)) bad.push('推年岁的提示没写长幼规矩、没要求一定给数');
    if (!st.ageAgain || st.household.some(m => m.ageV === 1 && /汪景福|汪景禄/.test(m.name))) bad.push('推完还长幼颠倒，没交下回重推');
    // 主角自己没有岁数，也推
    st = mk([]); st.protagonist.age = null; if (!ageTodo(st).some(x => x[0] === '我')) bad.push('主角没有岁数也不推');
    // 开局给的「30」没依据：主角也交 DeepSeek 重推；有史载生年的、玩家亲手填的不推（2026-10-30 玩家：「年龄你写的还是30……让 ds 去推测」）
    st = mk([]); st.protagonist.age = 30; if (!ageTodo(st).some(x => x[0] === '我')) bad.push('主角开局随手给了 30 岁、没依据，也不交 DeepSeek 重推');
    st = mk([]); st.protagonist.age = 30; st.protagonist.born = 1728; if (ageTodo(st).some(x => x[0] === '我')) bad.push('有史载生年的主角也重推');
    { const sv = newSave({ name: '汪景和', gender: '男', age: 30, ageSet: true, role: '盐商', gregorianYear: 1757, month: 3, day: 1, place: '扬州府', polity: '清' }); if (!sv.protagonist.ageSet || ageTodo(sv).some(x => x[0] === '我')) bad.push('玩家亲手填的年岁被重推'); }
    { const sv = newSave({ name: '卢见曾', gender: '男', age: 68, born: 1690, role: '盐运使', real: true, gregorianYear: 1757, month: 3, day: 1, place: '扬州府', polity: '清' }); if (sv.protagonist.born !== 1690) bad.push('开局的史载生年没记上，主角年岁没根据'); }
    // 人人推成 30：这几个人下回带着「不可能人人一样」再推
    callClaude = async (pr) => ({ text: JSON.stringify({ people: ['汪甲','汪乙','汪丙','汪丁'].map(n => ({ name: n, age: 30, about: true, why: '推' })) }) });
    try { st = mk(['汪甲','汪乙','汪丙','汪丁'].map((n, i) => ({ relation: ['妻','妾','仆','婢'][i], name: n, age: 30 }))); await ageInfer(st);
      if (!st.household.every(m => m.ageV !== 1)) bad.push('人人推成 30 岁也照收，不再重推');
      callClaude = async (pr) => { prompt = pr; return { text: '{"people":[]}' }; }; await ageInfer(st); if (!/都推成30岁，不可能人人一样/.test(prompt)) bad.push('重推时没告诉 DeepSeek 人人一样不行'); } finally { callClaude = orig; }
    // 人物再出场：账上的年岁依据、本事、编号不被整条重写冲掉
    st = newSave({ name: '汪景和', gender: '男', age: 40, role: '盐商', gregorianYear: 1757, month: 3, day: 1, place: '扬州府', polity: '清' }); st.people = { '卢见曾': { role: '盐运使', age: 68, ageV: 1, ageWhy: '生于1690年', ageAbout: false, stats: { 理政: { v: 70 } }, pid: 'p7', voice: '山东口音', seen: 1 } };
    try { applyReply(st, { reply: '卢见曾来了。', presentNpcs: [{ name: '卢见曾', role: '两淮盐运使', favor: 10 }] }, '见卢见曾'); } catch (e) { bad.push('applyReply 出错：' + e.message + String(e.stack).slice(0, 300)); }
    { const v = st.people['卢见曾'] || {}; if (v.ageWhy !== '生于1690年' || v.ageV !== 1 || !v.stats || v.pid !== 'p7' || v.voice !== '山东口音') bad.push('人物再出场，年岁依据、本事、编号、口吻被冲掉：' + JSON.stringify(v).slice(0, 200)); }
    // 叙述里的「某地某日」打回；对话里自称「某」不算
    st = mk([]); const f1 = nameFaults(st, '他在某地住了某日，办了某事。'), f2 = nameFaults(st, '「某不才，愿效犬马。」他说。');
    if (!f1.some(x => /某地|某日|某事/.test(x))) bad.push('叙述里的某地、某日、某事没挑出来'); if (f2.length) bad.push('对话里自称「某」也被当成错：' + f2);
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
