const { chromium } = require('playwright');
const TURNS = Number(process.argv[2] || 60);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1300, height: 900 } }); const p = await ctx.newPage();
  const errs = [], uiErrs = [], stuck = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  p.on('dialog', d => d.dismiss());
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.waitForTimeout(1500);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const idle = async (ms = 90000) => { try { await p.waitForFunction(() => !document.querySelector('.thinking') && !document.querySelector('.banner.thinking'), null, { timeout: ms }); return true; } catch (_) { return false; } };
  const errText = () => p.evaluate(() => [...document.querySelectorAll('.err')].map(e => e.innerText).join(' | '));
  // 开局（失败就点再试）
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  for (let k = 0; k < 6 && !(await p.$('#said')); k++) { await idle(); const e = await errText(); if (e) { uiErrs.push('open: ' + e); const r = await p.$('#bRetry'); if (r) await r.click(); } }
  if (!(await p.$('#said'))) { console.log('OPENING FAILED', uiErrs); await b.close(); return; }
  const inputs = ['去仪征看看盐栈', '找程立德问亏空的事', '戏外：一引盐赚多少？', '', '给运司书吏送二百两', '置办二十亩田', '带承裕去拜会卢见曾', '戏外：去苏州要几天？', '开个会商量明年的生意', '在家歇着'];
  const spans = ['auto', 'auto', 'auto', 'xun', 'month', 'season', 'year'];
  const tabs = ['board', 'people', 'estate', 'power', 'career', 'news', 'world', 'geo', 'chron', 'set'];
  let lastTurn = 0; const tt = [];
  for (let i = 0; i < TURNS; i++) {
    const act = Math.random(); const t0 = Date.now();
    try {
      if (act < 0.08 && await p.$('#bRegen:not([disabled])')) { await p.click('#bRegen'); await p.fill('#regenNote', '写细一点'); await p.click('#bRegenGo'); }
      else if (act < 0.12 && await p.$('#bSettle')) { await p.click('#bSettle'); }
      else {
        await p.fill('#said', inputs[Math.floor(Math.random() * inputs.length)]);
        await p.selectOption('#span', spans[Math.floor(Math.random() * spans.length)]);
        await p.click('#bSend');
      }
      const r = Math.random();
      if (r < 0.06) { await p.waitForTimeout(400 + Math.random() * 1500); await p.reload(); await p.waitForTimeout(1500); }
      else if (r < 0.10) { await p.waitForTimeout(300); const s = await p.$('#bStop'); if (s) await s.click(); }
      if (!(await idle())) { stuck.push(`turn ${i}: stuck >90s: ` + (await p.evaluate(() => (document.querySelector('.thinking') || {}).innerText || '')).slice(0, 80)); await p.reload(); await p.waitForTimeout(1500); await idle(); }
      const e = await errText(); if (e) uiErrs.push(`turn ${i}: ${e.slice(0, 160)}`);
      await p.click(`[data-tab="${tabs[Math.floor(Math.random() * tabs.length)]}"]`).catch(() => {});
      const st = await p.evaluate(() => S ? ({ turn: S.turn, chat: S.chat.length, kb: Math.round(JSON.stringify(S).length / 1024), y: S.clock.y, cash: S.money && S.money.cash, ev: S.world.events.length, up: S.world.upcoming.length, alm: (S.almanac || []).length }) : null);
      tt.push(Date.now() - t0);
      if (st && i % 10 === 0) { const mem = await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null).catch(() => null); const rt = await p.evaluate(() => { const t = performance.now(); render(); return Math.round(performance.now() - t); }).catch(() => null); console.log('state', i, JSON.stringify(st), 'avgTurnMs', Math.round(tt.slice(-10).reduce((a, b) => a + b, 0) / Math.max(1, tt.slice(-10).length)), 'heapMB', mem, 'renderMs', rt); }
      if (st && st.turn < lastTurn - 1) uiErrs.push(`turn ${i}: turn went backwards ${lastTurn} -> ${st.turn}`);
      if (st) lastTurn = st.turn;
    } catch (ex) { if (/not attached to the DOM|detached/.test(String(ex.message))) { await p.waitForTimeout(500); continue; } uiErrs.push(`turn ${i}: driver: ${String(ex.message).slice(0, 160)}`); await p.reload().catch(() => {}); await p.waitForTimeout(1500); }
  }
  const final = await p.evaluate(() => S ? ({ turn: S.turn, chatTexts: S.chat.filter(c => c.text).length, kb: Math.round(JSON.stringify(S).length / 1024), y: S.clock.y, summaries: S.summaries.length, chapters: (S.chapters || []).length, canon: (S.canon || []).length, people: Object.keys(S.people).length }) : null);
  console.log('FINAL', JSON.stringify(final));
  console.log('PAGE ERRORS', errs.length, JSON.stringify([...new Set(errs)].slice(0, 15), null, 1));
  console.log('UI ERRORS', uiErrs.length, JSON.stringify(uiErrs.slice(0, 40), null, 1));
  console.log('STUCK', JSON.stringify(stuck));
  await b.close();
})();
