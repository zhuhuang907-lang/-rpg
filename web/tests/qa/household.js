// 家室合常情：四十多岁的盐商开局后照常情补上正妻、妾、子女、管家（标推算、写依据），不写「某」；长辈比本人小、儿女比本人大的年岁程序当场改
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !BG && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  // 虚构的主角（玩家选了虚构人物）：家照常情给齐
  await p.evaluate(() => { const d = document.querySelector('#dCustom'); if (d) d.open = true; });
  await p.fill('#cYear', '乾隆二十二年'); await p.fill('#cPlace', '扬州'); await p.fill('#cRole', '盐商'); await p.fill('#cName', '汪景和'); await p.selectOption('#cReal', '虚'); await p.click('#bCustomStart');
  if (!(await idle()) || !(await p.$('#said'))) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  await p.waitForFunction(() => arr(S.household).some(m => /正室|妻/.test(m.relation)), null, { timeout: 60000 }).catch(() => {});
  const h = await p.evaluate(() => ({ age: S.protagonist.age, H: arr(S.household).map(m => [m.relation, m.name, m.age, !!m.inferred, m.basis || '']), needs: familyNeeds(S) }));
  const has = re => h.H.some(m => re.test(m[0]));
  if (!has(/正室|妻/)) bad('四十多岁的盐商没有妻子：' + JSON.stringify(h));
  if (!has(/妾/)) bad('富商没有妾：' + JSON.stringify(h));
  if (!has(/子|女/)) bad('没有子女');
  if (!has(/管家|仆|婢/)) bad('大户人家没有仆婢');
  if (h.H.some(m => /某/.test(m[1]))) bad('家里人名字里有「某」：' + JSON.stringify(h.H));
  if (!h.H.some(m => m[3] && /推算|多/.test(m[4]))) bad('推出来的家里人没标推算、没写依据');
  if (h.needs.length) bad('补过一轮还缺：' + h.needs.join('、'));
  const wife = h.H.find(m => /正室/.test(m[0])), son = h.H.find(m => m[1] === '汪承裕');
  if (wife && son && !(wife[2] >= son[2] + 16)) bad('正妻比儿子大不到十六岁：' + JSON.stringify([wife, son]));
  const fx = await p.evaluate(() => { S.household.push({ relation: '母', name: '吴氏', age: 20 }, { relation: '长子', name: '汪大成', age: 60 }); const r = familyAgeFix(S); return { r, m: S.household.find(x => x.name === '吴氏').age, c: S.household.find(x => x.name === '汪大成').age, me: S.protagonist.age }; });
  if (!(fx.m >= fx.me + 15)) bad('母亲比本人还小，没改：' + JSON.stringify(fx));
  if (!(fx.c <= fx.me - 14)) bad('儿子比本人还大，没改：' + JSON.stringify(fx));
  // 人物一律大量博查（维基只查天下大势）：这里把博查 Key 存上，家谱、身边人都从博查来
  { const k = await p.evaluate(async () => { const r = await api('/api/quick-key', { bochaKey: 'bk-good1234' }); await refreshKey(); SEARCH_OFF = ''; SEARCH_DOWN = 0; return { r, bocha: KEY && KEY.bocha, can: canSearch() }; }); console.log('BOCHAKEY', JSON.stringify(k).slice(0, 400)); if (!k.bocha) bad('博查 Key 没存上：' + JSON.stringify(k).slice(0, 300)); }
  // 史书真人：家里人只照史料，查不到的不添、不推
  const rr = await p.evaluate(async () => { const s = JSON.parse(JSON.stringify(S)); s.protagonist.real = true; s.household = []; s.famRec = false; const due = familyDue(s); const add = await familyFix(s); return { due, add, hh: s.household.map(m => m.relation + m.name + '|' + (m.basis || '')) }; });
  if (rr.hh.some(h => /推/.test(h.split('|')[1] || '') && !/管家|仆|婢|丫鬟/.test(h)) || rr.hh.some(h => /正室|妾|程婉贞/.test(h))) bad('真人主角被按常情添了家里人：' + JSON.stringify(rr));
  // 真人主角的身份、家谱照史料全列（单独一回调用）：字号籍贯履历、已故的祖父、日后才出生的子女到年照记（CLAUDE.md「人物」）
  { const g = await p.evaluate(async () => { const s = JSON.parse(JSON.stringify(S)); s.protagonist.real = true; s.household = []; s.famRec = false; s.famPlan = []; try { await familyFix(s); } catch (e) { return { err: JSON.stringify(e) + String(e && e.message || '') }; } const plan = s.famPlan.map(m => m.name).join(); s.clock.y += 3; famPlanTick(s); return { id: s.protagonist.ident, dead: s.household.filter(m => m.dead).map(m => m.name), plan, born: s.household.filter(m => /史载这一年出生/.test(m.note || '')).map(m => m.name) }; });
    if (g.err) bad('查家谱出错：' + g.err);
    if (!g.id || g.id.zi !== '景和' || !g.id.career.length) bad('真人主角的字号、履历没照史料记下：' + JSON.stringify(g.id));
    if (!g.dead.includes('汪廷璋')) bad('史载已故的亲属没列进家谱：' + JSON.stringify(g));
    if (!/汪承禧/.test(g.plan) || !g.born.includes('汪承禧')) bad('日后才出生的子女没到年照记：' + JSON.stringify(g)); }
  // 大量博查，DeepSeek 只整理博查搜到的：材料里没有的名字不收；身边人照史料列上；查家谱时一次博查二十来条问法、不问维基（CLAUDE.md「人物」）
  { const c = await p.evaluate(async () => { const s = JSON.parse(JSON.stringify(S)); s.protagonist.real = true; s.household = []; s.famRec = 0; s.people = {}; await familyFix(s); return { hh: s.household.map(m => m.name), ppl: Object.keys(s.people), rec: s.famRec, due: familyDue(s) }; });
    if (c.hh.includes('汪假人')) bad('材料里没有的家里人被收进来了：' + JSON.stringify(c));
    if (!c.hh.includes('汪景明')) bad('博查搜到的兄弟没列上：' + JSON.stringify(c));
    { let wl = ''; try { wl = require('fs').readFileSync('wiki.log', 'utf8'); } catch (_) {} if (/汪景和|江春|程晋芳/.test(wl)) bad('查人物还去问了维基（维基只查天下大势）'); }
    { const lg = require('fs').readFileSync('bocha.log', 'utf8').split('\n').filter(l => /汪景和/.test(l)).length; if (lg < 15) bad('查家谱、身边人博查用得太少：' + lg + ' 条'); }
    if (!c.ppl.includes('江春') || !c.ppl.includes('程晋芳') || c.ppl.includes('编造部将')) bad('身边的人没照史料列，或收了材料里没有的人：' + JSON.stringify(c));
    if (c.due) bad('家谱查完了还说要查'); }
  // 旧存档（标了查过的老版本）也要照新办法再查一遍
  if (!(await p.evaluate(() => { const s = JSON.parse(JSON.stringify(S)); s.protagonist.real = true; s.famRec = true; return familyDue(s); }))) bad('旧存档不会照新办法重查家谱');
  // 人物页：天下名录（宗室王公、中枢、各地大员），只列有出处的真人
  { await p.evaluate(() => { TAB = 'people'; SIDE_FOLD = false; render(); }); await p.waitForFunction(() => S.roster || S.rosterFail != null, null, { timeout: 60000 }).catch(() => {});
    const r = await p.evaluate(() => { render(); const t = document.querySelector('.roster'); return { txt: t ? t.textContent : '', n: arr(S.roster && S.roster.groups).length }; });
    if (!/傅恒/.test(r.txt) || /某大臣|编造大员/.test(r.txt)) bad('人物页没有天下名录、或混进了没出处的人：' + JSON.stringify(r).slice(0, 300)); }
  // 默认开局就是真人主角：后院不能空——史书只记姓氏的照写不改名，府里的下人补上并标虚构（CLAUDE.md「人物」）
  if (!rr.hh.some(h => /^母吴氏\|/.test(h))) bad('史书只记姓氏的家里人被丢了或被改了名：' + JSON.stringify(rr));
  if (!rr.hh.some(h => /^子汪承裕/.test(h))) bad('史载的儿子没记上：' + JSON.stringify(rr));
  { const st = await p.evaluate(async () => { const s = JSON.parse(JSON.stringify(S)); s.protagonist.real = true; s.household = []; s.famRec = false; await familyFix(s); return s.household.filter(m => /管家|仆|婢|丫鬟/.test(m.relation)).map(m => [m.relation, m.name, !!m.fic, m.note]); });
    if (!st.length || st.some(x => !x[2] || !/虚构/.test(x[3]))) bad('真人主角的后院没人使唤，或下人没标虚构：' + JSON.stringify(st)); }
  // 每回合当场审：写一回，常理审查就跟着审一次（不是隔几回）
  const n0 = (() => { try { return require('fs').readFileSync('logic.log', 'utf8').split('\n').filter(Boolean).length; } catch (_) { return 0; } })();
  await p.fill('#said', '去账房看看今年的账'); await p.click('#bSend'); if (!(await idle())) bad('这一回卡住');
  const n1 = (() => { try { return require('fs').readFileSync('logic.log', 'utf8').split('\n').filter(Boolean).length; } catch (_) { return 0; } })();
  if (!(n1 > n0)) bad('这一回没有当场做常理审查');
  // 常理审查：年岁离谱的人程序先挑出来，通读后改账、记进定本
  const lg = await p.evaluate(async () => { S.people['老账房'] = { role: '账房', age: 150, seen: S.turn }; const hard = logicFaults(S); const done = await logicAudit(S); return { hard, done, age: S.people['老账房'].age, canon: arr(S.canon).some(c => /更正/.test(c.text)) }; });
  if (!lg.hard.some(x => /老账房年岁写成150/.test(x))) bad('一百五十岁的人程序没挑出来：' + JSON.stringify(lg.hard));
  if (lg.age !== 60 || !lg.canon) bad('常理审查没改账、没记进定本：' + JSON.stringify(lg));
  await p.click('[data-tab="people"]'); await p.waitForTimeout(400);
  if (!/推算/.test(await p.evaluate(() => document.body.innerText))) bad('家室表上看不到推算的标记');
  console.log('HOUSE', JSON.stringify(h));
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
