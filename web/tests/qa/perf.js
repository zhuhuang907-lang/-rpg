// 测每回合要等多久（配 LAT=1 的假 AI）：打印每回的用时，和每次 AI 调用的时间线
const { chromium } = require('playwright'); const fs = require('fs');
const TURNS = Number(process.argv[2] || 4);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined }); const p = await (await b.newContext()).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.dismiss());
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8741) + '/'); await p.waitForTimeout(1500);
  await p.evaluate(s => { localStorage.clear(); localStorage.setItem('hrpg:tscale', s); }, String(0.1 * Number(process.env.LAT || 1))); await p.reload(); await p.waitForTimeout(1500);   // 假 AI 是真实的 LAT/10 倍慢，等待时限也照比例缩
  const idle = async (ms = 900000) => { try { await p.waitForFunction(() => !document.querySelector('.thinking') && !document.querySelector('.banner.thinking') && !BUSY, null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  console.log('TSCALE', await p.evaluate(() => TSCALE));
  let t = Date.now(); await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  await p.waitForSelector('#said', { timeout: 900000 }); await idle(); console.log('OPEN', ((Date.now() - t) / 1000).toFixed(1) + 's');
  const ins = ['去仪征看看盐栈', '找程立德问亏空的事', '给运司书吏送二百两', '带承裕去拜会卢见曾', '置办二十亩田', '在家歇着'];
  const times = [];
  for (let i = 0; i < TURNS; i++) {
    await p.waitForTimeout(Number(process.env.READ || 0));   // 玩家读这一回的工夫
    const bg0 = await p.evaluate(() => BG_STEP || '');
    t = Date.now(); await p.fill('#said', ins[i % ins.length]); if (process.env.SPANS) await p.selectOption('#span', ['auto', 'xun', 'month', 'season', 'year'][i % 5]).catch(() => {}); await p.click('#bSend');
    const phases = []; let last = '';
    const poll = setInterval(async () => { try { const ph = await p.evaluate(() => (BGWAIT ? 'bgwait:' + BG_STEP : PHASE) || ''); if (ph !== last) { phases.push(((Date.now() - t) / 1000).toFixed(1) + ':' + ph); last = ph; } } catch (_) {} }, 250);
    await p.waitForTimeout(800); await idle(); clearInterval(poll);
    times.push((Date.now() - t) / 1000);
    console.log('TURN', i + 1, ((Date.now() - t) / 1000).toFixed(1) + 's', 'bg-before=' + bg0, phases.join(' '));
  }
  const m = await p.evaluate(async () => { const r = {}; let t = performance.now(); for (let i = 0; i < 10; i++) render(); r.renderMs = +((performance.now() - t) / 10).toFixed(1);
    for (const tab of ['people', 'estate', 'news', 'world', 'chron', 'geo', 'board']) { TAB = tab; t = performance.now(); render(); r['tab_' + tab] = +(performance.now() - t).toFixed(1); }
    t = performance.now(); await store.save(S); r.saveMs = +(performance.now() - t).toFixed(1); r.kb = Math.round(JSON.stringify(S).length / 1024); r.chat = S.chat.length; return r; });
  console.log('UI', JSON.stringify(m));
  console.log('PAGE ERRORS', errs.length, errs.slice(0, 5));
  // 照真实的慢缩成十分之一：一回合超过 PERF_MAX 秒（默认 34，即真实约五分钟（含重写一次））就算不合格
  const worst = Math.max(...times), MAX = Number(process.env.PERF_MAX || 34);
  console.log(errs.length === 0 && worst <= MAX ? 'PERF OK' : 'PERF FAIL', 'worst ' + worst.toFixed(1) + 's');
  await b.close();
})();
