// 流畅与框架（R-281，2026-11-27 项目主人：「你总结一下问题，针对性的解决……你给我改成流畅的」「做完你说的」）：
// 身份不只靠词表（开局模型判的「一国之君」程序认）；底账米价里荒年围城的极端价不当常价；先定数后写（打字花钱程序先扣、记账不重记）；写完的收尾合成一道；读的时候先查下一回
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof identityOf === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    // 一、词表漏掉的一国之君：开局模型判了 emperor 就认；妃嫔、皇子不认
    { const T = newSave({ name: '勾践', gender: '男', age: 30, role: '越国大王', gregorianYear: -494, month: 3, day: 1, place: '会稽', polity: '越' }); T.idm = 'emperor'; if (!identityOf(T).ruler) bad.push('开局判了一国之君，词表漏掉就不认：' + JSON.stringify(identityOf(T).power));
      const U = newSave({ name: '某', gender: '女', age: 20, role: '越王的宠妃', gregorianYear: -494, month: 3, day: 1, place: '会稽', polity: '越' }); U.idm = 'emperor'; if (identityOf(U).ruler) bad.push('宠妃也当成一国之君'); }
    // 二、底账米价：荒年、围城的极端价不当常价（一段里高出常年价八倍以上的没有了；宋、明、清手修过的不动）
    for (const R of PRESETLIB) { const v = arr(R.prices).map(x => x.rice).filter(Boolean).sort((a, b) => a - b); if (v.length < 10) continue; const q1 = v[Math.floor(v.length / 4)]; if (v[v.length - 1] > q1 * 8.5) bad.push(`${R.era} 底账还有离谱的高价：${v[v.length - 1]}（常年约${q1}）`); }
    return bad;
  });
  const bad = out.concat(errs);
  console.log('ERRS', JSON.stringify(bad));
  await b.close();
  if (bad.length) { console.log('!! 不合格'); process.exit(1); }
  console.log('流畅与框架这一批修好');
})();
