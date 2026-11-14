// 错词表进写戏（任务十五、十七，R-233）：开在后唐 930，正文里写了「总兵」「衙役」这类这时还没有的说法，程序打回、告诉模型当时的说法；
// 两可的今义词（清官）不打回；开在明朝 1625，总兵是对的，不打回
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof vocabFaults === 'function');
  const out = await p.evaluate(() => {
    const bad = [], mk = (pol, y) => newSave({ name: '某甲', gender: '男', age: 30, role: '牙将', gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: pol });
    if (!ERAVOCAB.length) return ['游戏里没有错词表'];
    const s1 = mk('后唐', 930), f1 = vocabFaults(s1, '他带着几个衙役去见总兵，商量粮饷。');
    if (!f1.some(x => /总兵/.test(x) && /都指挥使|都头/.test(x))) bad.push('后唐正文写了总兵没打回、或没给当时的说法：' + JSON.stringify(f1));
    if (!f1.some(x => /衙役/.test(x))) bad.push('衙役没打回');
    if (vocabFaults(s1, '此人是个清官。').length) bad.push('两可的今义词也打回了');
    if (vocabFaults(mk('明', 1625), '他去见总兵。').length) bad.push('明朝的总兵也被当错词');
    if (vocabFaults(s1, '他去见都指挥使，商量粮饷。').length) bad.push('当时的说法也被打回');
    return bad;
  });
  errs.push(...out);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
