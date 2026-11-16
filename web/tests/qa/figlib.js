// 名臣预制（R-244）：照出没地点年表判断够不够得着——同地的进「够得着」、远处的只当听说、没出生或已死的不出；都城里的名臣，一方之主可遣使相召、外任的官只能写信托人
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof figBlock === 'function');
  const r = await p.evaluate(() => {
    const keep = FIGLIB;
    FIGLIB = [{ era: 't', range: [907, 979], people: [
      { n: '甲臣', tag: '名臣', t: 1, b: 870, d: 940, w: [[900, 925, '魏州', '任节度使'], [926, 940, '洛阳', '在朝']], po: [['天雄军节度使', 915, 925, '后唐']], tr: ['忠直'], br: '甲' },
      { n: '乙将', tag: '名将', t: 1, b: 880, d: 950, w: [[900, 950, '太原', '镇守']], po: [], tr: [], br: '乙' },
      { n: '丙故', tag: '名臣', t: 1, b: 850, d: 910, w: [[880, 910, '魏州', '']], po: [], tr: [], br: '丙' },
      { n: '丁幼', tag: '文士', t: 2, b: 915, d: 970, w: [[930, 970, '魏州', '']], po: [], tr: [], br: '丁' }] }];
    const mk = (y, pl) => { const s = newSave({ name: '张三', gender: '男', age: 30, role: '商人', gregorianYear: y, month: 3, day: 1, place: pl, polity: '后唐' }); return s; };
    const s1 = mk(920, '魏州'), b1 = figBlock(s1);
    const s2 = mk(930, '洛阳'); s2.realm = { capital: '洛阳' };
    const s3 = mk(930, '魏州'); s3.realm = { capital: '洛阳' }; s3.office = { held: true, title: '魏州刺史' };
    const rr = figReach(s3, FIGLIB[0].people[0], 930);
    const out = { b1, b2: figBlock(s2), rr: rr.lv }; FIGLIB = keep; return out;
  });
  if (!/够得着[\s\S]*甲臣/.test(r.b1)) errs.push('920 年魏州：同地的甲臣不在够得着里：' + r.b1);
  if (/够得着[^【]*乙将/.test(r.b1) || !/远处[\s\S]*乙将/.test(r.b1)) errs.push('太原的乙将不该够得着、该算远处：' + r.b1);
  if (/丙故|丁幼/.test(r.b1)) errs.push('已死的丙、才五岁的丁出现了：' + r.b1);
  if (!/甲臣[^\n]*天雄军节度使/.test(r.b1)) errs.push('官职没照任职表写');
  if (!/够得着[\s\S]*甲臣/.test(r.b2)) errs.push('930 年甲臣到了洛阳，在洛阳的主角够不着：' + r.b2);
  if (r.rr !== '可致书') errs.push('外任的魏州刺史对京里的名臣应是「只能写信托人」：' + r.rr);
  // 真数据（五代十国预制第一稿）：930 年洛阳够得着冯道、安重诲；960 年不再有已死的安重诲；卒年不详的郭威 980 年不出
  const real = await p.evaluate(() => { const mk = (y, pl) => newSave({ name: '张三', gender: '男', age: 30, role: '商人', gregorianYear: y, month: 3, day: 1, place: pl, polity: y < 937 ? '后唐' : '北宋' });
    const k = figBlock(mk(930, '杭州')), a = figBlock(mk(930, '洛阳')), b = figuresNow(mk(960, '开封')).map(x => x.f.n), c = figuresNow(mk(979, '开封')).map(x => x.f.n); return { k, a, b, c, n: FIGLIB.reduce((k, R) => k + arr(R.people).length, 0) }; });
  if (!(real.n >= 300)) errs.push('五代十国预制包没嵌进游戏：' + real.n);
  if (!/够得着[\s\S]*冯道/.test(real.a) || !/够得着[\s\S]*安重诲/.test(real.a)) errs.push('930 年洛阳够不着冯道、安重诲：' + real.a.slice(0, 300));
  if (!/够得着[\s\S]*钱镠/.test(real.k)) errs.push('930 年杭州够不着吴越王钱镠（君主没单列进名臣包）：' + real.k.slice(0, 200));
  if (!/李嗣源/.test(real.a)) errs.push('930 年洛阳没有在位的后唐明宗李嗣源');
  if (real.b.includes('安重诲')) errs.push('931 年死的安重诲 960 年还在');
  console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
