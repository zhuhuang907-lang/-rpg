// 每个能点的都点一遍：首页、自定开局表、游戏里每一页侧栏、正文下的按钮。
// 每点一下记：页面报错、点了毫无反应（页面、状态、本机存储、请求都没变）、卡住、怪字。
// 有副作用的（删除、回首页、停）点完会恢复到游戏里再接着点。
const { chromium } = require('playwright');
const PORT = process.env.GAME_PORT || 8793;
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage();
  const errs = [], dead = [], weird = []; let CUR = 'open'; let reqs = 0; let dls = 0;
  p.on('pageerror', e => errs.push(CUR + ' → ' + String(e.message).slice(0, 160))); p.on('dialog', d => d.dismiss()); p.on('request', () => reqs++); p.on('download', () => dls++);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !document.querySelector('.thinking') && !KEYSAVING, null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  const snap = () => p.evaluate(() => { let ls = ''; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls += k + '=' + (localStorage.getItem(k) || '').length + ';'; } } catch (_) { } const sel = window.getSelection ? String(window.getSelection()) : ''; return (document.body.innerHTML.length) + '|' + document.body.innerText + '|' + ls + '|' + (document.activeElement && (document.activeElement.id || document.activeElement.tagName)) + '|' + (document.activeElement && document.activeElement.value || '') + '|' + JSON.stringify(typeof S !== 'undefined' && S ? [S.id, S.turn, S.chat && S.chat.length] : null) + '|' + VIEW + '|' + sel + '|' + scrollY; });
  const back = async () => { if (await p.evaluate(() => VIEW !== 'game' || !S)) { const l = await p.$('[data-load]'); if (l) { await l.click(); await p.waitForTimeout(800); } } };
  // 选得出、此刻看得见、没禁用的可点物；用一条能再找到它的选择器标记
  const targets = () => p.evaluate(() => {
    const out = []; let n = 0;
    for (const el of document.querySelectorAll('button, a[href], [data-tab], [data-write], [data-goal], [data-fb], [data-load], [data-ex], summary, input[type=checkbox], select')) {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height || el.disabled || el.closest('[hidden]')) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const name = (el.id ? '#' + el.id : '') + ' ' + [...el.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value.slice(0, 20)).join(' ') + ' 「' + (el.innerText || el.value || '').trim().slice(0, 16) + '」';
      el.setAttribute('data-qa', String(++n)); out.push({ q: '[data-qa="' + n + '"]', name: name.trim(), tag: el.tagName, href: el.getAttribute('href') || '' });
    }
    return out;
  });
  // 这些点了本来就该离开或打断：点完恢复
  const RISKY = /#bHome|data-del=|data-askdel|#bStop|#bCustomClear|#bNoBocha|data-load/;
  const SKIP = /#bStart|#bCustomStart|#bSend|#bKeySave|#bBochaSave|#bWBocha\b|#bRegenGo|#bEditSave|data-fb=|#bSettle|#bRetry|#bBranch/;   // 这些会发起新的一回或保存 Key：另有专门的检测
  async function sweep(label) {
    const seen = new Set();
    for (let round = 0; round < 3; round++) {
      const list = (await targets()).filter(t => !seen.has(t.name));
      if (!list.length) break;
      for (const t of list) {
        seen.add(t.name); if (SKIP.test(t.name)) continue;
        if (t.tag === 'A' && /^https?:/.test(t.href)) continue;   // 外链不点
        CUR = label + ' ' + t.name;
        const el = await p.$(t.q); if (!el || !(await el.isVisible().catch(() => false))) continue;
        const before = await snap(); const r0 = reqs, d0 = dls;
        try {
          if (t.tag === 'SELECT') { const opts = await el.$$eval('option', o => o.map(x => x.value)); await el.selectOption(opts[opts.length - 1]); }
          else await el.click({ timeout: 3000 });
        } catch (e) { if (!/detached|not attached|intercept|outside of the viewport|Timeout/i.test(e.message)) weird.push(CUR + '：点不了 ' + e.message.slice(0, 80)); continue; }
        await p.waitForTimeout(400); if (!(await idle(120000))) weird.push(CUR + '：点完卡住两分钟');
        const after = await snap();
        if (after === before && reqs === r0 && dls === d0) dead.push(CUR);
        const vis = await p.evaluate(() => document.body.innerText).catch(() => '');
        const leak = vis.match(/【幕后】|undefined|NaN|\[object Object\]|"elapsedDays"/g); if (leak) weird.push(CUR + '：点完有怪字 ' + [...new Set(leak)].join(','));
        const err = await p.evaluate(() => [...document.querySelectorAll('.err')].map(e => e.innerText).join(' | ')).catch(() => '');
        if (err && !/没通|连不上|网络或模型抖了/.test(err)) weird.push(CUR + '：点完报错 ' + err.slice(0, 100));
        if (await p.$('#faceModal:not([hidden])')) { const c = await p.$('#faceModal [data-close], #faceModal .close, #fmClose'); if (c) await c.click().catch(() => {}); else await p.keyboard.press('Escape'); }
        if (RISKY.test(t.name) || label.startsWith('游戏')) { await back(); }
      }
    }
  }
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => { const d = document.querySelector('#dCustom'); if (d) d.open = true; });
  await sweep('首页');
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) { console.log('OPENING FAILED', JSON.stringify(errs)); await b.close(); process.exit(1); }
  await p.fill('#said', '去钞关打听今年的盐引价钱'); await p.click('#bSend'); await idle();
  for (const tab of await p.$$eval('[data-tab]', xs => [...new Set(xs.map(x => x.dataset.tab))])) {
    await back(); await p.click(`[data-tab="${tab}"]`).catch(() => {}); await p.waitForTimeout(300);
    await sweep('游戏·' + tab);
  }
  console.log('PAGE ERRORS', errs.length, JSON.stringify([...new Set(errs)], null, 1));
  console.log('DEAD', dead.length, JSON.stringify(dead, null, 1));
  console.log('WEIRD', weird.length, JSON.stringify(weird, null, 1));
  await b.close(); process.exit(errs.length || weird.length ? 1 : 0);
})();
