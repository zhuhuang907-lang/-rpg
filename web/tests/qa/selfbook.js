// 写戏顺手交账、程序自己记（R-243 第二步）：正文末尾【账】几行固定格式，程序拆出来、玩家看不到；照格式落账（过时、地点、钱、人好感、行动单、摘要）；
// 新开的行动单漏报、缺摘要的不认（交回模型全套记）；交账的格式里不放示例数
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof parseAcct === 'function');
  const r = await p.evaluate(() => {
    S = newSave({ name: '胡大彪', gender: '男', age: 35, role: '山寨寨主', gregorianYear: 1813, month: 5, day: 1, place: '曹州府', polity: '清' }); S.turn = 4;
    S.people = { 王二: { favor: 10 } }; S.actsNow = [{ tmp: 't1', type: '令', what: '派人下山打探' }];
    const raw = '寨门外雨还没停。王二掀帘进来，抖着蓑衣上的水。\n\n【幕后】知县已暗中派了捕快。\n【账】\n过：0天4时\n在：曹州府梁山泊\n钱：赏下山探子｜-3\n钱：卖马得银｜12\n人：王二｜5｜办事得力受赏\n单：t1｜办成｜王二带回消息\n要：胡大彪派王二下山打探，得知官府在城里募乡勇。\n下：加固寨门\n下：派人去城里结交窝主\n下：分赃稳住人心';
    const st = splitStory(raw), d = parseAcct(S, st.acct);
    const miss = parseAcct(S, '过：1天0时\n要：只有摘要');   // 新开的 t1 没报
    const nosum = parseAcct({ ...S, actsNow: [] }, '过：1天0时\n钱：买米｜-2');
    const rules = acctRules(S);
    return { text: st.text, hidden: st.hidden, d, miss, nosum, rules, show: showText(raw + '\n【账'), lite: acctLiteOk(S, '派人下山打探', '', null) };
  });
  if (/【账】|过：|钱：/.test(r.text)) errs.push('账露在正文里：' + r.text);
  if (!/捕快/.test(r.hidden) || /过：/.test(r.hidden)) errs.push('幕后与账没分开：' + r.hidden);
  const d = r.d || {};
  if (!r.d) errs.push('合格的账没认');
  else {
    if (d.elapsedHours !== 4 || d.elapsedDays !== 0) errs.push('过时不对：' + JSON.stringify([d.elapsedDays, d.elapsedHours]));
    if (!/梁山/.test(d.nowAt || '')) errs.push('地点不对');
    if (!(d.ledger.length === 2 && d.ledger[0].amount === -3 && d.ledger[1].amount === 12)) errs.push('钱不对：' + JSON.stringify(d.ledger));
    if (!(d.presentNpcs[0] && d.presentNpcs[0].favor === 15)) errs.push('好感没照原值加：' + JSON.stringify(d.presentNpcs));
    if (!(d.actResults[0] && d.actResults[0].state === '办成')) errs.push('行动单没记');
    if (d.hints.length !== 3) errs.push('下一步不是三条');
  }
  if (r.miss) errs.push('新开行动单漏报也认了');
  if (r.nosum) errs.push('缺摘要也认了');
  if (/\d/.test(r.rules.replace(/t\d+/g, ''))) errs.push('交账格式里放了示例数：' + r.rules);
  if (/【账|过：/.test(r.show)) errs.push('流式时半截的账标记露出来');
  if (!r.lite) errs.push('平常的一步没让写戏交账');
  console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
