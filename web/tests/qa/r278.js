// 全面优化（R-278，2026-11-26 项目主人：「查一下上传的内容，好的就用，给我全面优化，尤其是地图交互，剧情，和朝局以及经济线和打字问题」）：
// 价目照米价过常识关（史料载值不动）；剧情调度的议程一掷掷得出来、同一件事不重发；朝局页（真点）是新的五席卡、不摆画像
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof econSane === 'function' && typeof plotDir === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    // 价目常识关
    { const E = { unit: '文', rice: 600, wage: 900, landPrice: 5, cloth: 900, yield: 30, rentRate: 1.5, interest: 0.3, juan: 50, basis: '推' };
      econSane(E);
      if (E.wage !== 120) bad.push('一天工钱比一石米还贵没收回：' + E.wage);
      if (E.landPrice !== 300) bad.push('一亩田才五文没收回：' + E.landPrice);
      if (E.yield !== 5 || E.rentRate !== 0.7 || E.interest !== 0.1) bad.push('亩产、租率、月息出界没收回：' + JSON.stringify(E));
      if (E.juan !== 6000) bad.push('捐出身比几石米还便宜没收回：' + E.juan);
      if (!/照米价对过常识/.test(E.basis)) bad.push('收回的没记进依据');
      const E2 = { unit: '文', rice: 600, wage: 900, fromPreset: ['wage'] }; econSane(E2); if (E2.wage !== 900) bad.push('史料载值也被改了'); }
    // 剧情调度：议程一掷
    { const s = newSave({ name: '周文', gender: '男', age: 35, role: '吴县知县', gregorianYear: 1600, month: 6, day: 5, place: '苏州府吴县', polity: '明' });
      s.people = {}; for (let i = 0; i < 6; i++) s.people['钱允' + '甲乙丙丁戊己'[i]] = { role: '乡绅', plan: '想把县里的漕折包下来', seen: 1 };
      let hit = '', n = 0; for (let k = 0; k < 40; k++) { s.turn = k; s.clock.m = 1 + (k % 12); s.clock.y = 1600 + Math.floor(k / 12); s.newsFresh = []; const r = plotDir(s); if (/议程到了/.test(r)) { n++; hit = hit || r; } }
      if (n < 2) bad.push('有盘算的人四十个月里只动了 ' + n + ' 回（走过一回就不再动了）');
      if (!/议程到了/.test(hit)) bad.push('有盘算的人四十回里一回也没主动走一步');
      const again = plotDir(s); if (again && /议程到了/.test(again)) bad.push('同一个月同一件事又发了一遍'); }
    const s = newSave({ name: '李嗣源', gender: '男', age: 60, role: '后唐皇帝', real: true, gregorianYear: 930, month: 6, day: 1, place: '洛阳', polity: '后唐' }); s.idm = 'emperor'; s.chat = [{ role: 'gm', text: '开场。' }]; s.turn = 3;
    S = s; VIEW = 'game'; SIDE_FOLD = false; TAB = 'board'; render0();
    return bad;
  });
  await p.click('[data-tab="court"]').catch(() => errs.push('朝局页签点不到'));
  await p.waitForTimeout(500);
  const c = await p.evaluate(() => ({ seat: !!document.querySelector('.ck-court, .ck-seat'), face: document.querySelectorAll('canvas[data-face-npc], .ck-face').length, txt: document.body.innerText.slice(0, 3000) }));
  if (!c.seat) errs.push('朝局页没有中枢五席卡');
  if (c.face) errs.push('朝局页又摆了画像（项目主人定过不要图片）：' + c.face);
  if (/undefined|NaN|\[object Object\]/.test(c.txt)) errs.push('朝局页露了 undefined/NaN');
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
