// 地图联上后台知识：点图上一处，看这年这里的长官（长官表）、名臣在此（名臣包，同地的能一键去拜访）、这一年此地史事（内置史料）；真点「去拜访」写进输入框
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1800 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof placeLore === 'function');
  const r = await p.evaluate(() => {
    S = newSave({ name: '张守诚', gender: '男', age: 35, role: '绸缎商人', gregorianYear: 930, month: 3, day: 1, place: '洛阳', polity: '后唐' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 2;
    const lore = placeLore(S, '洛阳'), off = OFFLIB.reduce((k, R) => k + arr(R.seats).length, 0), bian = officialsAt(S, '汴州', 920);
    VIEW = 'game'; TAB = 'map'; SIDE_FOLD = false; render0(); MAPZ.sel = (mapUnits(S).L2.find(u => /河南/.test(u.n)) || { n: '洛阳' }).n; render0(); /* 先画一回让地图起好，再选中一处 */ const panel = document.body.innerText;
    return { lore, off, bian, panel: /此地人物与史事/.test(panel), btn: !!document.querySelector('[data-fig="visit"]') };
  });
  if (!(r.off >= 100)) errs.push('地方长官表没嵌进游戏：' + r.off);
  if (!/冯道|安重诲|李嗣源/.test(r.lore)) errs.push('930 年洛阳没列出在此的名臣：' + r.lore.slice(0, 200));
  if (!r.bian.length) errs.push('920 年汴州长官表里查不到长官');
  if (!r.panel) errs.push('地图上点河南府（洛阳），详情里没有「此地人物与史事」');
  if (!r.btn) errs.push('同地的名臣没有「去拜访」按钮');
  else { await p.click('[data-fig="visit"]'); const v = await p.evaluate(() => ($('#said') || {}).value || ''); if (!/去拜访/.test(v)) errs.push('点了去拜访，输入框里没写上：' + v); }
  console.log('MAPLORE', JSON.stringify({ off: r.off, bian: r.bian })); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
