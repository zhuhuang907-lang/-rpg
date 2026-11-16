// 唐后期、两宋宰执逐年接进游戏（R-244，任务三十三、三十四）：官制树照旧，到了年份真人坐上对得上的宰相、执政位子；1070 王安石、1140 秦桧
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof courtTable === 'function');
  const r = await p.evaluate(() => {
    const go = (y, pol, place, office) => { S = newSave({ name: '张三', gender: '男', age: 30, role: '士人', gregorianYear: y, month: 6, day: 1, place, polity: pol });
      const ids = tenureFor(S, y).map(t => t.id);
      S.org = { nodes: [{ id: 'root', name: '朝廷', depth: 0, posts: [] }, { id: 'a', name: '中书门下', depth: 1, parent: 'root', posts: [{ title: office, rank: '', quota: 3, holder: '', others: [] }] }] };
      const T = courtTable(S, y); const q = S.org.nodes[1].posts[0]; return { ids, seated: [q.holder].concat(q.others || []).filter(Boolean), names: T.map(x => x.name).slice(0, 30) }; };
    return { a: go(1070, '北宋', '开封', '同中书门下平章事'), b: go(1140, '南宋', '临安', '尚书左仆射、同中书门下平章事'), c: go(870, '唐', '长安', '同中书门下平章事') };
  });
  if (!r.a.ids.includes('song-zaifu')) errs.push('1070 北宋没读两宋宰执表：' + JSON.stringify(r.a.ids));
  if (!r.a.seated.includes('王安石') && !r.a.names.includes('王安石')) errs.push('1070 年王安石没坐上宰相：' + JSON.stringify(r.a));
  if (!r.b.ids.includes('song-zaifu')) errs.push('1140 南宋没读两宋宰执表');
  if (!r.b.names.includes('秦桧')) errs.push('1140 年秦桧不在朝堂：' + JSON.stringify(r.b));
  if (!r.c.ids.includes('tanghou-zaifu')) errs.push('870 唐没读唐后期宰相表：' + JSON.stringify(r.c.ids));
  console.log('ZAIFU', JSON.stringify(r).slice(0, 600)); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
