// 开局物价照底账（R-256，zcode 未经审查直推的那版查出两处）：纺织月收入（cloth）不能丢；别的大区的价目不能当本地的史料载值
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof econDS === 'function' && typeof presetPrices === 'function');
  const out = await p.evaluate(async () => {
    const bad = [], oc = callClaude, asked = [];
    callClaude = async (q) => { asked.push(q); return { text: JSON.stringify({ rice: 0.7, wage: 0.06, landPrice: 2, yield: 1.5, rentRate: 0.5, caravan: 50, ransom: 30, protect: 2, cloth: 0.3, interest: 0.04, myLand: 0, juan: 100, pay: 1.5, payOff: 4, feast: 0.5, opera: 0.05, incense: 0.03, doctor: 0.2, basis: '推' }) }; };
    const mk = () => { const s = newSave({ name: '周铁山', gender: '男', age: 21, role: '楚国牙军小卒', gregorianYear: 945, month: 5, day: 5, place: '潭州', polity: '楚' }); s.chat = [{ role: 'gm', text: '开场。' }]; return s; };
    const keep = PRESETLIB.slice();
    try {
      const s1 = mk(); let reg = ''; try { reg = PRESET_REG[bigRegOf(hereXY(s1))] || bigRegOf(hereXY(s1)); } catch (_) {}
      // 1 本区有载：照载用，纺织月收入照样有
      PRESETLIB.length = 0; PRESETLIB.push({ range: [907, 979], prices: [{ from: 937, to: 946, region: reg, rice: 650, wage: 55, landPrice: 1800, yield: 1.6, rentRate: 0.5, src: '测' }] });
      const E1 = await econDS(s1);
      if (E1.unit === '文' && E1.rice !== 650) bad.push('本区有载的米价没照载用：' + E1.rice);
      if (!(E1.cloth > 0)) bad.push('纺织月收入（cloth）丢了：' + JSON.stringify(E1));
      // 本位是两（或贯）：底账的米价照文折成本位；AI 照本位给的酒席钱不许再被除一千
      if (/^(两|贯|缗)$/.test(E1.unit) && Math.abs(E1.rice - 0.65) > 0.001) bad.push('底账米价没照文折成' + E1.unit + '：' + E1.rice);
      if (/^(两|贯|缗)$/.test(E1.unit) && E1.feast !== 0.5) bad.push('AI 照本位给的酒席钱被再折了一回：' + E1.feast);
      // 2 本区没载、别的大区有载：不能当本地的史料载值，照推（别区的只作参照）
      const s2 = mk(); PRESETLIB.length = 0; PRESETLIB.push({ range: [907, 979], prices: [{ from: 937, to: 946, region: reg === '关中' ? '岭南' : '关中', rice: 99, wage: 9, landPrice: 999, yield: 9, rentRate: 0.9, src: '别区' }] });
      const E2 = await econDS(s2);
      if (E2.rice === 99 || /史料载值/.test(E2.src || '')) bad.push('别的大区的价目当成了本地的史料载值：' + JSON.stringify({ rice: E2.rice, src: E2.src }));
    } finally { PRESETLIB.length = 0; PRESETLIB.push(...keep); callClaude = oc; }
    return bad;
  });
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
