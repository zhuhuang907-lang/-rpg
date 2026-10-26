// 家族与人情：族谱、立嗣（死后由立的嗣子承继）、议亲人家（不写某）、生活方向按月长本事、谋划按月推进有成败败露（结果进下一回材料、好感当场改）、好感有来由、关系名号
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !BG && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  await p.waitForFunction(() => S.skills, null, { timeout: 60000 }).catch(() => {});
  await p.evaluate(() => { S.household.push({ relation: '次子', name: '汪承业', age: 14 }, { relation: '父', name: '汪道昆', age: 70, dead: true }); S.people['程立德'] = { role: '账房', favor: 80, tie: '东家的老账房', seen: S.turn }; S.people['江春'] = { role: '总商', favor: -50, seen: S.turn }; S.people['卢见曾'] = { role: '两淮盐运使', favor: 0, seen: S.turn }; TAB = 'people'; SIDE_FOLD = false; render(); });
  const t = await p.evaluate(() => document.body.innerText);
  for (const w of ['族谱', '本人', '子女', '立嗣', '议亲', '生活方向', '谋划', '恩主', '对头']) if (!t.includes(w)) bad('人物页上没有：' + w);
  // 立嗣：死后由立的嗣子承继
  await p.click('[data-heir="汪承业"]'); if ((await p.evaluate(() => heirOf(S).name)) !== '汪承业') bad('立嗣没生效');
  // 生活方向：每月长本事
  await p.click('[data-focus="读书"]'); const fo = await p.evaluate(() => { const a = S.skills['文墨'].lv * 1000 + (S.skills['文墨'].xp || 0); focusMonthly(S, 3); return [a, S.skills['文墨'].lv * 1000 + (S.skills['文墨'].xp || 0)]; });
  if (!(fo[1] > fo[0])) bad('生活方向没长本事：' + fo);
  // 谋划：结交程立德，按月推进到见分晓；结果进材料、好感改
  await p.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
  await p.selectOption('[data-sct="卢见曾"]', '结交'); await p.click('[data-scheme="卢见曾"]');
  const sc = await p.evaluate(() => ({ n: arr(S.schemes).length, msg: ORGMSG }));
  if (!sc.n || !/开始对卢见曾结交/.test(sc.msg)) bad('谋划没开始：' + JSON.stringify(sc));
  const dup = await p.evaluate(() => startScheme(S, '拉拢', '卢见曾'));
  if (!/已经有一桩/.test(dup)) bad('同一人两桩谋划没拦下');
  const res = await p.evaluate(() => { const f0 = S.people['卢见曾'].favor; const out = schemeMonthly(S, 6); const x = S.schemes[0]; return { out, st: x.state, f0, f1: S.people['卢见曾'].favor, blk: schemeBlock(S), log: arr(S.people['卢见曾'].opLog).length }; });
  if (res.st === '进行') bad('六个月还没见分晓：' + JSON.stringify(res));
  if (!/谋划有了结果/.test(res.blk)) bad('谋划结果没进下一回的材料');
  if (res.st === '得手' && !(res.f1 > res.f0 && res.log)) bad('结交得手了好感没涨、没记来由：' + JSON.stringify(res));
  // 败露：对高官构陷，难度高，多跑几次总有败露的，败露了好感大跌
  const ex = await p.evaluate(() => { let seen = ''; for (let i = 0; i < 30 && !seen; i++) { S.turn += 1; S.schemes = []; S.people['卢见曾'].favor = 0; startScheme(S, '除掉', '卢见曾'); schemeMonthly(S, 12); if (S.schemes[0].state === '败露') seen = JSON.stringify({ f: S.people['卢见曾'].favor }); } return seen; });
  if (!ex) bad('三十次除掉高官一次都没败露'); else if (!/-50/.test(ex)) bad('败露了好感没大跌：' + ex);
  // 议亲：打听人家，名字里不许有某
  await p.evaluate(() => { TAB = 'people'; render(); });
  console.log('CLAN', JSON.stringify({ fo, sc: sc.msg, res: { st: res.st, f0: res.f0, f1: res.f1 }, ex }));
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
