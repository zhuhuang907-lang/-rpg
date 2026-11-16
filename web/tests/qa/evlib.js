// 世事库接进游戏（R-241）：930 年的兵、800 年的官、190 年的商人各拿到本年代、对身份的两件事当写戏材料；清代没有世事库不出这块；每回轮换
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof eventsNow === 'function');
  const bad = await p.evaluate(() => { const bad = [], mk = (role, pol, y, pl) => { const s = newSave({ name: '韩熙', gender: '男', age: 32, role, gregorianYear: y, month: 3, day: 1, place: pl, polity: pol }); s.chat = [{ role: 'gm', text: '开场。' }]; return s; };
    if (EVLIB.length < 3) bad.push('世事库没嵌进游戏：' + EVLIB.length);
    for (const [role, pol, y, pl, want] of [['牙兵', '后唐', 930, '洛阳', /兵|将|小校/], ['监察御史', '唐', 800, '长安', /官|县令|朝臣/], ['行商', '汉', 190, '洛阳', /商|行旅/]]) {
      const s = mk(role, pol, y, pl), L = eventsNow(s);
      if (L.length !== 2) bad.push(`${y} 年${role}没拿到两件世事：` + L.length);
      if (L.some(e => !e.who.some(w => want.test(w)))) bad.push(`${y} 年${role}拿到的事和身份不对：` + L.map(e => e.t + e.who).join('；'));
      const t = blocks(s, true); if (!/【这年代这类人可能碰上的事/.test(t)) bad.push(`${y} 年${role}写戏材料里没有世事那块`);
      s.turn = 5; const L2 = eventsNow(s); if (L2.map(e => e.t).join() === L.map(e => e.t).join()) bad.push('换了一回，世事没轮换'); }
    // 人物关系（任务十）：朝里有李克用、李嗣昭的，写戏材料里有他俩的养父子关系；关系年份在开局之后的不给
    { const s = mk('牙兵', '晋', 905, '太原'); s.people = { 李克用: { name: '李克用' }, 李嗣昭: { name: '李嗣昭' } };
      if (TIESLIB.length < 100) bad.push('人物关系没嵌进游戏：' + TIESLIB.length);
      const t = blocks(s, true); if (!/【史书里这些人之间的关系[\s\S]*李克用与李嗣昭/.test(t)) bad.push('李克用、李嗣昭的关系没进写戏材料');
      if (tiesNow(s).some(x => x.year > 905)) bad.push('给了开局年份以后才发生的关系'); }
    const q = mk('扬州盐商', '清', 1757, '扬州'); if (/【这年代这类人可能碰上的事/.test(blocks(q, true))) bad.push('清代没有世事库却出了这块');
    return bad; });
  errs.push(...bad); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
