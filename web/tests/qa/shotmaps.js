const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  for (const [y, tag, mode, c, span] of [[1800, '1800w', 'world', null, 0], [500, '500w', 'world', null, 0]]) {
    await p.evaluate(({ y, mode, c, span }) => {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      VIEW = 'game'; TAB = 'map'; MAPZ.inited = true; MAPZ.mode = mode; MAPZ.c = c; MAPZ.span = span; MAPZ.follow = false; MAPZ.big = false; render();
    }, { y, mode, c, span });
    await p.waitForTimeout(700);
    const el = await p.$('svg.smap');
    if (!el) { console.log(tag, 'no svg'); continue; }
    await el.screenshot({ path: `C:/Users/DELL/AppData/Local/Temp/zcode-work/map${tag}.png` });
    const r = await p.evaluate(() => { const svg = document.querySelector('svg.smap'); return { pats: svg ? [...svg.querySelectorAll('pattern')].map(x => x.id) : [], rects: svg ? svg.querySelectorAll('rect').length : 0, txt: (svg && svg.textContent || '').slice(0, 80) }; });
    console.log(tag, JSON.stringify(r));
  }
  console.log('ERRS', JSON.stringify(errs));
  await b.close();
})();
