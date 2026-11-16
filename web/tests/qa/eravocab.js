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
    for (const [pol, y, ok] of [['魏', 210, '丞相召太守、刺史、都督、尚书令、校尉、中郎将、孝廉、茂才议事。'], ['东晋', 380, '中书令、尚书仆射、刺史、都督、参军、中正、举秀才、孝廉、部曲、坞主都来了。'], ['北魏', 500, '尚书令、侍中、刺史、三长、均田、府兵、典签、中书舍人、镇将都来了。']]) {
      const s = mk(pol, y); if (vocabFaults(s, ok).length) bad.push(`${y} 年这年代有的说法被当错词：` + vocabFaults(s, ok).join('；'));
      if (vocabFaults(s, '他去见知府、节度使，又找了掌柜。').length < 2) bad.push(`${y} 年写了知府、节度使、掌柜没打回`); }   // 三国两晋南北朝错词表（zcode 任务十四、二十七）
    { const f8 = vocabFaults(mk('唐', 800), '他去府里见知府，又托捕快打听。'); if (!f8.length) bad.push('唐末（800 年）写了知府、捕快没打回（唐末错词表没嵌进游戏）'); }
    if (vocabFaults(mk('唐', 800), '他去见节度使，又找了兵马使。').length) bad.push('唐末的节度使、兵马使被当错词');
    if (vocabFaults(s1, '他去见都指挥使，商量粮饷。').length) bad.push('当时的说法也被打回');
    return bad;
  });
  errs.push(...out);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
