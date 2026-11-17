// 真玩查出的五处（R-254，2026-11-17 项目主人：「必须给我修好，全部修好」）：
// 1 心里的盘算、暗中的事不写成说出口；2「过半年」是让时间走、账上照过，一仗几日时间就过几日；
// 3 当面之敌进兵马册，军务页「敌情」（真点）看得见、迎击劫营劫粮按得了；4 不立年号的（楚）照中原正朔，后汉天福接着数；
// 5 行动单不露「玩家盘算」，主角不标（虚拟），标签不标进台词
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof storyInput === 'function' && typeof applyBattle === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    const mk = () => { const s = newSave({ name: '周铁山', gender: '男', age: 38, role: '楚国马步军都指挥使', gregorianYear: 950, month: 3, day: 15, place: '潭州', polity: '楚' }); s.chat = [{ role: 'gm', text: '开场。' }]; s.turn = 6; s.settledAt = 0; return s; };
    // 1 心里的盘算
    { const s = mk(); const ruling = { acts: [{ type: '计', what: '趁两边打得最凶的时候按兵不动、保存实力' }], steps: [], risks: [] };
      const inp = storyInput(s, '暗中扩充兵马，等两边都打得精疲力竭再说', '', '', false, ruling); const txt = Array.isArray(inp) ? inp.map(m => m.content).join('\n') : String(inp);
      if (!/【主角心里的盘算、私下的打算（不是说出口的话）】/.test(txt)) bad.push('盘算没交代成心里想的');
      if (!/按兵不动、保存实力/.test(txt) || !/暗中扩充兵马/.test(txt)) bad.push('盘算、暗中的事没列进去');
      if (!/不当众说出/.test(txt)) bad.push('没写明不当众说出');
      const plain = storyInput(s, '去校场看看操练', '', '', false, { acts: [{ type: '令', what: '看操练' }], steps: [], risks: [] }); const pt = Array.isArray(plain) ? plain.map(m => m.content).join('\n') : String(plain);
      if (/【主角心里的盘算/.test(pt)) bad.push('平常的话也当成盘算了'); }
    // 2 过半年：正文交代成时间往前走，账上照过；一仗七日，时间至少过七日
    { const s = mk(); const inp = storyInput(s, '过半年，打听潭州和朗州两边谁强谁弱', '', '', false, { acts: [], steps: [], risks: [] }); const txt = Array.isArray(inp) ? inp.map(m => m.content).join('\n') : String(inp);
      if (!/【玩家要日子往前走约6个月】/.test(txt) || !/不是主角说出口的话/.test(txt)) bad.push('「过半年」没交代成时间往前走：' + (txt.match(/【玩家要日子[^\n]*/) || [''])[0]);
      const y0 = ymOf(s.clock); CUR_RULING = null; applyReply(s, { elapsedDays: 0, elapsedHours: 2, turnSummary: '审讯' }, '过半年，打听潭州和朗州两边谁强谁弱');
      if (ymOf(s.clock) - y0 < 5) bad.push('「过半年」账上没过半年：' + (ymOf(s.clock) - y0).toFixed(2) + ' 个月');
      const s2 = mk(), d0 = s2.clock.y * 400 + s2.clock.m * 31 + s2.clock.d; CUR_RULING = { battleResult: { rounds: Array.from({ length: 7 }, (_, i) => ({ nm: '第' + (i + 1) + '日' })) } };
      applyReply(s2, { elapsedDays: 0, elapsedHours: 4, turnSummary: '渡口迎战' }, '依托渡口列阵迎战'); CUR_RULING = null;
      const d1 = s2.clock.y * 400 + s2.clock.m * 31 + s2.clock.d; if (d1 - d0 < 6) bad.push('七日的仗时间没过七日：' + (d1 - d0) + ' 天'); }
    // 3 当面之敌进兵马册
    { const s = mk(); s.forces = [{ name: '直属牙兵', leader: '周铁山', troops: '800', at: '潭州长沙县' }]; s.powers = [{ name: '朗州马希萼', leader: '马希萼', troops: '约三千', seat: '朗州' }];
      applyBattle(s, { turn: 6, enemy: '马希萼（朗州军先头）', ours: 800, theirs: 3000, deadUs: 100, deadThem: 120, outcome: '小败', ourForces: ['直属牙兵'], place: '潭州长沙县北湘江渡口', rounds: [] });
      const f = arr(s.forces).find(x => x.foe); if (!f || f.owner !== '朗州马希萼' || N0(f.troops) !== 2880 || !/湘江渡口/.test(f.at)) bad.push('当面之敌没进兵马册：' + JSON.stringify(f));
      if (myForce(s, f)) bad.push('敌军被当成了自家兵马');
      applyBattle(s, { turn: 7, enemy: '马希萼（朗州军先头）', ours: 700, theirs: 2880, deadUs: 50, deadThem: 2880, outcome: '大胜', ourForces: ['直属牙兵'], place: '益阳', rounds: [] });
      if (arr(s.forces).some(x => x.foe)) bad.push('敌军打光了还留在兵马册里');
      applyBattle(s, { turn: 8, enemy: '马希萼（朗州军先头）', ours: 700, theirs: 2000, deadUs: 50, deadThem: 100, outcome: '相持', ourForces: ['直属牙兵'], place: '益阳', rounds: [] });
      S = s; VIEW = 'game'; SIDE_FOLD = false; TAB = 'board'; render0(); }
    // 4 年号：楚不立年号，照中原；后汉天福接着数，后晋出帝天福也接着数
    { const s = mk(); const e947 = eraLabel(s, 947), e946 = eraLabel(s, 946), e950 = eraLabel(s, 950); s.place.polity = '后晋'; const j943 = eraLabel(s, 943); s.place.polity = '后汉'; const h947 = eraLabel(s, 947);
      if (e947 !== '天福十二年') bad.push('楚 947 年不是天福十二年：' + e947);
      if (e946 !== '开运三年') bad.push('楚 946 年不是开运三年：' + e946);
      if (e950 !== '乾祐三年') bad.push('楚 950 年不是乾祐三年：' + e950);
      if (j943 !== '天福八年') bad.push('后晋 943 年不是天福八年：' + j943);
      if (h947 !== '天福十二年') bad.push('后汉 947 年不是天福十二年：' + h947); }
    // 5 行动单、虚拟标签
    { const s = mk(); const x = actNew(s, { type: '计', what: '玩家盘算：趁两边打得最凶的时候按兵不动' }); if (/玩家|主角|盘算：/.test(x.what)) bad.push('行动单露了内部说法：' + x.what);
      s.people = { 何敬真: { role: '都监', fic: true, seen: 1 } }; s.protagonist.real = false;
      const m = markFict(s, '何敬真道：「周铁山押到，何敬真亲审。」何敬真起身。周铁山不答。');
      if (/周铁山（虚拟）/.test(m)) bad.push('主角也标了虚拟：' + m);
      if (/「[^」]*（虚拟）[^」]*」/.test(m)) bad.push('虚拟标进了台词里：' + m);
      if (!/^何敬真（虚拟）道/.test(m)) bad.push('叙述里头一次出现的虚构人物没标：' + m); }
    return bad;
  });
  // 真点：军务页看得见当面之敌
  await p.click('[data-tab="army"]').catch(() => errs.push('军务页签点不到'));
  await p.waitForTimeout(400);
  const t = await p.evaluate(() => document.body.innerText);
  if (!/敌情/.test(t) || !/马希萼（朗州军先头）.{0,20}约1,900人/.test(t)) errs.push('军务页「敌情」看不到交过手的敌军');
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
