// 多时代界面冒烟：三国/隋唐/五代/宋/明末/清，地图与人物页能画、无 undefined/NaN、图例用当年国名
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const cases = [[220, '洛阳', '魏'], [280, '洛阳', '晋'], [350, '邺城', '赵'], [618, '长安', '唐'], [755, '长安', '唐'], [930, '福州', '闽'], [960, '开封府', '宋'], [1100, '开封府', '宋'], [1279, '大都', '元'], [1368, '应天府', '明'], [1644, '北京', '清'], [1700, '北京', '清']];
  const out = {};
  for (const [y, place, pol] of cases) {
    await p.evaluate(([y, place, pol]) => {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place, polity: pol });
      S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 2; VIEW = 'game'; TAB = 'map'; MAPZ.inited = false; MAPZ.big = false; render();
    }, [y, place, pol]);
    await p.waitForTimeout(500);
    const map = await p.evaluate(() => { const t = (document.querySelector('.side') || {}).innerText || ''; return { len: t.length, bad: (t.match(/undefined|NaN|\[object|代\/北魏王|后金\/清帝|契丹（辽）帝/g) || []).slice(0, 4), legend: (t.match(/(魏|晋|赵|唐|闽|宋|元|明|清)[^\n]{0,12}/g) || []).slice(0, 3) }; });
    await p.evaluate(() => { TAB = 'people'; render0(); });
    await p.waitForTimeout(300);
    const ppl = await p.evaluate(() => { const t = (document.querySelector('.side') || {}).innerText || ''; return { len: t.length, bad: (t.match(/undefined|NaN|\[object|某某|（）/g) || []).slice(0, 4) }; });
    out[y] = { map, ppl };
  }
  console.log(JSON.stringify({ out, errs: [...new Set(errs)].slice(0, 8) }, null, 1));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
