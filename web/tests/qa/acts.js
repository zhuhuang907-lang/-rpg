// 行动单（CLAUDE.md「剧情」行动单、收回账房的权）：玩家的话照性质分开开单子；记账只能报单子的进展；三回没下文明写；正文说多出的兵、新得的地没有对应的令不落账
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  const done = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && document.querySelector('#said'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await done())) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  const send = async t => { await p.fill('#said', t); await p.click('#bSend'); return done(); };
  if (!(await send('派人去仪征打听掣验的行情'))) bad('第一回卡住');
  { const r = await p.evaluate(() => ({ sal: !!(S.chat[S.chat.length - 1].extra || {}).salvaged, acts: arr(S.acts).map(x => [x.type, x.what, x.state]), rc: !!document.querySelector('.receipt'), rt: (document.querySelector('.receipt') || {}).innerText || '' }));
    if (r.sal) console.log('这一回假 AI 的账没记上（故意出错的那一成），行动单留到下一回'); else if (!r.acts.some(a => /派人/.test(a[1]) && a[2] === '办成')) bad('玩家的令没开行动单、或记账报的进展没落到单子上：' + JSON.stringify(r).slice(0, 300));
    if (!r.sal && r.rc && r.acts.some(a => /派人/.test(a[1]) && a[2] === '办成') && /派人去仪征/.test(r.rt)) bad('办成了的事还在回执里唠叨（2026-10-30 玩家：幕后的不给看，回执只提没成、受阻、拖着的）：' + r.rt); }
  // 收回账房的权：正文说亲军涨到九万九，没有募兵的令，不落账
  await p.evaluate(() => { S.forces = [{ name: '亲军', leader: S.protagonist.name, troops: '3000', at: '扬州府' }]; });
  if (!(await send('假装多出兵，去江边走走'))) bad('第二回卡住');
  { const r = await p.evaluate(() => ({ sal: !!(S.chat[S.chat.length - 1].extra || {}).salvaged, t: (S.forces.find(f => f.name === '亲军') || {}).troops, unb: arr(S.unbooked).map(x => x.text), rt: [...document.querySelectorAll('.receipt')].map(e => e.innerText).join('|') }));
    if (r.sal) console.log('这一回假 AI 的账没记上（故意出错的那一成），兵数照旧 ' + r.t); else if (String(r.t) !== '3000' || !r.unb.some(t => /亲军/.test(t)) || !/其实没成/.test(r.rt)) bad('没有募兵的令，正文里多出的兵也落了账：' + JSON.stringify(r).slice(0, 300)); }
  // 三回没下文：明写「没有下文」，不悄悄删
  await p.evaluate(() => { actNew(S, { type: '请', what: '测试：递上去的公文', to: '上司' }).turn = S.turn - 3; });
  if (!(await send('在家歇着'))) bad('第三回卡住');
  { const r = await p.evaluate(() => (arr(S.acts).find(x => /测试：递上去的公文/.test(x.what)) || {}).state);
    if (r !== '没有下文') bad('三回没进展的单子没标「没有下文」：' + r); }
  // 局面页摆行动单
  { const t = await p.evaluate(() => { TAB = 'board'; render(); return document.body.innerText; }); if (!/行动单/.test(t)) bad('局面页没有行动单'); }
  // 指南（CLAUDE.md「剧情」指南）：怎么玩 + 你这个身份能做什么；人物有稳定编号
  { const g = await p.evaluate(() => { TAB = 'guide'; render(); const t = document.body.innerText; TAB = 'board'; render(); return { t: /怎么玩/.test(t) && /行动单/.test(t) && /你是/.test(t), pid: Object.values(S.people || {}).every(v => !v || v.pid) }; });
    if (!g.t) bad('指南页没有怎么玩、身份说明'); if (!g.pid) bad('人物没有稳定编号'); }
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
