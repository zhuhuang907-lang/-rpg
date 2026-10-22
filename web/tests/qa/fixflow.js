// 改错的每条路都不能卡：一键反馈重写、框里说「你写错了」、改这段文字、重写这一条；改完回合数不乱、正文换了、能接着玩
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(s => { localStorage.clear(); localStorage.setItem('hrpg:tscale', s); }, String(0.1 * Number(process.env.LAT || 1))); await p.reload(); await p.waitForTimeout(1500);
  const idle = async (what, ms = 240000) => { const t = Date.now(); try { await p.waitForFunction(() => !BUSY, null, { timeout: ms, polling: 300 }); } catch (_) { bad(what + '：卡住超过 ' + ms / 1000 + ' 秒，停在：' + await p.evaluate(() => PHASE + ' ' + ((document.querySelector('.thinking') || {}).innerText || '')).catch(() => '')); } return (Date.now() - t) / 1000; };
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart'); await p.waitForSelector('#said', { timeout: 300000 }); await idle('开局');
  const st = () => p.evaluate(() => ({ turn: S.turn, n: S.chat.length, last: (S.chat[S.chat.length - 1] || {}).text || '' }));
  await p.fill('#said', '去仪征看看盐栈'); await p.click('#bSend'); await p.waitForTimeout(500); await idle('第一回');
  const a = await st();
  // 一键反馈
  const fb = await p.$('[data-fb]'); if (!fb) bad('看不到一键反馈的按钮'); else { await p.locator('[data-fb]').first().click(); await p.waitForTimeout(500); const t = await idle('一键反馈重写'); const x = await st(); if (x.turn !== a.turn) bad(`反馈重写后回合数变了 ${a.turn}→${x.turn}`); if (!/照「/.test(await p.evaluate(() => JSON.stringify((S.chat[S.chat.length - 1].extra || {}).fixack || '')))) bad('反馈重写后没有交代改了什么'); console.log('FB', t + 's'); }
  // 框里说写错了
  const b0 = await st(); await p.fill('#said', '你写错了，程立德是账房不是管家'); await p.click('#bSend'); await p.waitForTimeout(500); { const t = await idle('纠错重写'); const x = await st(); if (x.turn !== b0.turn) bad(`纠错重写后回合数变了 ${b0.turn}→${x.turn}`); if (await p.evaluate(() => S.chat.some(c => c.role === 'me' && /你写错了/.test(c.text)))) bad('纠错的话被当成了戏里的一步'); console.log('FIX', t + 's'); }
  // 改这段文字
  const e = await p.$('#bEdit'); if (!e) bad('看不到「改这段文字」'); else { await p.locator('#bEdit').click(); await p.waitForTimeout(300); await p.evaluate(() => { const el = document.querySelector('#editText'); if (el) el.innerText = '改过的正文：程立德把账本合上，说仪征那边的事他明早去办。'; }); await p.locator('#bEditSave').click().catch(() => bad('改这段文字的保存按钮点不了')); await p.waitForTimeout(500); const x = await st(); if (!/改过的正文/.test(x.last)) bad('改这段文字没存上'); }
  // 重写这一条
  const r = await p.$('#bRegen:not([disabled])'); if (!r) bad('「重写这一条」点不了'); else { await p.locator('#bRegen:not([disabled])').click(); await p.fill('#regenNote', '写细一点'); await p.click('#bRegenGo'); await p.waitForTimeout(500); const t = await idle('重写这一条'); console.log('REGEN', t + 's'); }
  // 接着玩
  const c0 = await st(); await p.fill('#said', '找程立德问亏空的事'); await p.click('#bSend'); await p.waitForTimeout(500); await idle('改完接着玩'); const c1 = await st(); if (c1.turn !== c0.turn + 1) bad(`改完接着玩回合数不对 ${c0.turn}→${c1.turn}`);
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
