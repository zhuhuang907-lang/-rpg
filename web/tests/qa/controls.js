// 开关与按钮：旧版存下的「关」不再生效；影响剧情的开关不再出现；篇幅能改、能记住；
// 设置里每个按钮点了都有结果、不报错、不卡住（检查网络、联网自检第一次就出结果且只出一份、问题报告、检查更新、另存分支、换 Key）；
// 侧栏每一页都画得出来、没有怪字；正文下的建议和「找他」点了会写进输入框
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await (await b.newContext({ acceptDownloads: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('dialog', d => d.accept());
  const bad = m => errs.push(m);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear());
  // 旧版本存下的「关」
  await p.evaluate(() => localStorage.setItem('hrpg:settings', JSON.stringify({ len: 'short', world: false, search: false, deep: false, critic: false, check: false, ruling: false, hsync: false, showWork: true })));
  await p.reload(); await p.waitForTimeout(1500);
  const st = await p.evaluate(() => SETTINGS);
  for (const k of ['world', 'search', 'deep', 'critic', 'check', 'ruling', 'hsync']) if (st[k] !== true) bad(`旧版存下的 ${k}=false 还在生效`);
  if (st.showWork) bad('幕后推演还会露给玩家');
  if (st.len !== 'short') bad('篇幅设置没有沿用');
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  await p.click('[data-tab="set"]'); await p.waitForTimeout(300);
  for (const id of ['sDeep', 'sSearch', 'sWorld']) if (await p.$('#' + id)) bad('影响剧情的开关还在：' + id);
  // 篇幅能改、刷新后还在
  await p.selectOption('#sLen', 'long'); await p.reload(); await p.waitForTimeout(1500);
  if ((await p.evaluate(() => SETTINGS.len)) !== 'long') bad('篇幅改了没记住');
  await p.click('[data-tab="set"]'); await p.waitForTimeout(300);
  // 联网自检：第一次就出结果、只出一份、按钮能再点
  await p.click('#bSelfTest2');
  try { await p.waitForFunction(() => !SELFTESTING && document.querySelector('#selfBox2'), null, { timeout: 90000 }); } catch (_) { bad('联网自检点了没出结果（卡住）'); }
  if ((await p.$$('#selfBox2, #selfBox')).length !== 1) bad('联网自检结果出了不止一份');
  if (!(await p.$('#bSelfTest2:not([disabled])'))) bad('联网自检完按钮还是灰的');
  // 检查网络
  await p.click('#bNet'); try { await p.waitForFunction(() => !NETCHECKING && /DeepSeek/.test(KEYMSG), null, { timeout: 60000 }); } catch (_) { bad('检查网络没出结果：' + await p.evaluate(() => KEYMSG)); }
  // 问题报告：真的下载一个文件、不含 Key
  try { const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('#bReport')]); const fs = require('fs'); const t = fs.readFileSync(await dl.path(), 'utf8'); if (/sk-test1234/.test(t)) bad('问题报告里带了 Key'); if (t.length < 100) bad('问题报告是空的'); } catch (e) { bad('问题报告没下载：' + e.message.slice(0, 80)); }
  // 检查更新：有结果、按钮恢复
  if (await p.$('#bUpdCheck')) { await p.click('#bUpdCheck'); try { await p.waitForFunction(() => { const x = document.querySelector('#bUpdCheck'); return x && !x.disabled; }, null, { timeout: 60000 }); } catch (_) { bad('检查更新卡住'); } }
  // 另存分支：多出一局、接着玩的是分支
  const id0 = await p.evaluate(() => S.id); await p.click('[data-tab="set"]').catch(() => {}); await p.waitForTimeout(200);
  await p.click('#bBranch'); await idle(60000); await p.waitForTimeout(500);
  if ((await p.evaluate(() => S && S.id)) === id0) bad('另存分支后还在原来那一局');
  if ((await p.evaluate(async () => (await store.list()).length)) < 2) bad('另存分支后存档没有两份');
  // 换 Key 打开、收起
  await p.click('[data-tab="set"]').catch(() => {}); await p.waitForTimeout(200);
  await p.click('#bKeyOpen'); await p.waitForTimeout(100); if (!(await p.$('#kIn'))) bad('换 Key 打不开');
  await p.click('#bKeyClose'); await p.waitForTimeout(100); if (await p.$('#kIn')) bad('换 Key 收不起来');
  // 侧栏每一页
  for (const tab of await p.$$eval('[data-tab]', xs => [...new Set(xs.map(x => x.dataset.tab))])) {
    await p.click(`[data-tab="${tab}"]`).catch(() => {}); await p.waitForTimeout(150);
    const vis = await p.evaluate(() => (document.querySelector('#app') || document.body).innerText);
    const leak = vis.match(/【幕后】|undefined|NaN|\[object Object\]/g); if (leak) bad(`侧栏「${tab}」有怪字：${[...new Set(leak)].join(',')}`);
  }
  // 建议、找他：点了写进输入框，不自动发出去
  await p.click('[data-tab="board"]').catch(() => {}); await p.waitForTimeout(200);
  const chip = await p.$('[data-write]');
  if (chip) { const turn0 = await p.evaluate(() => S.turn); await p.fill('#said', ''); await p.locator('[data-write]').first().click(); await p.waitForTimeout(200); if (!(await p.inputValue('#said'))) bad('点建议没写进输入框'); if ((await p.evaluate(() => S.turn)) !== turn0 || await p.evaluate(() => BUSY)) bad('点建议直接替玩家发出去了'); }
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
