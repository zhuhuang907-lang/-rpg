// R-266：省钱（写戏前缀照六条一档、账册挪到对话后面，缓存命中）、秉烛夜读主题（真选）、悔一步（真点）、正文人名地名卡片（真点）、账册搜索（真输回车）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof sideFind === 'function' && typeof entCard === 'function');
  const bad = [];
  // 前缀稳定：多一回对话，前面几条一字不差
  const pf = await p.evaluate(() => { const s = newSave({ name: '李从荣', gender: '男', age: 30, role: '皇帝', gregorianYear: 934, month: 5, day: 1, place: '洛阳', polity: '后唐' });
    s.chat = []; for (let i = 0; i < 40; i++) s.chat.push({ role: i % 2 ? 'gm' : 'me', text: (i % 2 ? '正文' : '吩咐') + i + '：' + '某'.repeat(900), turn: Math.floor(i / 2), when: 'x' });
    s.turn = 19; const A = recentTurns(s, 'HEAD'); s.chat.push({ role: 'me', text: '再一回', turn: 20 }, { role: 'gm', text: '又一回正文', turn: 20, when: 'y' }); s.turn = 20; const B = recentTurns(s, 'HEAD');
    const ja = JSON.stringify(A), jb = JSON.stringify(B); let k = 0; while (k < ja.length && ja[k] === jb[k]) k++; const inp = storyInput(s, '上朝', '', '', true, null); const msgs = Array.isArray(inp) ? inp : [];
    return { same: k, total: ja.length, ledgerLast: msgs.length ? /这一局的账册（此刻）/.test(msgs[msgs.length - 1].content) && !/账册（此刻）/.test(msgs[0].content) : null }; });
  if (pf.same < pf.total * 0.6) bad.push(`多一回以后写戏材料的开头只有 ${pf.same}/${pf.total} 字一样，缓存不中`);
  if (pf.ledgerLast === false) bad.push('回回变的账册还在材料开头');
  const dz = await p.evaluate(() => { const s = newSave({ name: '李从荣', gender: '男', age: 31, role: '皇帝', gregorianYear: 935, month: 1, day: 1, place: '洛阳', polity: '后唐' });
    s.people = { 李重吉: { role: '左卫将军（解兵权）', where: '洛阳城东旧宅' }, 李嗣源: { age: 71, dead: true }, 曹氏: { age: 79 } }; s.dossiers = { 李重吉: { real: true, identity: '后唐明宗李嗣源第五子（一说），被闵帝囚于宋州，不久即被杀；李从荣此时已死'.repeat(4), state: '在世', y: 934, where: '宋州' } };
    const d = dossierBlock(s, '李重吉来了'); const tb = timeBlock(s); return { d, tb }; });
  if (!/本局（以此为准）.*洛阳城东旧宅/.test(dz.d) || dz.d.length > 900) bad.push('真人档案没先写本局、或太长：' + dz.d.slice(0, 200));
  if (/李嗣源/.test(dz.tb)) bad.push('驾崩的李嗣源还列在「身边上了年纪的」');
  await p.evaluate(() => { const s = newSave({ name: '李从荣', gender: '男', age: 30, role: '皇帝', gregorianYear: 934, month: 5, day: 1, place: '洛阳', polity: '后唐' }); s.people = { 冯道: { role: '宰相', age: 52, favor: 30 } }; s.territory = [{ place: '洛阳', troops: 3000 }];
    s.chat = [{ role: 'gm', text: '冯道在洛阳城里上朝，奏请减税。', turn: 1, when: 'x' }]; S = s; VIEW = 'game'; SIDE_FOLD = false; TAB = 'set'; render0(); });
  // 主题
  if (!(await p.$('#sTheme'))) bad.push('设置页没有主题'); else { await p.selectOption('#sTheme', 'candle'); await p.waitForTimeout(200); if ((await p.evaluate(() => document.documentElement.dataset.theme)) !== 'candle') bad.push('选了秉烛夜读没换上'); await p.selectOption('#sTheme', ''); }
  // 人名卡片
  const ent = await p.$('.ent[data-ent="冯道"]'); if (!ent) bad.push('正文里的冯道没做成可点的名字'); else { await ent.click(); await p.waitForTimeout(200); const c = await p.evaluate(() => { const e = document.querySelector('#entCard'); return e && !e.hidden ? e.innerText : ''; }); if (!/宰相/.test(c)) bad.push('点冯道没出卡片：' + c); }
  // 搜索
  await p.fill('#sideFind', '冯道'); await p.press('#sideFind', 'Enter'); await p.waitForTimeout(300); if (!(await p.$('.findHit'))) bad.push('账册里搜「冯道」没高亮');
  // 悔一步：存一份底子，改了以后点悔一步回去
  await p.evaluate(async () => { await SDB.put('prev:' + S.id, saveJSON(S)); S.turn = 99; TAB = 'set'; render0(); });
  if (!(await p.$('#bUndo'))) bad.push('设置页没有「悔一步」'); else { await p.click('#bUndo'); await p.waitForTimeout(600); const t = await p.evaluate(() => S.turn); if (t === 99) bad.push('点了悔一步没回去'); }
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
