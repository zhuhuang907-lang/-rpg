// 自己改的元程序接着数（R-169 小错）：以前过一回就被史书年号盖掉；改元后过年变「二年」，AI 写别的年号也不盖
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof founding === 'function');
  const bad = [];
  const r = await p.evaluate(() => { S = newSave({ name: '朱元璋', gender: '男', age: 40, role: '吴王', real: true, gregorianYear: 1367, month: 12, day: 20, place: '应天', polity: '吴' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    founding(S, '大明', '洪武', '应天'); const a = S.clock.yearLabel;
    applyReply(S, { reply: '过了年。', mode: 'play', elapsedDays: 20, yearLabel: '至正二十八年' }, '过年'); const b = S.clock.yearLabel;
    S.clock.y++; applyReply(S, { reply: '又过一年。', mode: 'play', elapsedDays: 1 }, '过一年'); return { a, b, c: S.clock.yearLabel, y: S.clock.y }; });
  if (!/洪武元年/.test(r.a) || !/洪武二年/.test(r.b) || !/洪武三年/.test(r.c)) bad.push('改元后年号没接着数：' + JSON.stringify(r));
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
