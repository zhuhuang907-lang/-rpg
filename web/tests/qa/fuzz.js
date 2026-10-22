// 乱点：像一个毛手毛脚的玩家——边玩边改设置（深度思考、篇幅、联网、推演天下）、写到一半停下、重写、改正文、一键反馈、
// 另存分支、补记、回首页再读档、刷新、乱切侧栏。每一步之后查：页面报错、卡住、怪字（undefined、NaN、[object Object]、幕后外露）
const { chromium } = require('playwright');
const STEPS = Number(process.argv[2] || 60);
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await (await b.newContext({ acceptDownloads: true })).newPage();
  const errs = [], bad = [], stuck = []; let CUR = 'open'; p.on('pageerror', e => errs.push(CUR + ': ' + String(e.message).slice(0, 120) + ' @ ' + String(e.stack || '').split('\n').slice(0, 3).join(' | ').slice(0, 300))); p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const idle = async (ms = 120000) => { try { await p.waitForFunction(() => !BUSY && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  const R = a => a[Math.floor(Math.random() * a.length)];
  await p.fill('#qText', '靖康元年东京城里的一个太学生'); await p.click('#bStart');
  if (!(await idle(300000)) || !(await p.$('#said'))) { console.log('OPENING FAILED'); console.log('PAGE ERRORS', errs.length, JSON.stringify(errs)); await b.close(); process.exit(1); }
  const inputs = ['去太学门口看榜', '找同斋的陈东商量上书的事', '戏外：现在汴京米价多少？', '', '给门房二十文打听消息', '回家给母亲请安', '我对陈东说：「此事须得从长计议。」', '去李纲府上投帖'];
  const acts = {
    send: async () => { await p.fill('#said', R(inputs)); await p.click('#bSend'); },
    sendStop: async () => { await p.fill('#said', R(inputs)); await p.click('#bSend'); await p.waitForTimeout(300 + Math.random() * 1500); const s = await p.$('#bStop'); if (s) await s.click(); },
    sendReload: async () => { await p.fill('#said', R(inputs)); await p.click('#bSend'); await p.waitForTimeout(500 + Math.random() * 2000); await p.reload(); await p.waitForTimeout(1500); },
    setting: async () => {
      await p.click('[data-tab="set"]').catch(() => {}); await p.waitForTimeout(200);
      for (const id of ['sDeep', 'sSearch', 'sWorld']) { const el = await p.$('#' + id); if (el && Math.random() < 0.5) await el.click().catch(() => {}); }
      const len = await p.$('#sLen'); if (len) { const opts = await len.$$eval('option', o => o.map(x => x.value)); await p.selectOption('#sLen', R(opts)).catch(() => {}); }
    },
    regen: async () => { const r = await p.$('#bRegen:not([disabled])'); if (!r) return; await r.click(); await p.fill('#regenNote', R(['写细一点', '', '别替我说话'])).catch(() => {}); const g = await p.$('#bRegenGo'); if (g) await g.click(); },
    edit: async () => { const e = await p.$('#bEdit:not([disabled])'); if (!e) return; await e.click(); await p.waitForTimeout(200); const ta = await p.$('.msg.gm textarea'); if (ta) await ta.fill('改过的正文：门房收了钱，说李相公今日不见客。'); const s = await p.$(R(['#bEditSave', '#bEditCancel'])); if (s) await s.click(); },
    feedback: async () => { const fb = await p.$$('[data-fb]'); if (fb.length) await R(fb).click(); },
    branch: async () => { await p.click('[data-tab="set"]').catch(() => {}); await p.waitForTimeout(200); const x = await p.$('#bBranch:not([disabled])'); if (x) await x.click(); },
    settle: async () => { const x = await p.$('#bSettle'); if (x) await x.click(); },
    homeLoad: async () => { const h = await p.$('#bHome'); if (!h || !(await h.isVisible())) return; await h.click(); await p.waitForTimeout(800); const l = await p.$$('[data-load]'); if (l.length) await l[0].click(); await p.waitForTimeout(800); },
    tabs: async () => { for (let i = 0; i < 3; i++) { await p.click(`[data-tab="${R(['board', 'people', 'estate', 'power', 'career', 'news', 'world', 'geo', 'chron', 'set'])}"]`).catch(() => {}); await p.waitForTimeout(150); } },
    reload: async () => { await p.reload(); await p.waitForTimeout(1500); },
  };
  const weights = [['send', 8], ['sendStop', 1], ['sendReload', 1], ['setting', 2], ['regen', 1], ['edit', 1], ['feedback', 1], ['branch', 1], ['settle', 1], ['homeLoad', 1], ['tabs', 2], ['reload', 1]];
  const pick = () => { let n = Math.random() * weights.reduce((a, w) => a + w[1], 0); for (const [k, w] of weights) if ((n -= w) < 0) return k; return 'send'; };
  for (let i = 0; i < STEPS; i++) {
    const a = pick(); CUR = 'step ' + i + ' ' + a;
    try { await acts[a](); } catch (e) { if (!/detached|not attached|Target closed|navigation/i.test(String(e.message))) bad.push(`step ${i} ${a}: driver ${String(e.message).slice(0, 120)}`); }
    if (!(await idle())) { stuck.push(`step ${i} ${a}: 卡住两分钟：` + (await p.evaluate(() => (document.querySelector('.thinking') || {}).innerText || PHASE).catch(() => '')).slice(0, 80)); await p.reload(); await p.waitForTimeout(1500); await idle(); }
    const st = await p.evaluate(() => ({ view: VIEW, hasS: !!S, err: [...document.querySelectorAll('.err')].map(e => e.innerText).join(' | '), vis: (document.querySelector('#app') || {}).innerText || '' })).catch(() => null);
    if (!st) continue;
    if (st.view === 'start' && a !== 'homeLoad') { const l = await p.$$('[data-load]'); if (l.length) { await l[0].click(); await p.waitForTimeout(800); } }
    const leak = st.vis.match(/【幕后】|undefined|NaN|\[object Object\]|"elapsedDays"|```/g);
    if (leak) bad.push(`step ${i} ${a}: 页面上有怪字 ${[...new Set(leak)].join(',')}`);
    if (st.err && !/自动重试|网络或模型抖了/.test(st.err)) bad.push(`step ${i} ${a}: 报错 ${st.err.slice(0, 120)}`);
  }
  console.log('PAGE ERRORS', errs.length, JSON.stringify([...new Set(errs)].slice(0, 10)));
  console.log('UI ERRORS', bad.length, JSON.stringify(bad.slice(0, 30), null, 1));
  console.log('STUCK', JSON.stringify(stuck));
  await b.close();
})();
