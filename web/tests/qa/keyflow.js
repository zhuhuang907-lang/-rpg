// 填 Key 的每一步：没 Key 时开始不了；粘贴带空格、引号、Bearer、全角的 Key；坏 Key 如实报；换 Key、不换了、只换型号、回车保存；
// 博查 Key 坏的、好的、关掉、重新用；页面重画时输入框里的字不丢；页面上没有重复的按钮编号；游戏里「设置」也能换 Key
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('dialog', d => d.dismiss());
  const bad = m => errs.push(m);
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const msg = () => p.evaluate(() => KEYMSG);
  const dupIds = () => p.evaluate(() => { const c = {}; for (const el of document.querySelectorAll('[id]')) c[el.id] = (c[el.id] || 0) + 1; return Object.keys(c).filter(k => c[k] > 1); });
  const saveKey = async (v, how = 'click') => { await p.fill('#kIn', v); if (how === 'enter') await p.press('#kIn', 'Enter'); else await p.click('#bKeySave'); await p.waitForFunction(() => !KEYSAVING, null, { timeout: 60000 }); await p.waitForTimeout(200); };

  if (!(await p.$('#kIn'))) bad('没 Key 时看不到填 Key 的框');
  if (!(await p.$eval('#bStart', x => x.disabled))) bad('没 Key 时「开始」不该能点');
  // 输入到一半页面重画：字和光标都不能丢
  await p.fill('#kIn', 'sk-half'); await p.focus('#kIn'); await p.evaluate(() => render()); await p.waitForTimeout(100);
  if ((await p.inputValue('#kIn')) !== 'sk-half') bad('页面重画后 Key 框里的字丢了');
  if (!(await p.evaluate(() => document.activeElement && document.activeElement.id === 'kIn'))) bad('页面重画后光标跑了');
  // 空着点保存：要说清楚
  await p.fill('#kIn', ''); await p.click('#bKeySave'); await p.waitForTimeout(200);
  if (!/粘贴/.test(await msg())) bad('空着点保存没有提示：' + await msg());
  // 坏 Key（带 Bearer 和空格）：如实报、不当成接上了
  await saveKey('  Bearer sk-bad123456 ');
  if (!/没通/.test(await msg())) bad('坏 Key 没报试连失败：' + await msg());
  if ((await dupIds()).length) bad('页面上有重复的编号：' + (await dupIds()).join(','));
  if (await p.evaluate(() => !KEY.bad)) bad('坏 Key 没标出来');
  // 好 Key，全角、带引号：清干净后保存，试连成功，「开始」能点
  await saveKey('“ｓｋ－ｇｏｏｄ12345678”');
  if (!/✓/.test(await msg())) bad('好 Key 没保存成功：' + await msg());
  const k1 = await p.evaluate(() => KEY); if (!k1.has || k1.tail !== '5678' || k1.bad) bad('Key 状态不对：' + JSON.stringify(k1));
  if (await p.$eval('#bStart', x => x.disabled)) bad('有 Key 了「开始」还是点不了');
  // 换 Key → 不换了
  await p.click('#bKeyOpen'); await p.waitForTimeout(100); if (!(await p.$('#kIn'))) bad('点「换 Key」没打开');
  await p.click('#bKeyClose'); await p.waitForTimeout(100); if (await p.$('#kIn')) bad('点「不换了」没收起');
  // 只换型号，回车保存
  await p.click('#bKeyOpen'); await p.fill('#kModel', ' DeepSeek-V4-Flash '); await p.press('#kModel', 'Enter'); await p.waitForFunction(() => !KEYSAVING, null, { timeout: 60000 }); await p.waitForTimeout(200);
  if ((await p.evaluate(() => KEY.model)) !== 'deepseek-v4-flash') bad('只换型号没换上：' + await p.evaluate(() => KEY.model) + ' ' + await msg());
  // 博查：坏 Key 如实报；好 Key 回车保存
  await p.fill('#bIn', 'bk-bad999'); await p.click('#bBochaSave'); await p.waitForFunction(() => !KEYSAVING, null, { timeout: 60000 }); await p.waitForTimeout(200);
  if (!/没通/.test(await msg())) bad('博查坏 Key 没报：' + await msg());
  await p.fill('#bIn', ' bk-good1234 '); await p.press('#bIn', 'Enter'); await p.waitForFunction(() => !KEYSAVING, null, { timeout: 60000 }); await p.waitForTimeout(200);
  if (!/✓ 博查已保存/.test(await msg())) bad('博查好 Key 没保存：' + await msg());
  if (!(await p.evaluate(() => KEY.bocha && KEY.bochaTestOk && KEY.bochaTail === '1234'))) bad('博查状态不对：' + JSON.stringify(await p.evaluate(() => KEY)));
  // 关掉博查 → 重新用
  await p.click('#bNoBocha'); await p.waitForTimeout(500);
  if (!(await p.$('#bBochaOn')) || await p.evaluate(() => KEY.bocha)) bad('关掉博查后状态不对：' + await msg());
  await p.click('#bBochaOn'); await p.waitForTimeout(800);
  if (!(await p.evaluate(() => KEY.bocha && KEY.bochaTestOk))) bad('重新用博查没用上：' + await msg());
  if ((await dupIds()).length) bad('页面上有重复的编号：' + (await dupIds()).join(','));
  // 开一局，「设置」里也能换 Key
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  for (let i = 0; i < 200 && await p.evaluate(() => BUSY || VIEW !== 'game'); i++) await p.waitForTimeout(500);
  await p.click('[data-tab="set"]').catch(() => {}); await p.waitForTimeout(300);
  if (!(await p.$('#bKeyOpen'))) bad('游戏里「设置」看不到换 Key');
  // 游戏里正写着要做的事，页面重画也不丢
  await p.click('[data-tab="board"]').catch(() => {}); await p.fill('#said', '去仪征看看'); await p.evaluate(() => render()); await p.waitForTimeout(100);
  if ((await p.inputValue('#said').catch(() => '')) !== '去仪征看看') bad('页面重画后正在写的话丢了');
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
