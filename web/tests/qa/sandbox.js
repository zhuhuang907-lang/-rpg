// 营生与本事：开局定属性本事声望品行；本事照用的多少长、属性高的长得快；声望到了门槛换名号；
// 此地行情、差事、门客；当场买卖（钱不够、驮不动拦下，卖出算赚亏）；应下差事写进下一步、办成结掉加声望；招揽门客、名字不许有「某」、按月给薪
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !BG && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  await p.waitForFunction(() => S.skills && S.local, null, { timeout: 60000 }).catch(() => bad('开局后没定本事、没打听行情'));
  const k = await p.evaluate(() => ({ jc: S.skills && S.skills['经商'].lv, wy: S.skills && S.skills['武艺'].lv, ren: S.renown, tier: tierOf(S.renown), goods: arr(S.local && S.local.goods).length, q: arr(S.quests).length, rec: arr(S.local && S.local.recruits).map(r => r.name), blk: /主角的本事/.test(skillBlock(S)) }));
  if (k.jc !== 55 || k.wy !== 0) bad('本事没照出身定：' + JSON.stringify(k));
  if (k.tier !== '小有名声') bad('声望名号不对：' + JSON.stringify(k));
  if (k.goods < 3 || !k.q) bad('行情、差事没整理出来');
  if (k.rec.some(n => /某/.test(n))) bad('门客名字里有「某」：' + k.rec);
  if (!k.blk) bad('本事没进推演写正文的材料');
  // 本事用得多就长，属性高的长得快
  const g = await p.evaluate(() => { const a = S.skills['文墨'].lv; const r = applySkills(S, { skillUse: [{ skill: '文墨', xp: 40 }, { skill: '文墨', xp: 40 }] }); const r2 = applySkills(S, { renownDelta: 30 }); return { a, b: S.skills['文墨'].lv, r, r2, tier: tierOf(S.renown) }; });
  if (!(g.b > g.a)) bad('本事用了没长：' + JSON.stringify(g));
  if (g.tier !== '小有名声' && !/名声到了/.test(g.r2.join())) bad('声望过门槛没提示：' + JSON.stringify(g));
  // 当场买卖
  await p.click('[data-tab="trade"]'); await p.waitForTimeout(300);
  const t0 = await p.evaluate(() => S.money.cash);
  await p.fill('[data-tq="淮盐"]', '5'); await p.click('[data-trade="buy"][data-item="淮盐"]'); await p.waitForTimeout(200);
  const t1 = await p.evaluate(() => ({ cash: S.money.cash, cargo: S.cargo, msg: ORGMSG }));
  if (!(t1.cash < t0) || !(t1.cargo || []).some(c => c.item === '淮盐' && c.qty === 5)) bad('买进没扣钱、没进随身货：' + JSON.stringify(t1));
  const over = await p.evaluate(() => trade(S, '淮盐', 9999, false));
  if (!/钱不够|带不动/.test(over)) bad('买九千多件也没拦下：' + over);
  // 到了别处，贵处卖出算赚头
  await p.evaluate(async () => { S.at = '苏州府吴县'; await buildLocal(S); });
  const sold = await p.evaluate(() => trade(S, '淮盐', 5, true));
  if (!/赚/.test(sold)) bad('贱买贵卖没赚：' + sold);
  // 应下差事 → 写进下一步；招揽门客
  await p.evaluate(async () => { S.at = ''; await buildLocal(S); render(); }); await p.click('[data-tab="trade"]'); await p.click('[data-tab="trade"]'); await p.waitForTimeout(300);
  const qid = await p.evaluate(() => S.quests.find(q => q.state === '可接').id);
  await p.click(`[data-quest="${qid}"]`); if (!/我应下程立德托的事：追讨盐栈欠银/.test(await p.inputValue('#said'))) bad('应下差事没写进下一步');
  const h = await p.evaluate(() => { const a = S.money.cash; const m = hire(S, '沈默之'); return { m, cash: a - S.money.cash, n: arr(S.companions).length }; });
  if (h.n !== 1 || h.cash !== 2) bad('招揽门客不对：' + JSON.stringify(h));
  const qr = await p.evaluate(() => { const r0 = S.renown; const out = applyQuests(S, { questResults: [{ title: '追讨盐栈欠银', result: '办成' }] }); const pay = companionMonthly(S, 1); return { out, d: S.renown - r0, st: S.quests.find(q => q.title === '追讨盐栈欠银').state }; });
  if (qr.st !== '办成' || !(qr.d > 0)) bad('差事办成没结掉、没加声望：' + JSON.stringify(qr));
  await p.click('[data-tab="skill"]'); await p.waitForTimeout(300);
  const txt = await p.evaluate(() => document.body.innerText);
  for (const w of ['属性', '本事', '经商', '声望', '品行']) if (!txt.includes(w)) bad('本事页上没有：' + w);
  console.log('SB', JSON.stringify({ k, g, t1: t1.msg, sold, h, qr }));
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
