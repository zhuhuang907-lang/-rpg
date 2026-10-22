// 军队系统：募兵后兵马进账、正文下面看得到增减；没有自家兵马去守城也有战报；带自家兵马出战，伤亡扣在账上；离谱的米价下一回交给账房改
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const idle = () => p.waitForFunction(() => !BUSY && !BG, null, { timeout: 120000, polling: 300 }).catch(() => bad('卡住了'));
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart'); await p.waitForSelector('#said', { timeout: 300000 }); await idle();
  const turn = async t => { await p.fill('#said', t); await p.click('#bSend'); await p.waitForTimeout(500); await idle(); };
  const lastExtra = () => p.evaluate(() => { const g = [...S.chat].reverse().find(c => c.role === 'gm'); return { army: g.extra && g.extra.army, battle: g.extra && g.extra.battle, html: [...document.querySelectorAll('.msg.gm')].pop().innerText }; });
  await turn('在江都募四百乡勇');
  let x = await lastExtra();
  if (!(await p.evaluate(() => arr(S.forces).some(f => f.name === '乡勇' && N0(f.troops) === 400)))) bad('募的兵没进兵马账');
  if (!arr0(x.army).some(a => /新立 乡勇/.test(a)) || !/兵马与地盘/.test(x.html)) bad('正文下面看不到兵马的增减：' + JSON.stringify(x.army));
  await turn('上城守城');
  x = await lastExtra();
  if (!x.battle || !x.battle.virtual || !/战报/.test(x.html)) bad('守城（不用自家兵马）没有战报：' + JSON.stringify(x.battle));
  if (!(await p.evaluate(() => N0(S.forces.find(f => f.name === '乡勇').troops) === 400))) bad('守城的伤亡扣到了自家乡勇头上');
  await turn('带乡勇去打仪征的盐枭');
  x = await lastExtra();
  const left = await p.evaluate(() => N0(S.forces.find(f => f.name === '乡勇').troops));
  if (!x.battle || x.battle.virtual || left !== 400 - x.battle.deadUs) bad(`带自家兵出战，伤亡没扣对：剩 ${left}，结算 ${JSON.stringify(x.battle)}`);
  // 离谱的米价：下一回的账房材料里要点出来
  await p.evaluate(() => { S.prices = [{ item: '米', price: 999, per: '斗' }]; });
  await turn('在家歇着');
  const fs = require('fs'); const lp = fs.existsSync('calls.log') ? '' : '';
  const flagged = await p.evaluate(() => dataDoubts(S).length);
  console.log('ARMY', JSON.stringify({ forces: await p.evaluate(() => S.forces), battles: await p.evaluate(() => arr(S.battles).length), flagged }));
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
  function arr0(v) { return Array.isArray(v) ? v : []; }
})();
