// 任职年表同名合并验证：唐彦谦/李涛/王溥/刘弘 的生卒与在世
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const out = {};
    for (const [y, pol] of [[930, '唐'], [960, '宋'], [930, '闽']]) {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: pol });
      const T = tenureFor(S, y), L = [];
      for (const t of T) for (const f of arr(t.figures)) if (['唐彦谦', '李涛', '王溥', '刘弘'].includes(f.name)) {
        const st = figState(S, f, y, 6);
        L.push(f.name + ' 生' + (f.born ?? '?') + ' 卒' + (f.died ?? '?') + ' 职' + st.post + ' ' + st.state + ' 帖' + arr(f.posts).length);
      }
      out[y + pol] = [...new Set(L)];
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
