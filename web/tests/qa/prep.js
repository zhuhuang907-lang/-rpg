// 开局一次查齐：开场写完以后挡着输入框，把后台该做的一口气做完（没做成的当场再做，最多三轮），做完才放玩家走第一步；界面不写「上回没推成」「下一回再查」（CLAUDE.md「发布与仓库」开局一次查齐）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  // 开场写完以后：先进入「查齐」，这时还不让走下一步
  await p.waitForFunction(() => typeof PREP !== 'undefined' && (PREP || (S && S.econ)), null, { timeout: 300000, polling: 200 }).catch(() => {});
  const mid = await p.evaluate(() => ({ prep: !!PREP, busy: BUSY, txt: (document.querySelector('.thinking') || {}).innerText || '' }));
  if (mid.prep && (!mid.busy || !/一次查齐/.test(mid.txt))) bad('查齐的时候没挡着输入框、没写在查什么：' + JSON.stringify(mid));
  await p.waitForFunction(() => !PREP && !BUSY && S && document.querySelector('#said'), null, { timeout: 600000, polling: 300 });
  const after = await p.evaluate(() => ({ econ: !!S.econ, fam: S.famQ != null || arr(S.household).length > 0 || !familyDue(S), est: !S.estateDue, left: bgJobs(S, null, null).filter(j => { try { return j.due() && !/^(press|agenda|compact|world|sync|pol|digest)$/.test(j.id); } catch (_) { return false; } }).map(j => j.id), body: document.body.innerText }));
  if (!after.est) bad('查齐放行了，家底还没立');
  if (after.left.length > 3) bad('查齐放行时还有一堆没做：' + after.left.join('、'));
  if (/上回没推成|下一回再查|下一回就能办|再点一次试试/.test(after.body)) bad('界面还写着上回没推成、下一回再查');
  console.log('PREP', JSON.stringify({ mid: mid.prep, left: after.left })); console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
