// 学问手艺线（R-184/188）：读书涨学问涨文墨、坐馆月束脩、学徒三年出师落本事、没写书名给提示；名将各身份的按钮都在
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof studyAct === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    const s = { protagonist: { name: '王二', age: 24, role: '读书人' }, clock: { y: 1068, m: 3, d: 5, yearLabel: '熙宁元年' }, place: { polity: '北宋', full: '扬州府江都县' }, people: {}, chat: [], goals: [], money: { unit: '文', cash: 2000 }, econ: { unit: '文', rice: 120, wage: 6, base: { rice: 100, wage: 5 } }, qingyi: 0, renown: 20, household: [], deeds: [], press: [], attrs: {}, skills: {} };
    const realCC = callClaude;
    callClaude = async pr => ({ text: JSON.stringify({ gain: '读到「学而时习之」一章，讲为学当时时温习。', notes: '原来温习比新书要紧' }) });
    // 没写书名
    let r = await studyAct(s, 'read', '');
    if (!/输入框/.test(ORGMSG || '')) bad.push('没写书名该提示：' + ORGMSG);
    // 读书
    r = await studyAct(s, 'read', '论语');
    if (!ORGMSG.includes('论语') || !/学问\+\d/.test(ORGMSG)) bad.push('读书没落账：' + ORGMSG);
    const T = s.study; if (T.wen <= 10) bad.push('学问该涨：' + T.wen);
    if ((s.skills['文墨'] || {}).lv <= 20) bad.push('文墨该+1：' + JSON.stringify(s.skills['文墨']));
    if (!arr(T.books).length || T.books[0].t !== '论语') bad.push('书没入账：' + JSON.stringify(T.books));
    // 买书
    const cash0 = s.money.cash;
    r = await studyAct(s, 'buybook', '资治通鉴');
    if (s.money.cash >= cash0) bad.push('买书该花钱');
    if (!arr(T.books).some(x => x.own && x.t === '资治通鉴')) bad.push('藏书没记：' + JSON.stringify(T.books));
    // 学问不够坐馆
    T.wen = 20;
    r = await studyAct(s, 'teach', '');
    if (!/30/.test(ORGMSG || '')) bad.push('学问20坐馆该被拦：' + ORGMSG);
    // 够了坐馆，月结进账
    T.wen = 45;
    r = await studyAct(s, 'teach', '');
    if (!/束脩/.test(ORGMSG || '')) bad.push('坐馆没成：' + ORGMSG);
    callClaude = realCC;
    const g0 = s.money.cash; const mo = studyMonthly(s);
    if (s.money.cash <= g0 || !mo.join('').includes('束脩')) bad.push('坐馆月结没进账：' + JSON.stringify(mo));
    // 学徒三年出师
    s.clock.m = 1;
    r = await studyAct(s, 'apprentice', '铁匠');
    if (!/拜在/.test(ORGMSG || '')) bad.push('拜师没成：' + ORGMSG);
    s.clock.y = 1069; s.clock.m = 6;
    const mo2 = studyMonthly(s);
    if (!mo2.join('').includes('学铁匠')) bad.push('学徒月结没有帮工零钱：' + JSON.stringify(mo2));
    s.clock.y = 1071; s.clock.m = 2;
    const mo3 = studyMonthly(s);
    if (!mo3.join('').includes('出师')) bad.push('三年满该出师：' + JSON.stringify(mo3));
    if ((s.skills['铁匠'] || {}).lv < 45) bad.push('出师该落本事：' + JSON.stringify(s.skills['铁匠']));
    // 材料行
    const line = studyLine(s);
    if (!line.includes('学问') || !line.includes('藏书')) bad.push('材料没带学问行：' + line.slice(0, 60));
    return bad;
  });
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
