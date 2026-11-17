// R-252：跨两段的同一名臣只出一个；到史载卒年不再出场；主角亲手救下（正文写救下、拦下刺杀）的记进存档，往后照常出场
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof fateCheck === 'function');
  const r = await p.evaluate(() => {
    const keep = FIGLIB;
    FIGLIB = [{ era: 'a', range: [581, 711], people: [{ n: '姚甲', tag: '名臣', t: 1, b: 650, d: 721, w: [[690, 711, '洛阳', '']], po: [] }] },
              { era: 'b', range: [712, 906], people: [{ n: '姚甲', tag: '名臣', t: 1, b: 650, d: 721, w: [[712, 721, '长安', '']], po: [] }, { n: '乙将', tag: '名将', t: 1, b: 680, d: 730, w: [[700, 730, '长安', '']], po: [] }] }];
    const mk = y => newSave({ name: '张三', gender: '男', age: 30, role: '士人', gregorianYear: y, month: 3, day: 1, place: '长安', polity: '唐' });
    const s1 = mk(713), once = figuresNow(s1).filter(x => x.f.n === '姚甲'), at = once[0] && figAt(once[0].f, 713);
    const s2 = mk(731), dead = figuresNow(s2).some(x => x.f.n === '乙将');
    const s3 = mk(730); const no = fateCheck(s3, '乙将', '乙将病重，没救过来'); const yes = fateCheck(s3, '乙将', '你请来名医，救下了乙将的性命'); s3.clock.y = 735; const alive = figuresNow(s3).some(x => x.f.n === '乙将');
    FIGLIB = keep; return { n: once.length, place: at && at.place, dead, no, yes, alive };
  });
  if (r.n !== 1) errs.push('跨两段的同一人出了 ' + r.n + ' 个');
  if (r.place !== '长安') errs.push('去重没取这一年有地点的那份：' + r.place);
  if (r.dead) errs.push('730 年卒的人 731 年还在');
  if (r.no) errs.push('「没救过来」也当救下了');
  if (!r.yes || !r.alive) errs.push('救下的人没记进存档、或过了卒年就不见了：' + JSON.stringify(r));
  console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
