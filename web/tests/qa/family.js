// 后宅子嗣、政令、经济账：纳妾进家室；有孕后过几季由程序结算生产；政令每月扣钱进月结；账房只报一项进项时别的进项开销不丢；家里的事摆在正文下面
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const idle = () => p.waitForFunction(() => !BUSY && !BG, null, { timeout: 120000, polling: 300 }).catch(() => bad('卡住了'));
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart'); await p.waitForSelector('#said', { timeout: 300000 }); await idle();
  const turn = async (t, span) => { await p.fill('#said', t); if (span) await p.selectOption('#span', span); await p.click('#bSend'); await p.waitForTimeout(500); await idle(); };
  const inc0 = await p.evaluate(() => arr(S.estate.income).length);
  await turn('纳柳氏为妾');
  const st1 = await p.evaluate(() => ({ hh: S.household.map(m => m.relation + m.name), al: S.household.filter(m => m.alias === '柳氏').map(m => m.name), inc: S.estate.income.map(x => x.item), exp: S.estate.expense.length }));
  if (!st1.hh.some(h => /^妾柳(?!氏)/.test(h) && h !== '妾柳氏素娥' && h !== '妾柳素娥')) bad('纳的妾没进家室：' + JSON.stringify(st1.hh));
  if (st1.inc.length < inc0 + 1 || !st1.inc.includes('典铺利钱')) bad('账房只报了一项进项，别的进项丢了：' + JSON.stringify(st1.inc));
  await turn('柳氏有喜了');
  const preg = await p.evaluate(() => { const m = S.household.find(x => x.alias === '柳氏' && x.relation === '妾' && x.name !== '柳素娥'); return m && m.pregnant; });
  if (!preg) bad('有孕没记上');
  if (!(await p.evaluate(() => arr(S.policies).some(x => x.name === '盐引加课')))) bad('政令没记上');
  for (let i = 0; i < 4; i++) await turn('在家过日子', 'season');
  const st2 = await p.evaluate(() => ({ kids: S.household.filter(m => /^柳/.test(m.mother || '')).map(m => m.relation + m.name), log: arr(S.familyLog).map(x => x.t), preg: S.household.some(x => x.alias === '柳氏' && x.pregnant), pol: S.chat.filter(c => c.extra && arr(c.extra.ledger).some(l => /政令：盐引加课/.test(l.item))).length, fam: S.chat.filter(c => c.extra && arr(c.extra.family).length).length }));
  if (st2.preg) bad('过了一年还没生');
  if (!st2.log.some(t => /柳[^氏，]{1,3}生/.test(t))) bad('生产没结算：' + JSON.stringify(st2.log));
  if (!st2.pol) bad('政令没进月结');
  if (!st2.fam) bad('家里的事没摆到正文下面');
  await p.click('[data-tab="people"]').catch(() => {}); await p.waitForTimeout(300);
  if (!(await p.evaluate(() => /家室/.test(document.querySelector('.side').innerText)))) bad('人物册里没有家室');
  // 页面重画（后台每做完一步都会）不能让正文和册子跳回顶上
  const sc = await p.evaluate(async () => { window.scrollTo(0, 400); const sd = document.querySelector('.side'); if (sd) sd.scrollTop = 120; const y0 = window.scrollY, s0 = sd ? sd.scrollTop : 0; render(); await new Promise(r => setTimeout(r, 50)); const sd2 = document.querySelector('.side'); return { y0, y1: window.scrollY, s0, s1: sd2 ? sd2.scrollTop : 0 }; });
  if (Math.abs(sc.y1 - sc.y0) > 2 || Math.abs(sc.s1 - sc.s0) > 2) bad('页面重画后跳了：' + JSON.stringify(sc));
  console.log('FAMILY', JSON.stringify(st2));
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
