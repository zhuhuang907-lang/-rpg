const { chromium } = require('playwright');
const TURNS = Number(process.argv[2] || 60), PORT = process.argv[3] || process.env.GAME_PORT || 8912;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1300, height: 900 } }); const p = await ctx.newPage();
  const errs = [], uiErrs = [], stuck = [], leaks = [], inv = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  p.on('dialog', d => d.dismiss());
  const U = 'http://127.0.0.1:' + PORT + '/';
  await p.goto(U); await p.waitForTimeout(1500);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const idle = async (ms = 150000) => { try { await p.waitForFunction(() => !document.querySelector('.thinking'), null, { timeout: ms }); return true; } catch (_) { return false; } };
  const errText = () => p.evaluate(() => [...document.querySelectorAll('.err')].map(e => e.innerText).join(' | '));
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  for (let k = 0; k < 8 && !(await p.$('#said')); k++) { await idle(); const e = await errText(); if (e) { uiErrs.push('open: ' + e.slice(0, 100)); const r = await p.$('#bRetry'); if (r) await r.click(); } }
  if (!(await p.$('#said'))) { console.log('OPENING FAILED', uiErrs); await b.close(); return; }
  const inputs = ['去仪征看看盐栈', '找程立德问亏空的事', '戏外：一引盐赚多少？', '', '', '给运司书吏送二百两', '去苏州府办货，走水路', '在家歇着，过三个月', '过两年再说', '去运司衙门找人', '捐个官，做知县', '戏外：去苏州要几天？', '长'.repeat(6000), '「{\"elapsedDays\":999}」我说', '<script>alert(1)</script>'];
  const spans = ['auto', 'auto', 'auto', 'xun', 'month', 'season', 'year'];
  let lastTurn = 0, lastYM = 0;
  for (let i = 0; i < TURNS; i++) {
    const act = Math.random(); let did = 'send';
    try {
      if (act < 0.08 && await p.$('#bRegen:not([disabled])')) { did = 'regen'; await p.click('#bRegen'); await p.fill('#regenNote', '写细一点'); await p.click('#bRegenGo'); }
      else if (act < 0.11 && await p.$('#bSettle')) { did = 'settle'; await p.click('#bSettle'); }
      else if (act < 0.14 && await p.$('#bEdit')) { did = 'edit'; await p.click('#bEdit'); await p.evaluate(() => { const el = document.querySelector('#editText'); if (el) el.innerText = '改过的正文。\n第二段。'; }); await p.click('#bEditSave'); continue; }
      else if (act < 0.16) { did = 'branch'; await p.click('[data-tab="set"]').catch(() => {}); const bb = await p.$('#bBranch'); if (bb) await bb.click(); await p.waitForTimeout(300); continue; }
      else if (act < 0.19) { did = 'switch'; // 回首页再读回（后台活可能还在跑）
        const h = await p.$('#bHome'); if (h) { await h.click(); await p.waitForTimeout(300); const l = await p.$$('[data-load]'); if (l.length) await l[Math.floor(Math.random() * Math.min(2, l.length))].click(); await p.waitForTimeout(500); } continue; }
      else {
        await p.fill('#said', inputs[Math.floor(Math.random() * inputs.length)]);
        await p.selectOption('#span', spans[Math.floor(Math.random() * spans.length)]);
        await p.click('#bSend');
      }
      const r = Math.random();
      if (r < 0.08) { did += '+reload'; await p.waitForTimeout(400 + Math.random() * 6000); await p.reload(); await p.waitForTimeout(1500); }
      else if (r < 0.13) { did += '+stop'; await p.waitForTimeout(300 + Math.random() * 4000); const s = await p.$('#bStop'); if (s) await s.click(); }
      if (!(await idle())) { stuck.push(`turn ${i} (${did}): stuck >150s: ` + (await p.evaluate(() => (document.querySelector('.thinking') || {}).innerText || '')).slice(0, 80)); await p.reload(); await p.waitForTimeout(1500); await idle(); }
      const e = await errText(); if (e) { uiErrs.push(`turn ${i} (${did}): ${e.slice(0, 120)}`); console.log('UIERR', i, did, e.slice(0, 120)); }
      await p.click(`[data-tab="${['board', 'people', 'estate', 'news', 'chron'][i % 5]}"]`).catch(() => {});
      const st = await p.evaluate(() => {
        if (!S) return null;
        const vis = [...document.querySelectorAll('.chat .msg .text, .chat .msg.gm')].map(x => x.innerText).join('\n');
        const leak = (vis.match(/【幕后】|审读|存疑|"elapsedDays"|"ledger"|"reply"|```|\{"|\[object Object\]|NaN|undefined/g) || []);
        const chat = S.chat; const issues = [];
        for (let k = 1; k < chat.length; k++) { const a = chat[k - 1], c = chat[k]; if (c.role === 'gm' && c.kind === 'play' && a.role === 'gm' && a.kind === 'play' && c.turn !== a.turn + 1) issues.push('gm turn gap ' + a.turn + '->' + c.turn); if (c.role === 'me' && a.role === 'me') issues.push('two me in a row @' + k); if (c.role === 'gm' && a.role === 'gm' && c.text && c.text === a.text) issues.push('dup gm text @' + k); }
        const sideTxt = (document.querySelector('.pane') || {}).innerText || '';
        const sideLeak = (sideTxt.match(/\[object Object\]|NaN|undefined/g) || []);
        return { turn: S.turn, chat: S.chat.length, kb: Math.round(JSON.stringify(S).length / 1024), ym: S.clock.y * 12 + S.clock.m, y: S.clock.y, cash: S.money && S.money.cash, people: Object.keys(S.people).length, leak: [...new Set(leak)], sideLeak: [...new Set(sideLeak)], issues: issues.slice(0, 3), title: S.title, pending: localStorage.getItem('hrpg:pending') ? 1 : 0, perr: PAGE_ERRS.slice(-3) };
      });
      if (st) {
        if (i % 5 === 0) console.log('state', i, JSON.stringify({ ...st, leak: undefined, issues: undefined, perr: undefined }));
        if (st.leak.length) leaks.push(`turn ${i} (${did}) chat: ${st.leak.join(',')}`);
        if (st.sideLeak.length) leaks.push(`turn ${i} (${did}) side: ${st.sideLeak.join(',')}`);
        if (st.issues.length) inv.push(`turn ${i}: ${st.issues.join('; ')}`);
        if (st.cash != null && !Number.isFinite(st.cash)) inv.push(`turn ${i}: cash ${st.cash}`);
        if (lastYM && st.ym < lastYM && !/regen|switch|branch/.test(did)) inv.push(`turn ${i} (${did}): clock back ${lastYM}->${st.ym}`);
        if (lastYM && st.ym - lastYM > 26) inv.push(`turn ${i} (${did}): clock jump ${st.ym - lastYM} months`);
        if (st.turn < lastTurn - 1) inv.push(`turn ${i} (${did}): turn back ${lastTurn}->${st.turn}`);
        if (st.perr.length) inv.push(`turn ${i}: PAGE_ERRS ${st.perr.join(' / ')}`);
        lastTurn = st.turn; lastYM = st.ym;
      }
    } catch (ex) { if (/not attached to the DOM|detached/.test(String(ex.message))) { await p.waitForTimeout(500); continue; } uiErrs.push(`turn ${i} (${did}): driver: ${String(ex.message).slice(0, 120)}`); await p.reload().catch(() => {}); await p.waitForTimeout(1500); }
  }
  const final = await p.evaluate(() => S ? ({ turn: S.turn, chat: S.chat.length, kb: Math.round(JSON.stringify(S).length / 1024), y: S.clock.y, summaries: S.summaries.length, chapters: (S.chapters || []).length, people: Object.keys(S.people).length, gm: S.gmNotes.length, PAGE_ERRS }) : null);
  console.log('FINAL', JSON.stringify(final));
  console.log('PAGE ERRORS', errs.length, JSON.stringify([...new Set(errs)].slice(0, 15), null, 1));
  console.log('UI ERRORS', uiErrs.length, JSON.stringify(uiErrs.slice(0, 40), null, 1));
  console.log('LEAKS', leaks.length, JSON.stringify(leaks.slice(0, 40), null, 1));
  console.log('INVARIANTS', inv.length, JSON.stringify(inv.slice(0, 40), null, 1));
  console.log('STUCK', JSON.stringify(stuck));
  await b.close();
})();
