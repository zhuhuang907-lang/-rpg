// 人物页：身边和远处分开（远处的写信、遣使）、不摆出处引文、真人主角不添虚构下人、唐宋以前的虚构名字像那时的士人（CLAUDE.md 人物「身边和远处分开、不添虚构人物」）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 430, height: 1800 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof render === 'function' && typeof pickName === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    // 2026-11-01 玩家：「朝廷的角色、远在很远地方的人根本就不是身边的人，但是可以给他们写信」「明明不能有虚构人物的加上虚构人物」「人物系统不需要那个很长篇大论的节选的 reference，全部隐藏掉」
    S = newSave({ name: '杨坚', gender: '男', age: 49, role: '隋文帝', real: true, gregorianYear: 589, month: 3, day: 1, place: '大兴城', polity: '隋' }); S.idm = 'emperor';
    S.people = { 高颎: { role: '尚书左仆射', tie: '宰相', where: '大兴', real: true, circle: true, basis: '《隋书·高颎传》：开皇元年拜尚书左仆射……（很长的节选）', seen: 1 }, 杨秀: { role: '蜀王、益州总管', tie: '第四子', where: '益州', real: true, seen: 1 }, 苏威: { role: '吏部尚书', tie: '大臣', where: '京师', real: true, seen: 1 } };
    VIEW = 'game'; TAB = 'people'; SIDE_FOLD = false; render(); const t = document.body.innerText;
    const iFar = t.indexOf('远处的人'), iGao = t.indexOf('高颎'), iXiu = t.indexOf('杨秀', iFar);
    if (iFar < 0) bad.push('没有「远处的人」一栏');
    if (!(iGao >= 0 && iGao < iFar)) bad.push('同在京城的高颎没列在身边');
    if (!(iXiu > iFar)) bad.push('远在益州的杨秀列成了身边的人');
    if (t.indexOf('苏威') > iFar) bad.push('在京师的苏威（你也在京城）列成了远处');
    const xiuBtns = [...document.querySelectorAll('[data-write]')].map(e => e.dataset.write).filter(w => /杨秀/.test(w));
    if (!xiuBtns.some(w => /写信/.test(w)) || xiuBtns.some(w => /^我去找杨秀/.test(w))) bad.push('远处的人按钮不是写信、遣使：' + xiuBtns.join('|'));
    if (/出处|节选|已核：(?!查无此人)|照史料：/.test(t)) bad.push('人物页还摆着出处引文：' + (t.match(/.{0,20}(出处|节选|已核：(?!查无此人)|照史料：).{0,20}/) || [])[0]);
    // 真人主角：家里不补虚构的管家仆役
    let called = ''; const keep = window.callClaude; window.callClaude = async (pr) => { called += pr.slice(0, 200); return { text: '{"add":[{"relation":"管家","name":"周大","age":40,"note":"","basis":"推算"}]}' }; };
    const keepF = window.familyFromRecords; window.familyFromRecords = async () => [];
    try { await familyFix(S); } catch (_) { /* 没联网 */ } window.callClaude = keep; window.familyFromRecords = keepF;
    if (arr(S.household).some(m => m.name === '周大' || /管家|仆|婢/.test(m.relation || ''))) bad.push('真人主角家里又补了虚构的下人');
    // 唐宋以前的虚构名字像那时的士人，不是「周大」，也不是明清那套「守仁」「文焕」
    const used = new Set(), names = []; for (let i = 0; i < 6; i++) { S.nameMap = S.nameMap || {}; S.nameMap['k' + i] = 1; const n = pickName(S, '周', GIVEN, used); used.add(n); names.push(n); }
    if (names.some(n => /周(大|二|三|守仁|文焕|世昌)/.test(n))) bad.push('隋朝的虚构名字不像那时的士人：' + names.join('、'));
    if (!names.some(n => n.length === 2)) bad.push('隋朝的虚构名字没有单名：' + names.join('、'));
    // 写正文的规矩里有：真人主角不添虚构人物、远处的人只书信往来
    if (!/不添虚构人物/.test(NOFAB) || !/书信/.test(NOFAB)) bad.push('写正文的规矩里没写真人主角不添虚构人物、远处的人只书信往来');
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
