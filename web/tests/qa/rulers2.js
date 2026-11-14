// 南北朝、隋唐前期君主年号（R-226）：君主照正史，年号照哈佛库年号表；只有君主年号的表不挡联网自建史事；
// 换君改元同一年归对人（刘子业永光、景和；武周天授在则天、载初在睿宗）；开局真看界面上的年号
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof rulersAt === 'function');
  const out = await p.evaluate(() => {
    const bad = [], mk = (pol, y, m, place) => newSave({ name: '某甲', gender: '男', age: 30, role: '郎官', gregorianYear: y, month: m, day: 1, place, polity: pol });
    const r = (s, y, m, pol) => rulersAt(y, s, m).find(x => x.polity === pol) || {};
    const s1 = mk('梁', 502, 6, '建康'); const a = r(s1, 502, 6, '梁'); if (a.name !== '萧衍' || a.era !== '天监' || a.n !== 1) bad.push('502 年梁不是萧衍天监元年：' + JSON.stringify(a));
    const w = r(s1, 502, 6, '北魏'); if (w.name !== '元恪' || w.era !== '景明' || w.n !== 3) bad.push('502 年北魏不是元恪景明三年：' + JSON.stringify(w));
    const z = r(s1, 465, 6, '刘宋'); if (!['刘子业', '刘彧'].includes(z.name)) bad.push('465 年刘宋君主不对：' + JSON.stringify(z));
    const zy = rulersAt(465, s1, 6).filter(x => x.polity === '刘宋' && x.name === '刘子业')[0]; if (zy && !['永光', '景和'].includes(zy.era)) bad.push('刘子业的年号不是永光景和：' + JSON.stringify(zy));
    const wz = r(s1, 692, 6, '武周'); if (wz.name !== '武曌') bad.push('692 年没有武曌：' + JSON.stringify(wz));
    const sui = r(s1, 590, 6, '隋'); if (sui.name !== '杨坚' || sui.era !== '开皇' || sui.n !== 10) bad.push('590 年不是杨坚开皇十年：' + JSON.stringify(sui));
    const qi = r(s1, 560, 12, '北齐'); if (qi.name !== '高演' || qi.era !== '皇建') bad.push('560 年末北齐不是高演皇建：' + JSON.stringify(qi));
    if (hasHist(s1)) bad.push('只有君主年号表，却当成了整套内置史料（会挡住联网自建史事）');
    if (!packNeed(s1)) bad.push('南北朝开局不再联网自建史事了');
    if (!/天监/.test(eraLabel(s1, 502) || '')) bad.push('梁 502 年的年号标签不是天监：' + eraLabel(s1, 502));
    S = mk('东魏', 545, 6, '邺'); S.chat = [{ role: 'gm', text: '开场。' }]; window.__lab = eraLabel(S, 545); if (window.__lab) S.clock.yearLabel = window.__lab;   // 开局流程照 eraLabel 写年号（同 15220 行）
    return bad;
  });
  errs.push(...out);
  const lab = await p.evaluate(() => window.__lab || ''); if (!/武定/.test(lab)) errs.push('东魏 545 年年号不是武定：' + lab);
  await p.evaluate(() => { VIEW = 'game'; TAB = 'court'; SIDE_FOLD = false; render0(); });
  const h = await p.evaluate(() => document.body.innerText); if (!/武定/.test(h)) errs.push('开局界面上看不到东魏的年号武定');
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
