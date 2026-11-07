// 按钮都要有效果（需求台账 R-144；2026-11-07 玩家：「这个游戏很多系统根本没有任何效果，只是像一个按钮一样」）：
// 资料没推好挡住的按钮，点了当场去推、推好就能用；没填内容的按钮说清楚缺什么；不许点了一声不吭
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof kickJob === 'function');
  const bad = [];
  await p.evaluate(() => { S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' }); S.chat = [{ role: 'gm', text: '开场' }]; S.money = { cash: 300000, unit: '贯' }; S.realm = { treasury: 800000 };
    S.forces = [{ name: '威武军', leader: '王审知', owner: '你', troops: 15000, at: '福州', status: '驻守' }];
    // 假 AI：行情、户口、财政底账都照问的回
    callClaude = async pr => /行情|米价/.test(pr) ? { text: JSON.stringify({ rice: 1.2, wage: 0.1, landPrice: 8, yield: 2, rentRate: 0.5, caravan: 500, ransom: 300, protect: 20, cloth: 1, interest: 0.03, myLand: 0, juan: 5, pay: 1, payOff: 3, feast: 60, opera: 30, incense: 10, doctor: 20, why: '推' }) }
      : /户口|口数/.test(pr) ? { text: JSON.stringify({ list: [{ n: '福州', hh: 60000, pop: 300000, nong: 50, shang: 50, cheng: 50, why: '推' }], units: [{ name: '福州', hh: 60000, pop: 300000, nong: 50, shang: 50, cheng: 50, why: '推' }] }) }
      : /财政/.test(pr) ? { text: JSON.stringify({ tianfu: 600000, shang: 200000, jun: 300000, feng: 100000, qiyun: 0.7, basis: '推' }) } : { text: '{}' };
    VIEW = 'game'; SIDE_FOLD = false; ORGMSG = ''; });
  // 一、私下的日子：行情没推好，点了当场去推，推好了再点就办成（花了钱）
  await p.evaluate(() => { TAB = 'board'; render0(); });
  await p.evaluate(() => document.querySelector('[data-priv="show"]').click());
  if (!/这就去推|正在推|推好了/.test(await p.evaluate(() => ORGMSG))) bad.push('行情没推好时点「观乐舞百戏」没去推：' + await p.evaluate(() => ORGMSG));
  await p.waitForFunction(() => econOf(S), null, { timeout: 8000 }).catch(() => bad.push('点了没把行情推出来'));
  const c0 = await p.evaluate(() => S.money.cash); await p.evaluate(() => { TAB = 'board'; render0(); document.querySelector('[data-priv="show"]').click(); });
  if (!(await p.evaluate(() => S.money.cash)) < c0 && !(await p.evaluate(c0 => S.money.cash < c0, c0))) bad.push('行情推好了，「观乐舞百戏」还是没花钱、没办成');
  // 二、遣使：底账没推好，点了当场去推
  await p.evaluate(() => { S.fisc = null; TAB = 'power'; render0(); const x = document.querySelector('[data-dip="修好"]'); if (x) x.click(); });
  if (!/这就去推|正在推|推好了/.test(await p.evaluate(() => ORGMSG))) bad.push('底账没推好时点「修好」没去推：' + await p.evaluate(() => ORGMSG));
  // 三、没填内容就点：说清楚缺什么，不一声不吭
  await p.evaluate(() => { TAB = 'army'; ORGMSG = ''; render0(); }); const ut = await p.$('#bUtAdd'); if (ut) { await ut.click(); await p.waitForTimeout(200); if (!/先写/.test(await p.evaluate(() => ORGMSG))) bad.push('「定这个兵种」没填名字也一声不吭'); }
  await p.evaluate(() => { TAB = 'trade'; ORGMSG = ''; render0(); }); const sh = await p.$('#bShop'); if (sh) { await sh.click(); await p.waitForTimeout(200); if (!/先写/.test(await p.evaluate(() => ORGMSG))) bad.push('「开张」没填内容也一声不吭'); }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
