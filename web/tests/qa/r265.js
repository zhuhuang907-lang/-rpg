// R-265：存档进 IndexedDB（localStorage 满了、清了也读得回）、真点导出导入存档、已故真人在正文里说话打回、载入时有提示、舆图手机上竖着滑能翻页
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs'); const os = require('os');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 1000 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  const file = path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html')), html = fs.readFileSync(file, 'utf8');
  await p.goto('file://' + file); await p.waitForFunction(() => typeof SDB === 'object' && typeof deadOnStage === 'function');
  const bad = [];
  if (!/<main id="app"><div[^>]*>正在载入/.test(html)) bad.push('页面下载时没有「正在载入」的提示');
  if (!/\.mapwrap\{[^}]*touch-action:pan-y/.test(html) || !/\.mapwrap\.big\{touch-action:none/.test(html)) bad.push('舆图手势：平常该让竖滑翻页、大图该全接手势');
  // IndexedDB 存档：清掉 localStorage 也读得回
  const r = await p.evaluate(async () => { const s = newSave({ name: '周文', gender: '男', age: 30, role: '读书人', gregorianYear: 1600, month: 5, day: 1, place: '苏州府', polity: '明' }); s.title = '周文'; s.turn = 7; await store.save(s); localStorage.removeItem(LK('hrpg:save:' + s.id)); const back = await store.load(s.id); const L = await store.list();
    // 已故真人说话
    const t = newSave({ name: '刘备', gender: '男', age: 50, role: '汉中王', gregorianYear: 215, month: 5, day: 1, place: '成都', polity: '蜀' }); t.people = { 庞统: { dead: true, role: '军师' }, 法正: { role: '尚书令' } };
    return { back: back && back.turn, listed: L.some(x => x.id === s.id), d1: deadOnStage(t, '庞统拱手道：「主公，可取汉中。」'), d2: deadOnStage(t, '你想起庞统生前说过的话。法正道：「可。」'), id: s.id }; });
  if (r.back !== 7 || !r.listed) bad.push('localStorage 清掉以后存档读不回来：' + JSON.stringify(r));
  if (r.d1.join() !== '庞统') bad.push('已故的庞统开口说话没查出来');
  if (r.d2.length) bad.push('追忆已故的人也被当成出场：' + r.d2.join());
  // 真点导出
  await p.evaluate(id => store.load(id).then(s => { S = s; VIEW = 'game'; SIDE_FOLD = false; TAB = 'set'; render0(); }), r.id);
  if (!(await p.$('#bSaveExport'))) bad.push('设置页没有「导出这一局存档」');
  else { const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('#bSaveExport')]); if (!dl) bad.push('点了导出没下载'); else { const f = path.join(os.tmpdir(), 'r265-save.json'); await dl.saveAs(f); const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (j.turn !== 7 || !j.protagonist) bad.push('导出的存档不对');
      // 真点导入：改一下回合数再导回来
      j.turn = 9; j.updatedAt = Date.now() + 1000; fs.writeFileSync(f, JSON.stringify(j)); await p.setInputFiles('#fSaveImport', f); await p.waitForTimeout(800); const t2 = await p.evaluate(() => S && S.turn); if (t2 !== 9) bad.push('导入存档文件没读进来：' + t2); } }
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
