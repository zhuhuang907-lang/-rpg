// 土匪线第二版（R-242）：劫什么、得什么、护卫叫什么照年代（镖局是清代）；没窝主贱卖、有窝主足价；打点胥吏压风头；
// 治世风头高了多半来剿、乱世少剿还会招安——不是风头满了必剿；分赃涨人心、人心散了有人走；真点按钮
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1600 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof bandAct === 'function');
  const mk = (y, pol, place) => p.evaluate(([y, pol, place]) => { S = newSave({ name: '李黑虎', gender: '男', age: 30, role: '太行山山寨寨主', gregorianYear: y, month: 3, day: 1, place, polity: pol });
    S.chat = [{ role: 'gm', text: '开场。' }]; S.money = { cash: 2000, unit: y < 960 ? '贯' : '两', hist: [] }; S.forces = [{ name: '黑虎寨', leader: '李黑虎', owner: '你', troops: 300, at: place, status: '驻守' }];
    S.econ = { v: 2, y, pl: geoCenter(S), unit: S.money.unit, rice: 1, wage: 0.05, landPrice: 8, yield: 2, rentRate: 0.5, caravan: 300, ransom: 500, protect: 20, cloth: 1.5, interest: 0.03 };
    TAB = 'board'; VIEW = 'game'; SIDE_FOLD = false; render0(); return document.body.innerText; }, [y, pol, place]);
  // 一 唐末 880：目标照年代、护卫不叫镖师、有官纲
  let t = await mk(880, '唐', '汴州');
  const opts = await p.evaluate(() => [...document.querySelectorAll('#bandTarget option')].map(o => o.value));
  if (!opts.includes('官纲') || !opts.includes('富户')) errs.push('唐末可劫的目标里没有官纲、富户：' + opts);
  if (/镖/.test(t)) errs.push('唐末山寨页出了镖局镖师');
  for (const k of ['富户', '客商', '驿使']) { await p.evaluate(k => { S.band = S.band || bandOf(S); S.band.done = {}; S.turn += 1; }, k); await p.selectOption('#bandTarget', k).catch(() => errs.push('选不了目标 ' + k)); await p.click('button[data-band="rob"]'); }
  const log = await p.evaluate(() => arr(S.band.log).map(x => x.what).join('｜'));
  if (/镖/.test(log)) errs.push('唐末劫道写了镖师：' + log); if (!/富户|客商|驿使/.test(log)) errs.push('劫道没写劫的是谁：' + log);
  // 二 窝主：没窝主贱卖，结交后足价
  const fence = await p.evaluate(() => { const B = S.band; const had = !!B.fence; ORGMSG = ''; bandAct(S, 'fence', '吕家邸店'); return { had, now: B.fence, msg: ORGMSG }; });
  await p.click('button[data-band="fence"]').catch(() => {});
  if (fence.had || fence.now !== '吕家邸店') errs.push('结交窝主没记上：' + JSON.stringify(fence));
  // 三 打点胥吏：真点，风头降、记三个月
  const h0 = await p.evaluate(() => { S.band.heat = 20; return S.band.heat; }); await p.click('button[data-band="bribe"]');
  const br = await p.evaluate(() => ({ heat: S.band.heat, bribe: S.band.bribe })); if (!(br.heat < h0) || !br.bribe) errs.push('打点胥吏没压风头：' + JSON.stringify(br));
  // 四 分赃：真点，人心涨
  const sh = await p.evaluate(() => { S.band.unshared = 600; S.band.morale = 40; return 40; }); await p.click('button[data-band="share"]');
  if (!(await p.evaluate(() => S.band.morale > 40 && !S.band.unshared))) errs.push('分赃没涨人心');
  // 五 治世 vs 乱世：同样风头三十、不打点，治世一年里来剿的月份远多于乱世
  const cnt = await p.evaluate(() => { const run = y => { let n = 0; for (let i = 0; i < 24; i++) { S.clock.y = y; S.band.siege = null; S.band.bribe = 0; S.band.heat = 30; S.band.offer = null; S.turn += 1; S.clock.m = S.clock.m % 12 + 1; bandMonthly(S, 1); if (S.band.siege) n++; } S.band.siege = null; return n; }; return { calm: run(1600), loose: run(900) }; });
  if (!(cnt.calm > cnt.loose)) errs.push('治世乱世追剿一样紧：' + JSON.stringify(cnt)); if (cnt.calm === 24) errs.push('治世风头一高月月必剿，太死：' + JSON.stringify(cnt));
  // 六 人心散了有人走
  const mo = await p.evaluate(() => { const f = S.forces[0]; const m0 = forceStats(S, f).men; S.band.morale = 10; S.band.siege = null; S.band.heat = 0; S.clock.m = S.clock.m % 12 + 1; S.turn += 1; const o = bandMonthly(S, 1); return { m0, m1: forceStats(S, f).men, o }; });
  if (!(mo.m1 < mo.m0) || !mo.o.some(x => /人心散/.test(x))) errs.push('人心散了没人走：' + JSON.stringify(mo));
  // 七 清代护卫才叫镖师
  if (await p.evaluate(() => bandEscort(1750)) !== '镖师' || /镖/.test(await p.evaluate(() => bandEscort(900) + bandEscort(1100) + bandEscort(1500)))) errs.push('护卫叫法没照年代');
  console.log('BANDIT2', JSON.stringify({ opts, cnt })); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
