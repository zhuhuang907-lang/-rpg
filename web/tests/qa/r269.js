// R-269：后台活轮流来——开局查齐以后每回只做一件，排在单子后面的（国计民生、本地价钱、你的兵马）不能永远轮不上
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof afterTurnPool === 'function');
  const r = await p.evaluate(async () => { const s = newSave({ name: '李从荣', gender: '男', age: 33, role: '皇帝', gregorianYear: 936, month: 1, day: 1, place: '洛阳', polity: '后唐' }); s.settledAt = 1; S = s; BG_STOP = false;
    const ran = [], ids = ['a', 'b', 'c', 'd', 'fisc']; const old = bgJobs;
    bgJobs = () => ids.map(id => ({ id, msg: id, due: () => true, run: async () => { ran.push(s.turn + ':' + id); } }));
    try { for (let t = 2; t <= 7; t++) { s.turn = t; BG_CTX = { s0: s, d: null, g: null }; await afterTurnPool(s); } } finally { bgJobs = old; }
    return ran; });
  const bad = [];
  if (!r.some(x => /:fisc$/.test(x))) bad.push('五件都一直该做，排在最后的那件六回一次没轮上：' + r.join(' '));
  if (r.length > 6) bad.push('一回做了不止一件，花费涨了：' + r.join(' '));
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
