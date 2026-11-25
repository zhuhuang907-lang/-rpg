const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 7, day: 3, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王'; S.turn = 5; S.chat = [{ role: 'gm', text: '开场' }];
    S.roster = { y: 930, pol: '闽', v: 3, at: 5, groups: [{ name: '闽', people: [{ name: '王延钧（王鏻）', post: '闽惠宗' }, { name: '陈金凤', post: '才人' }] }, { name: '后唐', people: [{ name: '李嗣源', post: '唐明宗' }] }] };
    VIEW = 'game'; TAB = 'people'; render();
    const txt = (document.querySelector('.side') || {}).innerText || '';
    return { has鏻: txt.includes('王延钧（王鏻）'), has闽王: txt.includes('闽王，933 年称帝') || txt.includes('闽王'), has惠宗: txt.includes('闽惠宗'), has唐帝: txt.includes('唐帝'), has明宗: txt.includes('唐明宗') };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
