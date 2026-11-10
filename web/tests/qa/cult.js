// 文化线（R-178）：评文给甲乙丙下四等且真涨文望清议名声、没写诗文给提示；雅集花钱请本地人、情分涨；结文社、会文；材料带文墨行
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof cultAct === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    const s = { protagonist: { name: '王二', age: 24, role: '读书人' }, clock: { y: 1068, m: 3, d: 5, yearLabel: '熙宁元年' }, place: { polity: '北宋', full: '扬州府江都县' }, people: { 张秀才: { local: true, favor: 10, role: '本县教谕' } }, chat: [], goals: [], money: { unit: '文', cash: 500 }, qingyi: 0, renown: 30, household: [], deeds: [], press: [] };
    // 没写诗文就点：要提示
    let r = await cultAct(s, 'poem', '');
    if (!/输入框/.test(ORGMSG || '')) bad.push('没写诗文该提示写进输入框：' + ORGMSG);
    // 评文：mock callClaude 照诗长短给等第
    const realCC = callClaude;
    callClaude = async (pr) => ({ text: /床前明月光/.test(pr) ? JSON.stringify({ grade: '甲', note: '语浅情深，可传诵' }) : JSON.stringify({ grade: '丙', note: '平平之作' }) });
    r = await cultAct(s, 'poem', '床前明月光，疑是地上霜。');
    if (!ORGMSG || !ORGMSG.includes('甲')) bad.push('好诗没得甲：' + ORGMSG);
    const C = s.cult;
    if (C.wen < 8) bad.push('甲等文望该+8：' + C.wen);
    if ((s.qingyi || 0) < 3) bad.push('甲等清议该+3：' + s.qingyi);
    if ((s.renown || 0) < 38) bad.push('甲等名声该+8：' + s.renown);
    if (!arr(C.works).length || C.works[0].grade !== '甲') bad.push('作品没入账：' + JSON.stringify(C.works));
    // 平平的
    r = await cultAct(s, 'poem', '今日无事，出门看看。');
    if (!ORGMSG.includes('丙')) bad.push('普通话没得丙：' + ORGMSG);
    // 雅集：花钱、本地真人情分涨
    const cash0 = s.money.cash, fav0 = s.people['张秀才'].favor;
    r = await cultAct(s, 'gather', '');
    if (s.money.cash >= cash0) bad.push('雅集该花钱');
    if (s.people['张秀才'].favor <= fav0) bad.push('到场的人情分该涨');
    if (!ORGMSG.includes('雅集')) bad.push('雅集没落账：' + ORGMSG);
    // 同月第二场：拦
    r = await cultAct(s, 'gather', '');
    if (!/俗了/.test(ORGMSG || '')) bad.push('同月再办该拦：' + ORGMSG);
    // 结社、会文
    r = await cultAct(s, 'society', '平山堂社');
    if (!s.cult.society || s.cult.society.name !== '平山堂社') bad.push('文社没结成：' + ORGMSG);
    r = await cultAct(s, 'meet', '');
    if (!ORGMSG.includes('会文')) bad.push('会文没落账：' + ORGMSG);
    r = await cultAct(s, 'meet', '');
    if (!/已经会过/.test(ORGMSG || '')) bad.push('同月再会文该拦：' + ORGMSG);
    // 材料行
    const line = cultLine(s);
    if (!line.includes('文望') || !line.includes('平山堂社')) bad.push('材料里没带文墨行：' + line.slice(0, 80));
    callClaude = realCC;
    return bad;
  });
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
