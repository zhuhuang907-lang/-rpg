// R-193：整个游戏不写「不详」（守军、兵数、年岁、品级照制度和常情推、标约）；朝局没整理就当场自动整理，不让玩家去按
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof garrisonGuess === 'function');
  const bad = [];
  const who = [['皇帝', '赵顼', 1070, '开封', '北宋'], ['知县', '张三', 1600, '苏州府吴县', '明'], ['佃农', '李四', 1750, '扬州府江都县', '清'], ['山大王', '王五', 1630, '延安府', '明']];
  for (const [role, nm, y, pl, pol] of who) {
    const txt = await p.evaluate(async ([role, nm, y, pl, pol]) => { let built = 0; window.callClaude = async () => ({ text: '{}' }); window.buildOrg = async s => { built++; };
      S = newSave({ name: nm, gender: '男', age: 40, role, real: false, gregorianYear: y, month: 5, day: 1, place: pl, polity: pol }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
      S.household = [{ relation: '长子', name: nm.slice(0, 1) + '大郎' }, { relation: '妻', name: '某氏' === '' ? '' : nm.slice(0, 1) + '门周氏' }, { relation: '母', name: '老夫人钱氏' }];
      S.powers = [{ name: '邻国', leader: '', stance: '敌' }]; S.forces = [{ name: '本部', owner: '你', troops: 3000, at: pl, morale: 60 }];
      VIEW = 'game'; SIDE_FOLD = false; const out = [];
      for (const tab of ['board', 'people', 'army', 'court', 'power', 'estate', 'career', 'world', 'news', 'chron']) { TAB = tab; try { render(); } catch (e) { out.push(tab + '崩：' + e.message); continue; } const t = document.body.innerText; const i = t.indexOf('不详'); if (i >= 0) out.push(tab + '页：…' + t.slice(Math.max(0, i - 30), i + 10).replace(/\n/g, ' ') + '…'); }
      await new Promise(r => setTimeout(r, 50)); return { out, built }; }, [role, nm, y, pl, pol]);
    for (const x of txt.out) bad.push(`${role}：${x}`);
    if (/皇帝|知县/.test(role) && !txt.built) bad.push(`${role}打开朝局没自动整理人事树`);
  }
  // 推出来的数
  const r = await p.evaluate(() => ({ g: garrisonGuess(S, '延安府').troops, a: ageGuessOf(S, { relation: '长子' }), m: ageGuessOf(S, { relation: '母' }), rk: titleRankGuess('知县'), pw: powTroopsGuess(S, '邻国') }));
  if (!(r.g > 0) || r.a !== 16 || r.m !== 66 || r.rk !== 7 || !(r.pw >= 5000)) bad.push('推出来的数不对：' + JSON.stringify(r));
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
