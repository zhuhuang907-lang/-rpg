// 旧存档：早先版本存下的局缺这几个月新加的册子（家室、政令、案子、在押、生意、江湖、捏脸、家业、国势、兵马、定本、目标……），
// 有的字段是旧的写法（字符串、空值、对象写成了数组）。读进来每页侧栏都画得出、没有怪字，还能接着玩一回、刷新后还在
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ').slice(0, 200))); p.on('dialog', d => d.accept());
  const bad = m => errs.push(m);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '万历年间苏州的绣娘'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  // 做成旧存档的样子，另存一份
  const oldId = await p.evaluate(async () => {
    const o = JSON.parse(JSON.stringify(S));
    for (const k of ['household', 'policies', 'cases', 'jail', 'business', 'circles', 'face', 'npcFaces', 'custom', 'realm', 'forces', 'territory', 'canon', 'goals', 'places', 'units', 'battles', 'lastMove', 'mainNow', 'annals', 'shapes', 'orders', 'deeds', 'arcGoal', 'officials', 'dossiers', 'gazetteer', 'inst', 'estateDue', 'estateStory', 'prices', 'groups'])
      delete o[k];
    o.estate = null; o.meters = { 家资: '三十两' }; o.money = { cash: '12' }; o.people = { 张妈: { role: '邻居', favor: '好' }, 王掌柜: null };
    o.world = { overview: '旧版大势' }; o.chronicle = undefined; o.summaries = null; o.chat = o.chat.map(c => ({ role: c.role, text: c.text, turn: c.turn }));
    o.id = 'sold' + Date.now().toString(36); o.title = '旧存档'; o.v = 2;
    await store.save(o); return o.id;
  });
  await p.click('#bHome'); await p.waitForTimeout(800);
  await p.locator(`[data-load="${oldId}"]`).first().click().catch(e => bad('首页找不到旧存档：' + e.message.slice(0, 60)));
  await p.waitForTimeout(1200);
  if (!(await p.evaluate(id => S && S.id === id, oldId))) bad('旧存档读不进来');
  for (const tab of await p.$$eval('[data-tab]', xs => [...new Set(xs.map(x => x.dataset.tab))])) {
    await p.click(`[data-tab="${tab}"]`).catch(() => {}); await p.waitForTimeout(200);
    const vis = await p.evaluate(() => document.body.innerText);
    const leak = vis.match(/undefined|NaN|\[object Object\]/g); if (leak) bad(`旧存档的「${tab}」页有怪字：${[...new Set(leak)].join(',')}`);
  }
  await p.click('[data-tab="board"]').catch(() => {});
  if (!(await p.$('#said'))) { bad('旧存档读进来后没有输入框：' + (await p.evaluate(() => VIEW + ' / ' + (document.querySelector('#app') || {}).innerText)).slice(0, 300)); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  const t0 = await p.evaluate(() => S.turn);
  await p.fill('#said', '去阊门外的绣庄交活计'); await p.click('#bSend');
  if (!(await idle())) bad('旧存档接着玩卡住了');
  if ((await p.evaluate(() => S.turn)) <= t0) bad('旧存档接着玩没写出新的一回：' + await p.evaluate(() => [...document.querySelectorAll('.err')].map(e => e.innerText).join(' | ')));
  await p.reload(); await p.waitForTimeout(1500);
  if (!(await p.evaluate(id => S && S.id === id, oldId))) bad('旧存档刷新后没接上');
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
