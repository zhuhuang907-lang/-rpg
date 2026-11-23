// 精准复现 allbtn 崩溃：女子·people·study 按钮，逐个点、记堆、抓崩点
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  p.on('crash', () => errs.push('TAB CRASHED'));
  await p.goto('file://' + path.resolve(path.join(__dirname, '../../play.html')));
  await p.waitForFunction(() => typeof partyStart === 'function');
  const ECON = { unit: '贯', rice: 1.2, wage: 0.1, landPrice: 8, yield: 2, rentRate: 0.5, caravan: 500, ransom: 300, protect: 20, cloth: 1, interest: 0.03, myLand: 0, feast: 60, opera: 30, incense: 10, doctor: 20, pay: 1, payOff: 3, juan: 50 };
  const mk = () => p.evaluate(([E]) => {
    S = newSave({ name: '沈宜修', gender: '女', age: 24, role: '绣娘', real: false, gregorianYear: 1757, month: 3, day: 1, place: '苏州', polity: '清' });
    S.money = { cash: 80, unit: '贯' }; S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.econ = { ...E, unit: S.money.unit }; S.popEst = { k: popKey(S), m: {} };
    ORGMSG = ''; ERRMSG = ''; callClaude = async () => ({ text: '{}' }); VIEW = 'game'; TAB = 'people'; render0();
  }, [ECON]);
  await mk();
  const n = await p.$$eval('.side .pane button', xs => xs.map((x, i) => ({ i, lab: (x.textContent || '').trim() })));
  console.log('BUTTONS', JSON.stringify(n));
  for (const { i, lab } of n) {
    try {
      await mk();
      await p.evaluate(i => { const x = document.querySelectorAll('.side .pane button')[i]; const d = x.closest('details'); if (d) d.open = true; x.click(); }, i);
      await p.waitForTimeout(400);
      const m = await p.evaluate(() => ({ msg: (ORGMSG || '') + (ERRMSG || ''), heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1 }));
      console.log('OK', i, lab, JSON.stringify(m));
    } catch (e) { console.log('KILLER', i, lab, e.message.slice(0, 80)); break; }
  }
  console.log('ERRS', JSON.stringify(errs.slice(0, 6)));
  await b.close();
})().catch(e => { console.log('崩了：' + e.message.slice(0, 120)); process.exit(1); });
