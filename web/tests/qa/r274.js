// R-274：并入 zcode 的可执行史事（到点杀、任、易主、改元、立亡）——玩家够得着的不照史硬发：主角是这一国之主的任免、改元归主角；主角手里的城不易主；主角救下的人不杀；史线被改写的不发；别国的照史发
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof actApply === 'function');
  const r = await p.evaluate(() => { const s = newSave({ name: '李从荣', gender: '男', age: 33, role: '后唐皇帝', gregorianYear: 934, month: 4, day: 10, place: '洛阳', polity: '后唐' }); s.idm = 'emperor'; S = s;
    s.people = { 冯道: { role: '宰相' }, 李愚: { role: '宰相' } }; s.territory = [{ place: '魏州' }]; s.fateSaved = { 李愚: 1 };
    const R = {};
    R.office = actApply(s, { y: 934, m: 4, act: [{ office: '中书', who: '冯道', post: '匡国军节度使', polity: '后唐' }] }); R.feng = s.people.冯道.role;
    R.era = actApply(s, { y: 934, m: 4, act: [{ era: '清泰', polity: '后唐' }] }); R.eraLbl = JSON.stringify(s.actEras || []);
    R.own = actApply(s, { y: 934, m: 4, act: [{ own: '魏州', to: '后晋', from: '后唐' }] }); R.wei = ((s.mapOwn || {})[geoStem('魏州')] || {}).owner || '';
    R.kill = actApply(s, { y: 934, m: 4, act: [{ kill: '李愚', how: '卒' }] }); R.yuDead = !!s.people.李愚.dead;
    R.chg = actApply(s, { y: 934, m: 4, status: '已变', act: [{ kill: '冯道' }] }); R.fdDead = !!s.people.冯道.dead;
    R.other = actApply(s, { y: 934, m: 4, act: [{ kill: '马希声', how: '卒' }] }); R.ma = !!(s.people.马希声 || {}).dead;
    { const t = newSave({ name: '李从荣', gender: '男', age: 29, role: '秦王', gregorianYear: 934, month: 1, day: 10, place: '洛阳', polity: '后唐' }); t.actEras = [{ era: '清泰', polity: '后唐', from: 934 }]; R.jan = eraLabel(t, 934); }
    { const L = (y, m) => arr((realmsAt(y, m) || {}).list).map(x => x.name); R.r3 = L(936, 3); R.r12 = L(936, 12); }
    return R; });
  const bad = [];
  if (r.feng !== '宰相') bad.push('主角是后唐皇帝，史书的任免还是改了冯道的官：' + r.feng);
  if (/清泰/.test(r.eraLbl)) bad.push('主角在位，史书上别人的改元照样记进了账：' + r.eraLbl);
  if (r.wei) bad.push('主角手里的魏州照史书易主给了' + r.wei);
  if (r.yuDead) bad.push('主角救下的李愚照史书死了');
  if (r.fdDead) bad.push('被本局改写的史事照样发了');
  if (!r.ma) bad.push('别国的人照史书该死的没死（可执行史事整个不发了）');
  if (/清泰/.test(r.jan)) bad.push('934 年正月年号成了清泰（照史是闵帝应顺）：' + r.jan);
  if (r.r3.includes('后晋') || !r.r3.includes('后唐')) bad.push('936 年三月地图上已经有后晋（史载十一月才立）：' + r.r3.slice(0, 6).join('、'));
  if (!r.r12.includes('后晋') || r.r12.includes('后唐')) bad.push('936 年腊月后唐还在、后晋没有：' + r.r12.slice(0, 6).join('、'));
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
