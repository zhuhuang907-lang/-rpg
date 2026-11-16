// 户口只推主角身边（R-243 省钱）：近处六十个府州推完就不再挨批推天下；主角走到远处，那边近处的没推过才再推
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof popTodo === 'function');
  const r = await p.evaluate(() => {
    S = newSave({ name: '张守诚', gender: '男', age: 35, role: '绸缎商人', gregorianYear: 930, month: 2, day: 1, place: '洛阳', polity: '后唐' });
    const t0 = popTodo(S); S.popEst = { k: popKey(S), m: {} }; for (const u of t0) S.popEst.m[u.n] = { hh: 1, pop: 5 };
    const after = popTodo(S).length, due = popDue(S);
    S.place.full = '广州'; S.at = '广州'; const far = popTodo(S).length;
    return { first: t0.length, after, due, far };
  });
  if (!(r.first > 10)) errs.push('开局近处没排出要推的府州：' + JSON.stringify(r));
  if (r.after !== 0 || r.due) errs.push('近处推完了还接着推天下：' + JSON.stringify(r));
  if (!(r.far > 0)) errs.push('走到广州，那边近处没推过的没再排上：' + JSON.stringify(r));
  console.log('POP', JSON.stringify(r)); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
