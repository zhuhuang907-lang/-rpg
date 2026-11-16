// 少限制（R-242 第三步）：国丧里宴乐、女扮男装应考、没有劫掠名分的人纵兵劫掠——都做得成，后果照时局和身份走（有官身的多半被参、搜检可能看破、治世多半被告），不是一律「不许」
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1800 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof riskPress === 'function');
  // 1 国丧宴乐：真点宴客按钮，办得成、记着国丧；有官身的被告的比白身多
  const m = await p.evaluate(() => { S = newSave({ name: '汪景和', gender: '男', age: 40, role: '扬州盐商', gregorianYear: 1620, month: 8, day: 1, place: '扬州', polity: '明' }); S.chat = [{ role: 'gm', text: '开场' }];
    S.econ = { v: 2, y: 1620, pl: geoCenter(S), unit: '两', feast: 3, opera: 0.5, incense: 0.3, doctor: 0.8, wage: 0.05, pay: 1.5, payOff: 5 }; S.money = { cash: 500, unit: '两' }; S.mourn = { why: '神宗皇帝驾崩', until: Math.floor(ymOf(S.clock)) + 3 };
    VIEW = 'game'; TAB = 'board'; SIDE_FOLD = false; render(); return { mourn: inMourn(S), btn: !!document.querySelector('button[data-priv="feast"]') }; });
  if (!m.mourn) errs.push('没设上国丧'); if (!m.btn) errs.push('没有宴客按钮');
  else { await p.click('button[data-priv="feast"]'); const r = await p.evaluate(() => ({ cash: S.money.cash, last: JSON.stringify(arr(S.lifeLog || S.life).slice(-1)) + document.body.innerText.slice(0, 0) })); if (!(r.cash < 500)) errs.push('国丧里宴客还是办不了：' + JSON.stringify(r)); }
  const rate = await p.evaluate(() => { const go = ofc => { let n = 0; for (let t = 1; t <= 120; t++) { S.turn = t; S.press = []; S.priv = {}; S.money.cash = 500; S.office = ofc ? { held: true, title: '知县' } : null; privAct(S, 'feast'); if (arr(S.press).some(x => /国丧宴乐/.test(x.title))) n++; } return n / 120; }; return { ofc: go(true), min: go(false) }; });
  if (!(rate.ofc > rate.min + 0.2)) errs.push('有官身的国丧宴乐被告不比白身多：' + JSON.stringify(rate));
  if (!(rate.min < 0.4 && rate.ofc < 0.9)) errs.push('国丧宴乐几乎必被告（成了善恶有报）：' + JSON.stringify(rate));
  // 2 女扮男装应考：不再一句「女子不能应科举」；有时看破、有时混过去
  const ex = await p.evaluate(() => { let caught = 0, through = 0, msgs = new Set(); for (let t = 1; t <= 60; t++) { S = newSave({ name: '黄崇嘏', gender: '女', age: 20, role: '士人', gregorianYear: 1600, month: 2, day: 1, place: '苏州', polity: '明' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = t; S.money = { cash: 500, unit: '两' }; ORGMSG = '';
      examApply(S); msgs.add(String(ORGMSG).slice(0, 12)); if (arr(S.press).some(x => /女扮男装/.test(x.title))) caught++; else if (S.examDisguise === true) through++; } return { caught, through, msgs: [...msgs], old: [...msgs].some(x => /不能应科举/.test(x)) }; });
  if (ex.old) errs.push('还在说女子不能应科举');
  // 真点「女扮男装去应考」按钮
  const bt = await p.evaluate(() => { S = newSave({ name: '黄崇嘏', gender: '女', age: 20, role: '士人', gregorianYear: 1600, month: 2, day: 1, place: '苏州', polity: '明' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 2; S.money = { cash: 500, unit: '两' }; VIEW = 'game'; TAB = 'career'; SIDE_FOLD = false; render0(); return !!document.querySelector('#bExam'); });
  if (!bt) errs.push('女子页上没有「女扮男装去应考」'); else { await p.click('#bExam'); if (!(await p.evaluate(() => !!S.examDisguise))) errs.push('点了女扮男装去应考没反应'); }
  if (!(ex.caught > 3 && ex.through > 20)) errs.push('女扮男装应考没有「多半混过、有时看破」：' + JSON.stringify(ex));
  // 3 纵兵劫掠：riskPress 治世七成、乱世三成
  const rp = await p.evaluate(() => { const go = y => { S = newSave({ name: '张三', gender: '男', age: 30, role: '游击将军', gregorianYear: y, month: 5, day: 1, place: '开封', polity: y < 1127 ? '北宋' : '南宋' }); let n = 0; for (let t = 1; t <= 120; t++) { S.turn = t; S.press = []; if (riskPress(S, '纵兵劫掠被人参了', '言官', 'x', bandLoose(y) ? 0.3 : 0.7, 3)) n++; } return n / 120; }; return { peace: go(1040), loose: go(1127) }; });
  if (!(rp.peace > rp.loose)) errs.push('乱世纵兵劫掠被参不比治世少：' + JSON.stringify(rp));
  console.log('LESSBAN', JSON.stringify({ rate, ex: { caught: ex.caught, through: ex.through }, rp })); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
