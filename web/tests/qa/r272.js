// R-272：第三方架构审查核实后改的——画界面不跑重的整理；到点以后才出的错照记；卡住自己放开时掐断旧请求；存不下提醒导出；接路网不穿山海；重画时输入框里打的字、光标、侧栏滚动不丢（真打字）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof tidyState === 'function');
  const bad = [];
  const r = await p.evaluate(async () => { const s = newSave({ name: '李从荣', gender: '男', age: 33, role: '皇帝', gregorianYear: 936, month: 2, day: 1, place: '洛阳', polity: '后唐' }); S = s; s.chat = [{ role: 'gm', text: '开场。' + '殿上无事。'.repeat(400), turn: 1 }];
    let n = 0; const o = orgSync; orgSync = (...a) => { n++; return o(...a); }; VIEW = 'game'; SIDE_FOLD = false; TAB = 'board'; for (let i = 0; i < 5; i++) render(); const light = n; tidyState(s); const full = n - light; orgSync = o;
    /* 到点以后才出的错 */ ERRLOG_KEY && localStorage.removeItem(LK(ERRLOG_KEY)); const pr = new Promise((_, rej) => setTimeout(() => rej(new Error('迟到的错')), 60)); await within(pr, 0.01); await new Promise(r => setTimeout(r, 120)); const late = JSON.parse(localStorage.getItem(LK(ERRLOG_KEY)) || '[]').some(e => /迟到的错/.test(e.msg));
    /* 卡住放开时掐断旧请求 */ CTL = new AbortController(); const c0 = CTL; BUSY = true; TURN = null; THINK_T0 = Date.now() - 30000; try { await send('', 'auto'); } catch (_) {} const aborted = c0.signal.aborted; BUSY = false;
    return { light, full, late, aborted }; });
  if (r.light > 0) bad.push('画界面也在跑人事树对齐（重画五回跑了' + r.light + '回）');
  if (r.full < 1) bad.push('回合开始的整理没跑人事树对齐');
  if (!r.late) bad.push('到点以后才出的错被悄悄吞了，问题报告里没有');
  if (!r.aborted) bad.push('卡住自己放开时没掐断旧请求');
  /* 存不下提醒导出 */ if (!/导出这一局存档/.test(await p.evaluate(() => document.documentElement.outerHTML.match(/这回没存上[^'"`]*/) ? document.documentElement.outerHTML.match(/这回没存上[^'"`]*/)[0] : ''))) bad.push('存不下时没提醒导出存档');
  /* 真打字：打到一半后台重画，字、光标不丢 */
  await p.evaluate(() => { BUSY = false; render(); });
  await p.click('#said'); await p.keyboard.type('召冯道到便殿');
  await p.evaluate(() => { render(); render(); });
  await p.keyboard.type('问事');
  const v = await p.evaluate(() => ({ v: document.querySelector('#said').value, f: document.activeElement && document.activeElement.id }));
  if (v.v !== '召冯道到便殿问事' || v.f !== 'said') bad.push('重画时输入框丢字或丢光标：' + JSON.stringify(v));
  /* 删光了的框，后台重画后旧字不跑回来（真删） */
  for (const t of ['board', 'news', 'world', 'chron', 'arc', 'set', 'geo', 'guide']) { await p.evaluate(t => { LIBFIND.q = '冯道'; TAB = t; render(); }, t); if (await p.$('#libQ')) break; }
  if (await p.$('#libQ')) { await p.click('#libQ'); await p.keyboard.press('End'); for (let i = 0; i < 4; i++) await p.keyboard.press('Backspace'); await p.evaluate(() => render()); const q = await p.evaluate(() => document.querySelector('#libQ').value); if (q !== '') bad.push('删光了的搜索框，后台一重画旧字又回来：' + q); } else bad.push('没找到翻史书的搜索框');
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
