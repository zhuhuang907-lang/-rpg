// 泄漏探针：同一页里反复 newSave（照 allbtn 的用法），看堆是否无界增长；顺带把可疑全局缓存的大小记出来
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(path.join(__dirname, '../../play.html')));
  await p.waitForFunction(() => typeof partyStart === 'function');
  const ECON = { unit: '贯', rice: 1.2, wage: 0.1, landPrice: 8, yield: 2, rentRate: 0.5, caravan: 500, ransom: 300, protect: 20, cloth: 1, interest: 0.03, myLand: 0, feast: 60, opera: 30, incense: 10, doctor: 20, pay: 1, payOff: 3, juan: 50 };
  await p.evaluate(([E]) => {
    window.__setup = () => {
      S = newSave({ name: '沈宜修', gender: '女', age: 24, role: '绣娘', real: false, gregorianYear: 1757, month: 3, day: 1, place: '苏州', polity: '清' });
      S.money = { cash: 80, unit: '贯' }; S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
      S.econ = { ...E, unit: S.money.unit }; S.popEst = { k: popKey(S), m: {} };
      ORGMSG = ''; ERRMSG = ''; callClaude = async () => ({ text: '{}' }); VIEW = 'game'; TAB = 'people'; render0();
    };
    window.__probe = () => {
      const mb = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1;
      const caches = { GEOIX: typeof GEOIX !== 'undefined' && GEOIX ? GEOIX.size : -1, MAPC_img: Object.keys(MAPC.img).length, MAPC_links: Object.keys(MAPC.links).length, MAPC_P: MAPC.P ? MAPC.P.size : -1 };
      try { caches.popMap = (S.popEst && Object.keys(S.popEst.m).length) || 0; } catch (_) {}
      return { mb, caches };
    };
  }, [ECON]);
  for (let round = 0; round < 6; round++) {
    const r = await p.evaluate(() => { const out = []; for (let i = 0; i < 50; i++) { window.__setup(); if (i % 10 === 0) out.push(window.__probe()); } return out; });
    console.log('round', round, JSON.stringify(r));
    await p.waitForTimeout(300);
  }
  // 全局 gc 不开：看 usedJSHeapSize 是否持续涨（6×50=300 次建档）
  console.log('ERRS', JSON.stringify(errs.slice(0, 5)));
  await b.close();
})().catch(e => { console.log('崩了：' + e.message.slice(0, 120)); process.exit(1); });
