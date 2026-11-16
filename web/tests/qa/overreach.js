// 越权不再一律办不成（R-242 第三步）：掷一回，皇帝有兵名望高的多成、白身少成；成了事后多半被参「擅权」（乱世少些）；
// 行动单照掷出的结果写「办得成」或「走漏风声」
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof overRoll === 'function');
  const r = await p.evaluate(() => {
    const mk = (role, y, renown) => { const s = newSave({ name: role === '皇帝' ? '赵祯' : '张三', gender: '男', age: 30, role, real: role === '皇帝', gregorianYear: y, month: 5, day: 1, place: '开封', polity: '北宋' }); s.renown = renown; return s; };
    const rate = s => { let ok = 0; for (let t = 1; t <= 200; t++) { s.turn = t; if (overRoll(s, '擅开官仓放粮', t % 3) === 'ok') ok++; } return ok / 200; };
    const press = s => { let n = 0; for (let t = 1; t <= 200; t++) { s.turn = t; s.press = []; overPress(s, { what: '擅开官仓放粮' + 'x'.repeat(t % 5) }); if (arr(s.press).some(x => /擅权/.test(x.title))) n++; } return n / 200; };
    const emp = mk('皇帝', 1040, 80), min = mk('农夫', 1040, 0);
    const lines = (over) => { const s = mk('农夫', 1040, 0); s.actsNow = [{ tmp: 't1', type: '试', what: '擅开官仓放粮', ok: '越权', over }]; return actBlock(s); };
    // 去重：已有临门的擅权弹章不再叠
    const s2 = mk('农夫', 1040, 0); s2.press = []; for (let t = 1; t <= 30; t++) { s2.turn = t; overPress(s2, { what: '擅开官仓放粮' }); }
    return { emp: rate(emp), min: rate(min), pPeace: press(mk('农夫', 1040, 0)), pLoose: press(mk('农夫', 1127, 0)), okTxt: lines('ok'), noTxt: lines('no'), dup: arr(s2.press).filter(x => /擅权/.test(x.title)).length };
  });
  if (!(r.emp > r.min + 0.15)) errs.push('皇帝越权不比白身容易成：' + r.emp + ' vs ' + r.min);
  if (!(r.min > 0.1)) errs.push('白身越权几乎全不成（还是一律办不成）：' + r.min);
  if (!(r.emp <= 0.85)) errs.push('越权十拿九稳，没有风险：' + r.emp);
  if (!(r.pPeace > 0.4 && r.pPeace < 0.8)) errs.push('太平年越权被参的比例不对：' + r.pPeace);
  if (!(r.pLoose < r.pPeace)) errs.push('乱世被参不比太平少：' + r.pLoose + ' vs ' + r.pPeace);
  if (!/办得成/.test(r.okTxt)) errs.push('掷成了行动单没写办得成');
  if (!/走漏风声|顶回去/.test(r.noTxt)) errs.push('掷不成行动单没写顶回去');
  if (r.dup > 1) errs.push('擅权弹章重复叠了' + r.dup + '本');
  console.log('OVER', JSON.stringify({ emp: r.emp, min: r.min, pPeace: r.pPeace, pLoose: r.pLoose })); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
