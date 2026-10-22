// 刑案、监狱、生意、江湖：告状立案；开铺进生意账、按月结进现钱；入帮会进江湖册；被收押有在押提示、写正文的材料里有在押；打点饭食按月扣；获释后在押消失、案子结案
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const idle = () => p.waitForFunction(() => !BUSY && !BG, null, { timeout: 120000, polling: 300 }).catch(() => bad('卡住了'));
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart'); await p.waitForSelector('#said', { timeout: 300000 }); await idle();
  const turn = async t => { await p.fill('#said', t); await p.click('#bSend'); await p.waitForTimeout(500); await idle(); };
  await turn('去县衙告状，告周四盗卖官盐');
  if (!(await p.evaluate(() => arr(S.cases).some(c => c.name === '周四盗盐案' && c.stage === '报案')))) bad('告状没立案');
  await turn('在东关街开铺卖盐');
  if (!(await p.evaluate(() => arr(S.business).some(x => x.name === '汪记盐栈' && N0(x.revenue) === 400)))) bad('生意没进账');
  await turn('托人引荐，入漕帮递门槛');
  if (!(await p.evaluate(() => arr(S.circles).some(x => x.name === '扬州漕帮')))) bad('帮会没进江湖册');
  await turn('在铺子里被抓');
  if (!(await p.evaluate(() => S.jail && S.jail.where === '江都县监'))) bad('收押没记上');
  if (!/在押/.test(await p.evaluate(() => document.querySelector('#statusLine').innerText))) bad('顶上没显示在押');
  await turn('在监里熬日子');
  const led = await p.evaluate(() => { const g = [...S.chat].reverse().find(c => c.role === 'gm'); return arr(g.extra && g.extra.ledger).map(l => l.item); });
  if (!led.some(t => /在押打点/.test(t))) bad('在押的打点饭食没按月扣：' + JSON.stringify(led));
  if (!led.some(t => /生意：汪记盐栈/.test(t))) bad('生意没按月结：' + JSON.stringify(led));
  const prompt = require('fs').readFileSync('last_story_prompt.txt', 'utf8');
  if (!/【主角在押】/.test(prompt)) bad('写正文的材料里没有在押');
  if (!/【刑案与监狱/.test(prompt)) bad('在监里没带刑案卡');
  await turn('托人保释');
  if (await p.evaluate(() => !!S.jail)) bad('获释后还在押');
  if (!(await p.evaluate(() => arr(S.cases).some(c => c.stage === '结案')))) bad('案子没结');
  for (const t of ['board', 'estate', 'power']) { await p.click(`[data-tab="${t}"]`).catch(() => {}); await p.waitForTimeout(200); }
  if (!/汪记盐栈/.test(await p.evaluate(() => { TAB = 'estate'; render(); return document.querySelector('.side').innerText; }))) bad('家业册里看不到生意');
  if (!/扬州漕帮/.test(await p.evaluate(() => { TAB = 'power'; render(); return document.querySelector('.side').innerText; }))) bad('势力册里看不到江湖');
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
