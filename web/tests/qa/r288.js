// 剧情跟时代主线、调出史书记忆、前后连贯（R-288，2026-11-28 项目主人：「游戏特别不符合时代主线，没有内容，信息不连贯，deepseek不会调去历史记忆」）：
// 推演单问「史书记忆」，程序剔掉写到将来、死人办事、戏里的人；写戏材料末尾排「此刻的时局」；节令的世事只在那几个月；
// 正文开头的半截时刻删掉；整句照抄前几回、旁白两种写法都留、替主角拿主意的打回
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof recallClean === 'function' && typeof nowBlock === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    S = newSave({ name: '沈怀远', gender: '男', age: 20, role: '东京绸缎行富商之子', gregorianYear: 1126, month: 2, day: 29, place: '东京开封府开封县', polity: '北宋', real: false });
    S.turn = 9; S.people = { 周大牛: { role: '伙计', favor: 40, seen: 9 } };
    const R = recallClean(S, ['靖康元年二月，太学生陈东率诸生伏阙上书，钦宗复用李纲', '靖康二年四月，金人掳二帝北去', '靖康元年二月，周大牛随沈家守宣泽门', '靖康元年二月，王安石上书言事', '短']);
    if (!R.some(x => /陈东/.test(x))) bad.push('史书记忆把真事也剔了：' + R.join('｜'));
    if (R.some(x => /二帝北去/.test(x))) bad.push('史书记忆留着将来的事（靖康二年）');
    if (R.some(x => /周大牛/.test(x))) bad.push('史书记忆把戏里的人当史书');
    if (R.some(x => /王安石/.test(x))) bad.push('史书记忆让早死的人办事（王安石 1086 年卒）');
    { const S2 = newSave({ name: '陈三', gender: '男', age: 30, role: '绸缎商人', gregorianYear: 1150, month: 3, day: 15, place: '临安', polity: '南宋', real: false }); const R2 = recallClean(S2, ['绍兴二十年三月，礼部贡院放榜，赐梁克家等四百余人进士及第', '绍兴二十年正月，施全刺秦桧不中，被磔于市']); if (R2.some(x => /放榜/.test(x))) bad.push('不开科的年份（绍兴二十年）史书记忆写放榜没剔'); if (!R2.some(x => /施全/.test(x))) bad.push('施全刺秦桧被剔了'); }
    const nb = nowBlock(S);
    if (!/此刻的时局/.test(nb) || !/开封解围|北撤/.test(nb) || !/复用李纲/.test(nb)) bad.push('此刻的时局没排出二月的大事：' + nb.slice(0, 200));
    const msg = storyInput(S, '去宣泽门', '', '', false, null), last = msg[msg.length - 1].content;
    if (!last.includes('【此刻的时局')) bad.push('写戏材料里没有此刻的时局');
    if (!/【史书记忆/.test(storyInput(S, '去宣泽门', '', '', false, { steps: [], recall: ['靖康元年二月，陈东伏阙'] }).slice(-1)[0].content)) bad.push('推演的史书记忆没进写戏材料');
    // 节令：二月不挑除夕、端午、中秋
    const T = new Set(); for (let i = 1; i < 80; i++) { S.turn = i; for (const e of eventsNow(S, 6)) T.add(e.t); }
    const off = [...T].filter(t => /除夕|驱傩|端午|竞渡|中秋|重阳|七夕/.test(t)); if (off.length) bad.push('二月挑到节令不对的事：' + off.join('、'));
    // 正文开头半截时刻
    if (/子时末/.test(splitStory('正月初一子时末）\n签厅里炭盆只剩一层白灰。').text)) bad.push('开头半截时刻没删');
    // 照抄前几回、两种写法、替主角拿主意
    S.turn = 9; S.chat = [{ role: 'gm', text: '阶下王敏求的袍角上落着雪，站在廊下没动，只把牒文捏紧了。' }];
    const base = '你叫孙革取纸来。'.repeat(30);
    const f1 = storyRpgCheck(S, '整顿兵马', base + '阶下王敏求的袍角上落着雪，站在廊下没动，只把牒文捏紧了。「相公？」');
    if (!f1.some(x => /照抄了前几回/.test(x))) bad.push('整句照抄前几回没打回');
    const f2 = storyRpgCheck(S, '下乡', base + '轿子到泠江渡口，过渡船；或过泠江木桥，两岸圩田水满。「老爷？」');
    if (!f2.some(x => /两种写法/.test(x))) bad.push('旁白两种写法都留着没打回');
    const f3 = storyRpgCheck(S, '叫孙革写札子给江夏县拨米', base + '孙革问拨多少。你说了数目，孙革写了。「相公？」');
    if (!f3.some(x => /替主角拿了主意/.test(x))) bad.push('替主角定了数目没打回');
    if (!storyRpgCheck(S, '给朝廷上奏请求进兵', base + '孙革问粮饷写不写实数。你定了。孙革提笔写下去。「相公？」').some(x => /替主角拿了主意/.test(x))) bad.push('「你定了。」没打回');
    if (storyRpgCheck(S, '叫孙革写札子给江夏县拨米三百石', base + '你说了数目，孙革写了。「相公？」').some(x => /替主角拿了主意/.test(x))) bad.push('玩家自己说了数目还当成替他拿主意');
    { const S3 = newSave({ name: '陈三', gender: '男', age: 30, role: '绸缎商人', gregorianYear: 1150, month: 3, day: 15, place: '临安', polity: '南宋', real: false }); S3.money = { cash: 1000, unit: '文' }; S3.econ = { unit: '文', rice: 1500, wage: 50, wageChk: 1, unitChk: 1 }; S3.chat = [];
      if (!storyRpgCheck(S3, '去茶坊', base + '邻桌说米价又起了，前日还一斗一贯七。「东家？」').some(x => /米价/.test(x))) bad.push('正文米价一斗一贯七（每石一万七）没打回');
      if (storyRpgCheck(S3, '去茶坊', base + '邻桌说米价又起了，一斗二百文。「东家？」').some(x => /米价/.test(x))) bad.push('合行情的米价也打回'); }
    return bad;
  });
  const all = out.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); if (all.length) process.exit(1);
})();
