// 人走到哪，地图跟到哪：出门办事（不搬家）地图换成所在地一带、家用方框标出、离家多远；地名库里对不上的地名（京师）照这个年代查出当时的县名再画；回家地图换回来；不同年代用当年的州县
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('dialog', d => d.accept());
  const bad = m => errs.push(m);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !BG && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  await p.waitForFunction(() => S.geo && S.geo.units.length > 3, null, { timeout: 60000 }).catch(() => bad('开局后没画出地图'));
  const g0 = await p.evaluate(() => S.geo && S.geo.here.name);
  const go = async t => { await p.fill('#said', t); await p.click('#bSend'); if (!(await idle())) bad('卡住：' + t); await p.waitForTimeout(500); };
  await go('坐船去苏州办一批绸缎');
  const st1 = await p.evaluate(() => ({ at: S.at, home: S.place.full, head: (S.chat.slice(-1)[0].cur || {}).head || '' }));
  if (st1.at !== '苏州府吴县') bad('出门到了苏州，没记下人在哪：' + JSON.stringify(st1));
  if (!/扬州/.test(st1.home)) bad('只是出门办事，现居地却变了：' + st1.home);
  if (!/苏州|吴县/.test(st1.head)) bad('第一行的地点没跟着人走：' + st1.head);
  // 界面跟着变：顶上状态栏写此刻所在、年岁、身份，这一回的变化摆在正文顶上
  const ui = await p.evaluate(() => ({ st: document.querySelector('#statusLine').innerText, delta: [...document.querySelectorAll('.delta')].map(x => x.innerText).pop() || '' }));
  if (!/在苏州府吴县（出门在外）/.test(ui.st) || !/\d+岁/.test(ui.st)) bad('顶上状态栏没跟着变：' + ui.st);
  if (!/到了苏州府吴县/.test(ui.delta) || !/过了\d+天/.test(ui.delta)) bad('正文顶上没写这一回的变化（到了哪、过了几天）：' + ui.delta);
  await p.waitForFunction(() => S.geo && S.geo.place === '苏州府吴县', null, { timeout: 60000 }).catch(() => {});
  const g1 = await p.evaluate(() => S.geo && { here: S.geo.here.name, place: S.geo.place, y: S.geo.y });
  if (!g1 || g1.place !== '苏州府吴县' || g1.here === g0) bad('到了苏州，地图没换：' + JSON.stringify(g1) + ' 原来 ' + g0);
  await p.click('[data-tab="geo"]').catch(() => {}); await p.waitForTimeout(800);
  const vis = await p.evaluate(() => document.body.innerText);
  if (!/出门在外；家在/.test(vis) || !/离家约\d+里/.test(vis)) bad('地理页没写出门在外、离家多远');
  if (!(await p.$('svg rect title'))) bad('地图上没标出家');
  // 地名库里没有「京师」这个名字：照这个年代查出当时的县名再画
  await p.click('[data-tab="board"]').catch(() => {});
  await go('去京师投亲');
  await p.waitForFunction(() => S.geo && S.geo.place === '京师', null, { timeout: 60000 }).catch(() => {});
  const g2 = await p.evaluate(() => S.geo && { here: S.geo.here.name, place: S.geo.place, alias: (S.geoAlias || {})['京师'] });
  if (!g2 || g2.place !== '京师' || !/大兴|宛平|顺天/.test(g2.here)) bad('到了京师，地图没换到大兴宛平一带：' + JSON.stringify(g2));
  await go('回扬州家里');
  const st3 = await p.evaluate(() => ({ at: S.at, geo: S.geo && S.geo.here.name }));
  if (st3.at) bad('回了家，还记着出门在外：' + st3.at);
  await p.waitForFunction(g => S.geo && S.geo.here.name === g, g0, { timeout: 60000 }).catch(() => bad('回家后地图没换回来：' + st3.geo));
  // 不同年代州县不同：同一处换个年代，地图照那个年代重画
  const yr = await p.evaluate(async () => { S.clock.y += 40; const g = await ensureGeo(S, []); return g ? g.y : null; });
  if (yr == null || Math.abs(yr - (await p.evaluate(() => S.clock.y))) > 0) bad('过了几十年，地图没照新年代重画');
  console.log('GEO', g0, JSON.stringify(g1), JSON.stringify(g2));
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
