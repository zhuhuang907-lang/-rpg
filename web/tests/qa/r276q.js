// 质量修复（R-276，2026-11-24 项目主人：「剧情极度同质化，动不动就是催收欠款，或者是有人来做同一件事，还经常少写字数和滥用pro」）：
// 连着两回同一类事第三回打回换题，但玩家自己追的事（打官司）不打回；正文太短打回写足；上门的事避开最近三回用过的类
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof draftFaults === 'function' && typeof themeOf === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    const s = newSave({ name: '周铁山', gender: '男', age: 30, role: '潭州米商', gregorianYear: 945, month: 5, day: 5, place: '潭州', polity: '楚' }); s.turn = 6; S = s;
    const dun = '县里的差役又来催征欠粮，说积欠三石，限三日完粮完税，不然追比。周铁山赔着笑，把差役让进铺子，差役翻着簿子数他的积欠。';
    s.chat = [{ role: 'gm', text: '开场。' }, { role: 'gm', text: dun }, { role: 'gm', text: dun }];
    const long = dun + '街坊们围在门口看热闹。'.repeat(60);
    const f1 = draftFaults(s, '去码头看看今天的米价', long, ''); if (!f1.some(x => /又写成「催征」/.test(x))) bad.push('连着三回催欠没打回：' + JSON.stringify(f1));
    const f2 = draftFaults(s, '去县衙把欠粮的事说清楚，求宽限几日完粮', long, ''); if (f2.some(x => /又写成/.test(x))) bad.push('玩家自己追这件事也被打回换题');
    BUSY = true; const f3 = draftFaults(s, '去码头看看', '周铁山去了码头。', ''); BUSY = false;
    if (!f3.some(x => /短于约定/.test(x))) bad.push('正文太短没打回：' + JSON.stringify(f3));
    s.hooks = [{ kind: '催债', used: true }, { kind: '访客', used: true }, { kind: '官差', used: true }, { kind: '催债', t: '又来讨债' }, { kind: '火灾', t: '邻街走水' }]; s.lastHook = 0;
    const h = pickHook(s, '在铺子里看账'); if (!h || h.kind === '催债') bad.push('上门的事又挑了最近用过的「催债」：' + JSON.stringify(h));
    return bad;
  });
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
