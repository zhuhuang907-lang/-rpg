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
    // 三、先定数后写：打字明说了数目的花销程序先扣，不够不扣；借进来、打听价钱不算；记账里同一笔不再扣一遍
    { const T = newSave({ name: '陈阿大', gender: '男', age: 30, role: '织户', gregorianYear: 1560, month: 3, day: 15, place: '苏州府长洲县', polity: '明' }); T.chat = [{ role: 'gm', text: '开场' }]; T.turn = 9;
      T.money = { cash: 20, unit: '两' };
      textSpend(T, '有人来借钱，说是同乡，借给他十两。'); if (T.money.cash !== 10 || !arr(T.cashNow).length) bad.push('借给他十两没先扣：' + T.money.cash);
      textSpend(T, '再拿出五千两去赁铺面。'); if (T.money.cash !== 10 || !/拿不出/.test(arr(T.cashNow).map(x => x.line).join())) bad.push('钱不够也扣了、或没说拿不出：' + T.money.cash);
      const c0 = T.money.cash; textSpend(T, '向钱庄借三十两。'); textSpend(T, '问问城里铺面一年租金多少两。'); if (T.money.cash !== c0) bad.push('借进来、打听价钱也扣了钱：' + T.money.cash);
      T.cashNow = [{ turn: T.turn, amt: 10, line: '借给他十两' }]; T.money.cash = 10;
      try { applyReply(T, { reply: '你把十两银子递给何阿三。', mode: 'play', ledger: [{ item: '借给何阿三', amount: -10, note: '' }] }, '借给他十两。'); } catch (e) { bad.push('记账出错：' + e.message); }
      if (T.money.cash !== 10) bad.push('程序先扣了的，记账又扣一遍：' + T.money.cash);
      const U = newSave({ name: '沈怀远', gender: '男', age: 20, role: '富商之子', gregorianYear: 1126, month: 1, day: 15, place: '东京开封府', polity: '宋' }); U.money = { cash: 150000, unit: '文' }; U.turn = 3;
      textSpend(U, '拿出五十贯给庄上买粮。'); if (U.money.cash !== 100000) bad.push('贯折文没扣对：' + U.money.cash); }
    // 四、收尾一道：戏外话、开头时刻、整句重复、删句残渣一次理完；正常的标点不动
    { const T = '（建炎三年正月初二酉时，封丘县衙正堂）赵不群把茶碗搁下，。他道：「你来了。」，你点了头。「」\n\n「陈大官，我托齐门一个熟人问过了，周市那边姓沈的倒有几个。」\n\n「陈大官，我托齐门一个熟人问过了，周市那边姓沈的倒有几个。」\n\n【戏外】这里得停一下。';
      const g = cleanStory(T); if (/戏外|建炎三年正月初二|，。|「」/.test(g) || g.split('托齐门').length !== 2) bad.push('收尾没理干净：' + JSON.stringify(g));
      const N = '他说：「好，就这么办。」你点了头，转身出门。他应了声「是」，退了出去。'; if (cleanStory(N) !== N) bad.push('正常的句子被收尾改了：' + cleanStory(N)); }
    return bad;
  });
  const bad = out.concat(errs);
  console.log('ERRS', JSON.stringify(bad));
  await b.close();
  if (bad.length) { console.log('!! 不合格'); process.exit(1); }
  console.log('流畅与框架这一批修好');
})();
