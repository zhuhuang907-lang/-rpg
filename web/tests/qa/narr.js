// 正文紧扣玩家这一步、记得主角是谁和前面做过什么、字数照约定（需求台账 R-134；2026-11-05 玩家：「内容输出毫无营养，游戏对于主角的身份和前面做的事毫无了解，而且字数不对，表达相当拖延，有时候还跟看不到指令一样，说一些废话」）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof storyInput === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' });
    S.chat = [{ role: 'gm', text: '开场。王审知在福州府衙。' }, { role: 'me', text: '召翁承赞来议开海市' }, { role: 'gm', text: '翁承赞到了，说泉州蕃商愿来。他躬身退下，留下一卷海舶名册。' }, { role: 'me', text: '命王延彬整修泉州港' }, { role: 'gm', text: '王延彬领命去了泉州。' }];
    const said = '亲自去泉州看港口修得怎样';
    const T = storyInput(S, said, '', '', false, null, null), last = T[T.length - 1].content, tail = last.slice(-1400);
    // 玩家的原话在最后再交代一遍（不被前面一长串材料埋掉）
    if (!tail.includes(said)) bad.push('结尾没再交代玩家这回说的原话');
    if (!/正文就写这件事/.test(tail) || !/不铺垫|无关的材料一概不用/.test(tail)) bad.push('结尾没说只写这件事、不扯无关材料');
    // 主角是谁、前面几步做了什么
    if (!/【主角】王审知/.test(tail) || !/闽王/.test(tail)) bad.push('结尾没写主角是谁、什么身份');
    if (!/召翁承赞来议开海市/.test(tail) || !/命王延彬整修泉州港/.test(tail)) bad.push('结尾没写前面几步主角做了什么');
    if (!/王延彬领命去了泉州/.test(tail)) bad.push('结尾没写上一回停在哪');
    if (!/【字数】正文六百到一千字/.test(tail)) bad.push('结尾没写字数');
    // 字数超出一半以上，程序当毛病打回改稿（短的不管：对话停在对方说完的回合本来就短）
    const long = draftFaults(S, said, '泉州港口。'.repeat(400), ''), short = draftFaults(S, said, '到了泉州。', ''), ok = draftFaults(S, said, '你到了泉州，港口已修好一半。'.repeat(50), '');
    if (!long.some(x => /约定600到1000字/.test(x))) bad.push('正文两千字也不打回：' + JSON.stringify(long).slice(0, 200));
    if (short.some(x => /约定\d+到\d+字/.test(x))) bad.push('对话停在对方说完的短正文也按字数打回了');
    if (ok.some(x => /约定\d+到\d+字/.test(x))) bad.push('字数正常的也被打回');
    // 过一段日子的不卡字数
    if (draftFaults(S, said, '泉州港口。'.repeat(400), 'month').some(x => /约定/.test(x))) bad.push('过一段日子的长文也按字数打回了');
    return bad;
  });
  const all = out.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
