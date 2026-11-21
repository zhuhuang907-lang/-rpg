// R-267：玩家截图「玩不下去」——王子的身份被当成君主（楚王马殷第四子成了楚王）、家资（粮）（田）都填成现钱、私财和现钱两个数、体检把这些记进问题报告；局面页真看
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof healthCheck === 'function');
  const bad = [];
  const r = await p.evaluate(() => { const mk = role => { const s = newSave({ name: '马希范', gender: '男', age: 27, role, gregorianYear: 925, month: 9, day: 15, place: '长沙', polity: '楚' }); s.place.polity = '楚'; return s; };
    const R = {};
    for (const role of ['楚王马殷第四子，武安军节度判官', '楚王马殷第四子', '吴越王钱镠之孙', '晋王李克用长子', '节度使李克用之子']) R[role] = identityOf(mk(role)).ruler;
    R.king = identityOf(mk('楚王')).ruler; R.king2 = identityOf(mk('楚王马殷')).ruler;
    R.tag = identityOf(mk('楚王马殷第四子')).tags;
    const s = mk('楚王马殷第四子'); s.money = { unit: '贯', cash: 4000 }; s.meters = { '家资（钱）': { value: '30贯' }, '家资（粮）': { value: '30贯' }, '家资（田）': { value: '30贯' }, 私财: { value: '500贯' } };
    s.turn = 5; R.hc = healthCheck(s); S = s; VIEW = 'game'; SIDE_FOLD = false; TAB = 'board'; render0(); return R; });
  for (const k of ['楚王马殷第四子，武安军节度判官', '楚王马殷第四子', '吴越王钱镠之孙', '晋王李克用长子', '节度使李克用之子']) if (r[k]) bad.push(`「${k}」被当成一方之主`);
  if (!r.king || !r.king2) bad.push('真楚王反倒不算一方之主');
  if (!r.tag.includes('贵')) bad.push('王子没记成贵：' + r.tag);
  if (!r.hc.some(x => /家资（粮）.*钱数/.test(x))) bad.push('体检没查出粮写成钱：' + r.hc.join(' / '));
  const txt = await p.evaluate(() => document.querySelector('#side, .side, aside') ? (document.querySelector('#side, .side, aside')).innerText : document.body.innerText);
  if (/家资（粮）\s*\n?\s*4,?000贯|家资（田）\s*\n?\s*4,?000贯/.test(txt)) bad.push('局面页把粮、田填成了现钱');
  if (/私财\s*\n?\s*500贯/.test(txt)) bad.push('局面页的私财和现钱是两个数');
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
