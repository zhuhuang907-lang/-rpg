// 世界自己转（CLAUDE.md「剧情」世界自己转）：默认开局（史上真人），玩家连着几回只是过日子，天下推演照样跑，要紧的人自己办事真落到账上（年谱或幕后），不凭空收账上没有的人
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  const done = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && document.querySelector('#said'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await done())) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  // 假 AI 的记账不往名册里添人：开局后补几个主角认得的人（真模型照正文记），再让玩家只过日子
  await p.evaluate(() => { S.people = Object.assign(S.people || {}, { 程立德: { role: '账房', tie: '账房', seen: S.turn, favor: 20 }, 韩掌柜: { role: '仪征盐栈掌柜', tie: '同行', seen: S.turn, favor: -5 }, 赵书吏: { role: '运司书吏', tie: '相识', seen: S.turn } }); });
  const t0 = await p.evaluate(() => ({ chron: arr(S.chronicle).length, gm: arr(S.gmNotes).length, people: Object.keys(S.people || {}), ym: Math.floor(ymOf(S.clock)) }));
  for (const t of ['这个月照常过日子，不出门', '再过一个月，还是照常过日子', '照常过日子', '照常过日子，看看外头有什么动静']) { await p.fill('#said', t); await p.click('#bSend'); if (!(await done())) { bad('过日子那一回卡住：' + t); break; } }
  // 后台的天下推演做完
  await p.waitForFunction(() => S.world && S.world.tickAt && S.world.tickAt.turn >= 2 && !BG, null, { timeout: 240000, polling: 500 }).catch(() => bad('玩家不出手，天下推演没跑'));
  const r = await p.evaluate(t0 => ({ tick: S.world.tickAt, ym: Math.floor(ymOf(S.clock)), log: arr(S.npcLog).map(x => [x.name, x.op, x.did, x.open]), drop: arr(S.npcDropped).map(x => [x.name, x.why]), chron: arr(S.chronicle).length - t0.chron, gm: arr(S.gmNotes).filter(g => /^暗中：/.test(g.text)).length,
    newPeople: Object.keys(S.people || {}).filter(k => !t0.people.includes(k)), allPeople: Object.keys(S.people || {}), picked: arr(S.npcPicked), wline: (worldInput(S).match(/【身边的人（[^\n]*/) || [''])[0].slice(0, 200), ev: arr(S.world.events).filter(e => e.outside).length, status: Object.entries(S.people || {}).filter(([, v]) => v.npcAt).map(([k]) => k) }), t0);
  if (!(r.ym > t0.ym)) bad('过了几回日子，时间没往前走');
  if (!r.log.length) bad('天下推演跑了，没有一个人自己办事落到账上：' + JSON.stringify(r));
  if (r.newPeople.length) bad('自己办事的推演凭空添了人：' + r.newPeople);
  if (!r.status.length) bad('办了事的人账上没记');
  if (!r.ev) bad('外地的事没记成带地点的事件');
  if (r.log.some(x => x[3] === false) && !r.gm) bad('暗地里的事没进幕后');
  console.log('IDLE', JSON.stringify(r).slice(0, 600));
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
