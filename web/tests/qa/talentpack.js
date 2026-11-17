// 人才年表读名臣预制包（R-244）：五代十国预制包盖得住的十年块不请模型；盖不住的照旧问；档案里有包里的人和仕途
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof talentDS === 'function');
  const r = await p.evaluate(async () => {
    const run = async y => { S = newSave({ name: '张守诚', gender: '男', age: 35, role: '绸缎商人', gregorianYear: y, month: 2, day: 1, place: '洛阳', polity: y < 937 ? '后唐' : '北宋' });
      const oc = callClaude; let asks = 0; callClaude = async pr => { if (/人才年表/.test(pr)) { asks++; return { text: JSON.stringify({ people: [{ name: '赵普', born: 922, died: 992, native: '幽州蓟县', now: '在野', temper: '', will: '肯', path: [{ y: 960, post: '枢密直学士' }], source: '宋史·赵普传' }] }) }; } return { text: '{}' }; };
      let n = 0; try { n = await talentDS(S); } catch (_) { } finally { callClaude = oc; }   /* 1300 年模型给的人不合年代会被退、抛错，这里只看问没问 */ return { asks, n, feng: !!(S.dossiers || {})['冯道'], fc: arr(((S.dossiers || {})['冯道'] || {}).career).length }; };
    return { a: await run(925), b: await run(1300) };
  });
  if (r.a.asks !== 0) errs.push('925 年三块都在预制包里，还请了模型 ' + r.a.asks + ' 次');
  if (!r.a.feng || !r.a.fc) errs.push('预制包里的冯道没进人物档案：' + JSON.stringify(r.a));
  if (!(r.b.asks >= 1)) errs.push('1300 年（元，名臣预制包盖不到）没照旧请模型：' + JSON.stringify(r.b));
  // 名臣预制包评过分的人：评定不请模型
  const j = await p.evaluate(async () => { const keep = FIGLIB; FIGLIB = [{ era: 't', range: [907, 979], people: [{ n: '甲臣', tag: '名臣', t: 1, b: 870, d: 940, w: [[900, 940, '洛阳', '']], po: [], st: { 理政: 88, 统兵: 30, 理财: 60, 操守: 75, 忠诚: 90 }, tr: ['忠直'], br: '甲臣为人' }] }];
    S = newSave({ name: '张守诚', gender: '男', age: 35, role: '绸缎商人', gregorianYear: 930, month: 2, day: 1, place: '洛阳', polity: '后唐' }); S.people = { 甲臣: { role: '宰相', seen: 1 } };
    const oc = callClaude; let asks = 0; callClaude = async () => { asks++; return { text: '{}' }; }; let out; try { out = await judgePeople(S, ['甲臣']); } finally { callClaude = oc; FIGLIB = keep; }
    return { asks, out, st: S.people.甲臣.stats, tr: S.people.甲臣.traits }; });
  if (j.asks !== 0 || !j.st || j.st.理政.v !== 88 || j.st.忠诚.v === 90) errs.push('名臣包评过分的人还请了模型、或照抄了包里的忠诚：' + JSON.stringify(j));
  console.log('TALENT', JSON.stringify(r)); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
