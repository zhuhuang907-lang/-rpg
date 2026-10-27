// 剧情扩展：照此时此地的实情备几件会找上门的事；玩家这一步平平无事时挑一件写进来（不打断、不改命令），
// 进推演和写戏的材料，正文下面注明添的是什么、照什么；可走的路摆成按钮；用过的不再用
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !BG && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  await p.fill('#said', '在家看看账'); await p.click('#bSend'); await p.waitForTimeout(500); await idle();
  await p.waitForFunction(() => arr(S.hooks).length >= 2, null, { timeout: 120000 }).catch(() => bad('没备剧情扩展'));
  await p.fill('#said', '在家歇着'); await p.click('#bSend'); await p.waitForTimeout(500); await idle();
  const r = await p.evaluate(() => { const g = S.chat.filter(c => c.role === 'gm').slice(-1)[0]; return { hook: g.extra && g.extra.hook, hints: g.hints, used: arr(S.hooks).filter(h => h.used).length, now: S.hookNow, txt: document.body.innerText }; });
  const prompt = fs.existsSync('last_story_prompt.txt') ? fs.readFileSync('last_story_prompt.txt', 'utf8') : '';
  if (!r.hook) bad('平平无事的一回没添事');
  if (!/【这一回的剧情扩展/.test(prompt) || !/不打断、不改变玩家的命令/.test(prompt)) bad('剧情扩展没进写戏材料');
  if (!r.used || r.now) bad('用过的没记下：' + JSON.stringify({ used: r.used, now: r.now }));
  if (!(r.hints || []).some(h => /议事|打听|借给|婉拒|媒人|缓一缓/.test(h))) bad('可走的路没摆成按钮：' + JSON.stringify(r.hints));
  if (!/这一回添的事：/.test(r.txt)) bad('正文下面没注明添的事');
  // 玩家正在说话、办急事：不打岔
  const t2 = await p.evaluate(() => { S.lastHook = 0; return !!pickHook(S, '「你给我说清楚，这账是怎么回事？」'); });
  if (t2) bad('玩家正在说话也塞剧情扩展');
  console.log('HOOK', JSON.stringify({ hook: r.hook, used: r.used }));
  console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message.slice(0, 300)])); process.exit(1); });
