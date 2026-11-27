// 剧情受史料表约束（R-286，2026-11-27 项目主人：「DeepSeek 不会写剧情……让它引用后台表里的东西和内容和资料和历史，不要自己随机生成」）：
// 每回写戏带【剧情底本】（大势主线此刻的阶段、本月史事、世事库、世情库，编甲乙丙丁），另起的事只许从这里取；
// 世事库只给它年份里的条目（庆历三年不出海上之盟、柔福帝姬、大晟乐；靖康开封不出临安的会子）；自己另起了事、一条底本没用上的打回
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof basisSheet === 'function' && typeof storyInput === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    const seen = (save, n) => { const T = new Set(); for (let i = 1; i <= n; i++) { save.turn = i; for (const e of eventsNow(save, 4)) T.add(e.t); } return [...T]; };
    // 庆历三年皇帝：几十年后的真事不出现
    S = newSave({ name: '赵祯', gender: '男', age: 33, role: '皇帝', gregorianYear: 1043, month: 3, day: 2, place: '东京开封府开封县', polity: '北宋', real: true });
    let T = seen(S, 80);
    const late = T.filter(t => /海上之盟|柔福|林灵素|大晟|阿云|会子|玉清昭应|鳄鱼|苗刘|靖康|方腊|花石/.test(t));
    if (late.length) bad.push('庆历三年的世事库里混进了别的年代、别处的事：' + late.slice(0, 5).join('、'));
    if (!T.length) bad.push('庆历三年一条世事都没挑出来');
    // 靖康开封富商：临安的会子不出现
    S = newSave({ name: '沈怀远', gender: '男', age: 20, role: '东京绸缎行富商之子', gregorianYear: 1126, month: 2, day: 28, place: '东京开封府开封县', polity: '北宋', real: false });
    T = seen(S, 80);
    if (T.some(t => /会子|临安|柔福|苗刘/.test(t))) bad.push('靖康开封挑出了南宋、临安的事：' + T.filter(t => /会子|临安|柔福|苗刘/.test(t)).join('、'));
    // 写戏材料里有剧情底本，编号、取材规矩、「据：」都在
    S.turn = 5; S.basisNow = null; S.mainNow = mainlineBeat(S);
    const msg = storyInput(S, '去街上走走', '', '', false, null), last = msg[msg.length - 1].content;
    if (!/【剧情底本/.test(last)) bad.push('写戏材料里没有剧情底本');
    else { if (!/甲、【大势主线】靖康之变/.test(last)) bad.push('剧情底本第一条不是此刻的大势主线（靖康之变）');
      if (!/只许从下面几条里取/.test(last) || !/据：/.test(last)) bad.push('剧情底本没写取材规矩或「据：」'); }
    // 自己另起了事、一条底本没用上：打回；注明了「据」、或正文用上了底本里的人和事：放过
    const pad = '你在铺子里坐了半晌，伙计把门板卸下一半，街上行人稀稀落落。'.repeat(12);
    const made = pad + '忽然门外有人来报，说城南一伙泼皮砸了你家的货栈，正说着，又有人上门讨债。';
    if (!basisFaults(S, '去街上走走', made, '').length) bad.push('自己另编的上门、来报没打回');
    if (basisFaults(S, '去街上走走', made, '据：甲').length) bad.push('注明了「据：甲」还打回');
    if (basisFaults(S, '去街上走走', pad + '忽然门外有人来报，说李纲罢了，太学生陈东领人伏阙上书，正说着，街上又传来消息。', '').length) bad.push('正文用上了底本里的人（李纲、陈东）还打回');
    if (basisFaults(S, '去街上走走', pad + '你把账看完，叫伙计上门板。', '').length) bad.push('没另起事的平常一回也打回');
    // 记下用了哪条，下几回轮换
    basisLog(S, '据：甲、乙'); if (!arr(S.basisUsed).length || !arr(S.basisUsed.slice(-1)[0].keys).length) bad.push('「据：」没记下来');
    return bad;
  });
  await b.close();
  const all = out.concat(errs);
  console.log('ERRS', JSON.stringify(all));
  if (all.length) process.exit(1);
})();
