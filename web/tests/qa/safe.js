// 新加的月结、面板各自兜底（2026-11-08 玩家：「目前 bug 很多，各项游戏不流畅，全是错误」）：队伍、一家的日子、朝局账坏了，页面照画、月结照走，出错记进问题报告
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof SM === 'function');
  const r = await p.evaluate(() => { const bad = [];
    S = newSave({ name: '张三', gender: '男', age: 30, role: '佃农', real: false, gregorianYear: 1757, month: 3, day: 1, place: '江都', polity: '清' }); S.chat = [{ role: 'gm', text: '开场' }];
    S.forces = [{ name: '张家弟兄', leader: '张三', owner: '你', troops: 10, at: '江都', party: { tiers: null, heroes: 7 } }]; S.hh2 = { debt: 'x', lease: 'y' }; S.council = 5; S.econ = { unit: '两', rice: 1, wage: 0.1 };
    VIEW = 'game'; TAB = 'board'; SIDE_FOLD = false; render(); if (RENDER_ERR) bad.push('队伍、家计的账坏了，局面页整页画不出：' + RENDER_ERR);
    if (!/近来/.test(document.body.innerText)) bad.push('局面页别的部分没画出来');
    const out = SM('partyMonthly', () => partyMonthly(S)).concat(SM('hhMonthly', () => hhMonthly(S))); if (!Array.isArray(out)) bad.push('月结出错没兜住');
    const thrown = SM('试错', () => { throw new Error('故意的'); }); if (!Array.isArray(thrown) || thrown.length) bad.push('月结出错没兜住、返回不是空单');
    const errLog = JSON.stringify(arr(S.errLog || window.ERR_LOG || []).slice(-5)); return { bad, errLog }; });
  const all = r.bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
