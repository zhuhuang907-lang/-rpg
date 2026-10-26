// 舆图：全国州府按当年建置画出来；地盘、各方势力着色；点一处出详情；点省名放大；就地下军令写进下一步
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !BG && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  const r = await p.evaluate(() => { S.clock.y = 1757; TAB = 'map'; SIDE_FOLD = false; render(); return { tabs: tabsFor(S).map(x => x[0]).join(), dots: document.querySelectorAll('.smap [data-mapu]').length, provs: document.querySelectorAll('.smap [data-mapprov]').length }; });
  if (!/map/.test(r.tabs)) bad('平民没有舆图页');
  if (r.dots < 150) bad('全国州府画得太少：' + r.dots);
  if (r.provs < 10) bad('省名太少：' + r.provs);
  // 当个割据一方的：地盘、各方势力、兵马
  const t0 = Date.now();
  await p.evaluate(() => { S.idm = 'warlord'; S.territory = [{ place: '扬州府', pop: 500000, troops: 3000, grain: 20000, loyalty: 60 }]; S.powers = [{ name: '两江督标', leader: '尹继善', seat: '江宁府', land: '苏州府、常州府', troops: '2万', stance: '提防' }]; S.forces = [{ name: '扬州营', leader: S.protagonist.name, troops: 3000, at: '扬州府', status: '驻守' }]; S.battles = [{ when: '三月', place: '镇江府', outcome: '小胜' }]; render(); });
  const ms = Date.now() - t0;
  const r2 = await p.evaluate(() => ({ cells: document.querySelectorAll('.smap rect[fill="var(--zhu)"]').length, txt: document.querySelector('.smap').textContent, leg: document.querySelector('.mlegend').innerText }));
  if (process.env.SHOT) await p.locator('.smap').screenshot({ path: process.env.SHOT + '/world.png' });
  if (r2.cells < 3) bad('地盘没着色');
  if (!/扬州营 3,000/.test(r2.txt)) bad('兵马没标出来');
  if (!/⚔/.test(r2.txt) || !/★/.test(r2.txt)) bad('战场、你在哪没标');
  if (!/两江督标/.test(r2.leg)) bad('图例没有各方势力');
  if (ms > 3000) bad('画舆图太慢：' + ms + 'ms');
  await p.click('.smap circle[data-mapu="江宁府"]');
  const info = await p.evaluate(() => document.querySelector('.affair').innerText);
  if (!/江宁府/.test(info) || !/两江督标/.test(info) || !/离你约\d+里/.test(info)) bad('点了没出详情：' + info);
  await p.click('[data-mapgo="攻"]');
  const pend = await p.evaluate(() => arr(S.armyPending).map(x => x.line).join());
  if (!/扬州营进攻江宁府/.test(pend)) bad('就地下的军令没写进去：' + pend);
  const pv = await p.evaluate(() => [...document.querySelectorAll('.smap [data-mapprov]')].map(x => x.dataset.mapprov));
  if (pv.some(x => /行省|布政|^(唐|清|明)$|使/.test(x))) bad('省名带着别朝名目：' + pv.join());
  await p.click(`.smap [data-mapprov="${pv.includes('江南') ? '江南' : pv[0]}"]`);
  const r3 = await p.evaluate(() => ({ m: MAPZ.mode, n: document.querySelectorAll('.smap circle').length, back: !!document.querySelector('#bMapWorld') }));
  if (r3.m !== 'prov' || !r3.back || r3.n < 20) bad('放大到一省不对：' + JSON.stringify(r3));
  await p.click('#bMapWorld'); if ((await p.evaluate(() => MAPZ.mode)) !== 'world') bad('回不到天下');
  await p.click('.smap circle[data-mapu="扬州府"]', { timeout: 5000 }); await p.click('[data-mapnear]');
  const r4 = await p.evaluate(() => ({ m: MAPZ.mode, n: document.querySelectorAll('.smap circle').length }));
  if (process.env.SHOT) await p.locator('.smap').screenshot({ path: process.env.SHOT + '/near.png' });
  if (r4.m !== 'near' || r4.n < 30) bad('放大这一带不对：' + JSON.stringify(r4));
  await p.click('#bMapWorld');
  // 别的年代：明、宋、唐也画得出来
  for (const y of [1600, 1100, 750, 200]) { const n = await p.evaluate(y => { S.clock.y = y; render(); return document.querySelectorAll('.smap circle[data-mapu]').length; }, y); if (n < 60) bad(y + '年州府太少：' + n); }
  const vis = await p.evaluate(() => document.body.innerText); if (/NaN|undefined|\[object/.test(vis)) bad('页面有坏字');
  console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message.slice(0, 300)])); process.exit(1); });
