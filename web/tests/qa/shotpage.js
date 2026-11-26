const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  for (const [y, tag] of [[756, '756'], [930, '930']]) {
    await p.evaluate((y) => {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      VIEW = 'game'; TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'world'; MAPZ.follow = false; MAPZ.big = false; render();
    }, y);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `C:/Users/DELL/AppData/Local/Temp/zcode-work/page${tag}.png`, fullPage: true });
    const info = await p.evaluate(() => { const L = document.querySelector('.mlegend'); return { legend: L ? L.innerText.slice(0, 500) : 'none', snips: L ? L.querySelectorAll('span').length : 0 }; });
    console.log(tag, JSON.stringify(info));
  }
  console.log('ERRS', JSON.stringify(errs));
  await b.close();
})();
