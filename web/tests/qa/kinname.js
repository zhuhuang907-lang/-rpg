// 家里人不许叫「某」（硬规矩：真名或照制度起名）：开局、记账带进来的「韩某」「卢某」「某」都起个名，男丁随主角的姓；族谱页上也看不到「某」（试玩查出：族谱里父亲叫「韩某」）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof newSave === 'function');
  const bad = await p.evaluate(() => { const bad = [];
    const s = newSave({ name: '韩熙', gender: '男', age: 32, role: '监察御史', gregorianYear: 930, month: 3, day: 1, place: '洛阳', polity: '后唐', household: [{ relation: '父', name: '韩某' }, { relation: '母', name: '王氏' }, { relation: '妻', name: '卢某' }, { relation: '子', name: '某' }] });
    const H = s.household.map(m => [m.relation, m.name]);
    if (H.some(([, n]) => /某/.test(n))) bad.push('开局带进来的家里人还叫「某」：' + JSON.stringify(H));
    const fa = H.find(([r]) => r === '父'), so = H.find(([r]) => r === '子'), wi = H.find(([r]) => r === '妻');
    if (!fa || !fa[1].startsWith('韩') || fa[1].length < 2) bad.push('父亲没随主角的姓起名：' + JSON.stringify(fa));
    if (!so || !so[1].startsWith('韩')) bad.push('儿子没随主角的姓起名：' + JSON.stringify(so));
    if (!wi || !wi[1].startsWith('卢')) bad.push('妻子原写的姓卢丢了：' + JSON.stringify(wi));
    if (!H.some(([r, n]) => r === '母' && n === '王氏')) bad.push('「王氏」这种称法不该改');
    const real = realNamesAll(); if (H.some(([, n]) => n !== '王氏' && real.has(n))) bad.push('起的名撞了史书真人：' + JSON.stringify(H));
    S = s; TAB = 'people'; render(); const side = (document.querySelector('.side') || {}).innerText || '';
    if (/韩某|卢某/.test(side)) bad.push('族谱页上还看得到「某」');
    return bad; });
  errs.push(...bad); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
