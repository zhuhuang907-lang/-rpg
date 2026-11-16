// 游戏读时代世情库（任务十二，R-231、R-232）：主角此刻沾着的活法当材料给写戏（930 年牙兵认出牙兵、藩镇牙兵），称呼里的「某」换成〔姓〕；
// 库里没有的年代、自己编的行当照旧走，不报错、不拦
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof waysNow === 'function');
  const bad = await p.evaluate(() => { const bad = [], mk = (role, pol, y, pl) => { const s = newSave({ name: '韩熙', gender: '男', age: 32, role, gregorianYear: y, month: 3, day: 1, place: pl, polity: pol }); s.chat = [{ role: 'gm', text: '开场。' }]; return s; };
    if (ROLESLIB.length < 5) bad.push('世情库没嵌进游戏：' + ROLESLIB.length);
    const s1 = mk('牙兵', '后唐', 930, '洛阳'), w1 = waysNow(s1).map(w => w.name);
    if (!w1.some(n => /牙兵/.test(n))) bad.push('930 年牙兵没认出牙兵这一行：' + JSON.stringify(w1));
    const t1 = blocks(s1, true); if (!/【这一年代这类人的活法/.test(t1)) bad.push('写戏材料里没有活法这一块');
    if (!/不是白名单/.test(t1)) bad.push('活法那块没写明是材料、不拦玩家');
    const blk = (t1.match(/【这一年代这类人的活法[\s\S]*?(?=\n【|$)/) || [''])[0]; if (/某/.test(blk)) bad.push('活法材料里还有「某」：' + blk.slice(0, 200));
    const s2 = mk('扬州盐商', '清', 1850, '扬州'); let t2 = ''; try { t2 = blocks(s2, true); } catch (e) { bad.push('没有世情库的年代出错：' + e.message); }
    if (/【这一年代这类人的活法/.test(t2)) bad.push('1850 年没有世情库，却出了活法那块');
    const s3 = mk('捕蛇人', '后唐', 930, '洛阳'); try { blocks(s3, true); waysNow(s3); } catch (e) { bad.push('库里没有的行当出错：' + e.message); }
    return bad; });
  errs.push(...bad); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
