// 第二回合卡死（2026-10-30 玩家：「玩到第二回合说随便一个指令就不往后继续了……我要去酒楼，整个游戏没有任何反应」）：
// 查实：记账留下一条 null 的兵马、地盘、行动单、临门之事，或者哪一页画不出来，重画一出错，「正忙」的标记就放不开，之后点什么都一声不响。
// 现在：坏条目当场清掉；重画出错也照常往下走、页面上明说；上一步真还在写时点发出会说明，不再一声不响
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  const done = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && document.querySelector('#said'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await done())) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  await p.fill('#said', '在家看看账'); await p.click('#bSend'); if (!(await done())) bad('第一回卡住');
  // 记账留下的坏条目（真模型偶尔会这样）
  await p.evaluate(() => { S.forces = arr(S.forces).concat([null, 'x']); S.territory = [null]; S.acts = arr(S.acts).concat([null]); S.press = arr(S.press).concat([null, { state: '临门' }]); S.orgs = [null, { id: 'o1', name: '某伙', kind: '山寨', members: null }]; S.people = Object.assign(S.people || {}, { 坏人: null }); render(); });
  const t0 = await p.evaluate(() => S.turn);
  await p.fill('#said', '我要去酒楼'); await p.click('#bSend');
  if (!(await done())) bad('坏条目在账上，第二回「我要去酒楼」卡住了');
  const r = await p.evaluate(t0 => ({ turn: S.turn, gm: S.chat.filter(c => c.role === 'gm').length, busy: BUSY, nulls: [S.forces, S.territory, S.acts, S.press, S.orgs].some(a => arr(a).some(x => !x || typeof x !== 'object')) }), t0);
  if (!(r.turn > t0)) bad('第二回没往下走：' + JSON.stringify(r)); if (r.nulls) bad('坏条目没清掉');
  // 哪一页画不出来：也不许卡住，下一步照样能发
  await p.evaluate(() => { window.__orig = orgsHtml; orgsHtml = () => { throw new Error('测试：这一页画不出'); }; TAB = 'power'; S.orgs = [{ id: 'o2', name: '黑风寨', kind: '山寨', head: '甲', members: [] }]; render(); });
  const shown = await p.evaluate(() => !!document.querySelector('#renderErr') || TAB === 'board');
  if (!shown) bad('页面画不出来时没有兜住');
  const t1 = await p.evaluate(() => S.turn);
  await p.fill('#said', '去酒楼喝两杯'); await p.click('#bSend');
  if (!(await done())) bad('有一页画不出来，下一步就卡住了');
  if (!(await p.evaluate(t1 => S.turn > t1, t1))) bad('有一页画不出来，下一步没往下走');
  await p.evaluate(() => { orgsHtml = window.__orig; });
  // 「正忙」放不开（上一步出错没收尾）：发出键是灰的、点不动——二十秒后自己放开
  await p.evaluate(() => { BUSY = true; TURN = null; THINK_T0 = Date.now() - 25000; render(); });
  try { await p.waitForFunction(() => !BUSY && !($('#bSend') || {}).disabled, null, { timeout: 5000 }); } catch (_) { bad('「正忙」卡住了没放开，发出键一直是灰的'); }
  // 真在写的时候（这一回正在跑）不乱放：照样正忙
  await p.evaluate(() => { BUSY = true; TURN = { signal: {} }; THINK_T0 = Date.now() - 25000; });
  await p.waitForTimeout(1500); if (!(await p.evaluate(() => BUSY))) bad('这一回正在写，也被当成卡住放开了');
  await p.evaluate(() => { TURN = null; BUSY = false; render(); });
  console.log('ERRS', JSON.stringify(errs.filter(e => !/测试：这一页画不出/.test(e)))); await b.close();
})();
