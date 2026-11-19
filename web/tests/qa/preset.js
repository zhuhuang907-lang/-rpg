// 开局底账接进游戏（任务四十二，R-244）：史料有户口记载的州郡直接填、不请模型推；推行情时把史料价目交给模型当锚
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof presetPop === 'function');
  const r = await p.evaluate(async () => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '商人', gregorianYear: 750, month: 3, day: 1, place: '长安', polity: '唐' }); S.money = { unit: '文', cash: 5000 };
    const oc = callClaude; let popAsk = '', econAsk = ''; callClaude = async pr => { if (/人口史学者/.test(pr)) { popAsk = pr; return { text: JSON.stringify({ list: [] }) }; } if (/本地行情表|民间行情/.test(pr)) { econAsk = pr; return { text: JSON.stringify({ rice: 200, wage: 30, landPrice: 1500, yield: 1.5, rentRate: 0.5, basis: 'x' }) }; } return { text: '{}' }; };
    try { await popInfer(S); await econDS(S); } finally { callClaude = oc; }
    const filled = Object.entries((S.popEst || {}).m || {}).filter(([, v]) => v && /著录/.test(v.why || ''));
    return { filled: filled.map(([k, v]) => [k, v.hh, v.why]), askedFilled: filled.some(([k]) => popAsk.includes('- ' + k)), anchor: /史料里记下的价目/.test(econAsk) && S.econ && S.econ.rice != null && S.econ.rice !== 200 };   // 史料价目交给模型；米价等有载的直接用包里的，不用模型给的（zcode R-256 降本）
  });
  if (!r.filled.length) errs.push('750 年长安一带史料有户口的州郡没直接填');
  if (r.askedFilled) errs.push('已照史料填了的州郡还拿去问模型');
  if (!r.anchor) errs.push('推行情时没把史料价目交给模型，或有载的米价没直接用包里的');
  console.log('PRESET', JSON.stringify(r.filled.slice(0, 3))); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
