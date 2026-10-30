// 聊天一样快（CLAUDE.md「发布与仓库」家常的一步走快路）：跟在场的人说句话、问一句这种家常的一步，写正文不深想、不另起审稿、少等查证；
// 要紧的一步（告状、打仗、做官、婚嫁、上疏、方略、过日子）照旧深想、综合审稿；人物有口吻，写正文的材料里带着
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  const done = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && document.querySelector('#said'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await done())) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  // 记下这一回每次调用的种类和深不深想
  await p.evaluate(() => { window.__calls = []; const o = callClaude; callClaude = function (prompt, cb, extra) { if (TURN) window.__calls.push({ kind: (extra && extra.kind) || (extra && extra.json === false ? '写戏' : '记账'), think: extra && extra.thinking, review: /综合审稿/.test(String(prompt)) }); return o.apply(this, arguments); }; });
  const turn = async said => { await p.evaluate(() => { window.__calls = []; }); const t0 = Date.now(); await p.fill('#said', said); await p.click('#bSend'); if (!(await done())) bad('卡住：' + said); return { ms: Date.now() - t0, calls: await p.evaluate(() => window.__calls), light: await p.evaluate(() => arr(S.perf).slice(-1)[0] ? !!S.perf.slice(-1)[0].light : null) }; };
  const a = await turn('「掌柜的，今儿这茶怎么卖？」');
  const story = a.calls.find(c => c.kind === '写戏');
  if (!story || story.think !== false) bad('家常的一句话，写正文还在深想：' + JSON.stringify(a.calls));
  // 综合审稿照旧每回做，只是和记账一起在后头跑，不挡着玩家读：审稿的调用要在写正文之后、和记账同时
  { const i = a.calls.findIndex(c => c.review), j = a.calls.findIndex(c => c.kind === '记账'); if (i < 0) bad('家常的一句话没做综合审稿（每回都要当场审）'); }
  if (!lightTurnOk(await p.evaluate(() => lightTurn(S, '「掌柜的，今儿这茶怎么卖？」', 'auto')))) bad('家常的话没认成快路');
  const h = await turn('去县衙告状，告运司书吏勒索');
  const st2 = h.calls.find(c => c.kind === '写戏');
  if (!st2 || st2.think === false) bad('要紧的一步（告状）写正文没深想：' + JSON.stringify(h.calls));
  if (!h.calls.some(c => c.review)) bad('要紧的一步没有综合审稿');
  const heavy = await p.evaluate(() => ['带兵去攻城', '上疏弹劾知府', '给儿子议亲', '推行清丈田亩', '歇一个月'].filter(x => lightTurn(S, x, 'auto')));
  if (heavy.length) bad('要紧的一步被当成家常走了快路：' + heavy);
  // 口吻：评定人物时给，写正文的材料里带着
  const v = await p.evaluate(() => { S.people = S.people || {}; S.people['韩掌柜'] = { role: '茶馆掌柜', seen: S.turn, voice: '江北口音，开口必称老爷' }; CUR_SAID = '问韩掌柜'; return blocks(S, true); });
  if (!/口吻：江北口音/.test(v)) bad('人物的口吻没进写正文的材料');
  console.log('LIGHT', JSON.stringify({ light: a.ms, heavy: h.ms }));
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
function lightTurnOk(x) { return x === true; }
