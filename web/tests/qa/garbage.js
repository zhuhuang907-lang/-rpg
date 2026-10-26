// 新系统吃乱数据：四种身份 × 记账给出各种怪格式的新字段（国势、阶层、时政、军令、人事、本事、差事……）× 每个侧栏；不许报错、不许露出 undefined、NaN、[object Object]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof applyReply === 'function' && typeof courtTab === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    const G = [null, undefined, '', 'x', 0, -5, 1e12, NaN, [], {}, [null], [{}], ['字符串'], { a: 1 }, true, '[object Object]'];
    const R = a => a[Math.floor(Math.random() * a.length)];
    const junkList = (shape) => [null, 'x', [], [null, 'x', 3], [shape], [Object.fromEntries(Object.keys(shape).map(k => [k, R(G)]))]];
    const base = role => ({ id: 'g' + role, v: 2, turn: 3, title: 't', protagonist: { name: '汪景和', role: role === 'ruler' ? '皇帝' : role === 'local' ? '江都县知县' : role === 'mil' ? '扬州营游击' : '盐商', age: 41, gender: '男' }, idm: role === 'ruler' ? 'emperor' : role === 'local' ? 'official' : 'commoner',
      career: role === 'local' ? { office: '江都县知县', rank: '正七品' } : role === 'mil' ? { office: '扬州营游击', rank: '从三品' } : null,
      clock: { y: 1757, m: 3, d: 6, h: 10, yearLabel: '乾隆二十二年' }, place: { full: '扬州府江都县', polity: '清' }, people: { 程立德: { role: '账房', seen: 2, favor: 10 } }, household: [{ relation: '正室', name: '程氏', age: 38 }], chat: [{ role: 'gm', kind: 'play', text: '开场', turn: 0 }], dossiers: {}, money: { unit: '两', cash: 1000, hist: [] }, estate: { income: [], expense: [], assets: [] }, world: { overview: '', events: [], upcoming: [], ripples: [] },
      canon: [], deeds: [], chronicle: [], summaries: [], orders: [], goals: [], status: {}, statusLog: [], prices: [], powers: [], territory: [], forces: role === 'mil' || role === 'ruler' ? [{ name: '标营', leader: '汪景和', units: [{ tpl: 't1', n: 2 }], troops: 1000, grain: 3000 }] : [], factions: [],
      unitTypes: [{ id: 't1', name: '营兵', size: 500, atk: 40, def: 50, shock: 30, org: 50, mob: 40, pay: 1.5, grain: 0.5, months: 3 }],
      org: { regime: '清', nodes: [{ id: 'root', name: '朝廷', depth: 0, path: true, posts: [{ title: '皇帝', holder: '弘历' }] }, { id: 'A1', name: '户部', depth: 1, parent: 'root', posts: [{ title: '尚书', holder: '李允中', src: '拟', quota: 2 }] }], log: [] },
      gov: role === 'ruler' || role === 'local' ? { scope: role === 'ruler' ? 'realm' : 'local', keys: role === 'ruler' ? GOV_KEYS : LOCAL_KEYS, unit: '两', stats: {}, basis: {}, hist: [] } : null,
      skills: Object.fromEntries(SKILLS.map(([k]) => [k, { lv: 10, xp: 0 }])), attrs: Object.fromEntries(ATTRS.map(a => [a, 5])), renown: 50, traits: Object.fromEntries(TRAITS.map(t => [t, 0])),
      affairs: [{ id: 'f1', title: '江北水灾', desc: 'd', state: '待办', due: 99999 }], quests: [{ id: 'q1', title: '讨债', giver: '程立德', state: '已接', due: 99999, place: '扬州府江都县' }],
      local: { place: '扬州府江都县', ym: 1, unit: '两', goods: [{ item: '盐', unit: '引', price: 4 }], recruits: [] }, cargo: [], companions: [{ name: '沈默之', skill: '文墨', lv: 50, wage: 2 }], policies: [], polPts: 5 });
    const fields = { govChanges: { key: '民心', delta: 3 }, classChanges: { name: '士绅', delta: 2 }, affairResults: { title: '江北水灾', result: '解决' }, armyResults: { force: '标营', act: '募编', ok: true, n: 2, tpl: '营兵' }, orgResults: { office: '户部尚书', person: '刘统勋', result: '到任' }, policyResults: { name: 'x', result: '颁行' }, skillUse: { skill: '文墨', xp: 10 }, traitChanges: { trait: '仁', delta: 1 }, questResults: { title: '讨债', result: '办成' }, presentNpcs: { name: '王二', role: '小贩' }, household: { change: '娶进', relation: '妾', name: '柳氏', age: 19 } };
    for (const role of ['none', 'local', 'mil', 'ruler']) {
      for (let k = 0; k < 25; k++) {
        S = base(role); S = migrate(S) || S; VIEW = 'game';
        const d = { reply: '这一回日子照常过去。', mode: 'play', elapsedDays: R([0, 1, 31, 400, 'x', null]), renownDelta: R(G) };
        for (const [f, shape] of Object.entries(fields)) d[f] = R(junkList(shape));
        d.career = R([null, 'x', [], { office: R(G) }]); d.realm = R([null, 'x', { treasury: R(G) }]);
        try { applyReply(S, d, '歇着'); } catch (e) { bad.push(`${role} applyReply: ${e.message} @ ${String(e.stack).split('\n').slice(1, 4).join(' | ')}`); continue; }
        for (const f of [() => logicFaults(S), () => familyNeeds(S), () => familyAgeFix(S), () => fadePeople(S), () => armyMonthly(S, 2), () => companionMonthly(S, 2), () => blocks(S, true), () => rulingInput(S, '去看看')]) { try { f(); } catch (e) { bad.push(`${role} ${String(f).slice(6, 40)}: ${e.message}`); } }
        for (const [tab] of tabsFor(S).concat([['court'], ['army']])) {
          TAB = tab; SIDE_FOLD = false;
          try { render(); } catch (e) { bad.push(`${role} 侧栏${tab}: ${e.message}`); continue; }
          const t = (document.querySelector('.side') || document.body).innerText;
          const m = t.match(/undefined|NaN|\[object Object\]/); if (m) bad.push(`${role} 侧栏${tab} 露出 ${m[0]}：…${t.slice(Math.max(0, t.indexOf(m[0]) - 40), t.indexOf(m[0]) + 20).replace(/\s+/g, ' ')}…`);
        }
      }
    }
    return [...new Set(bad)].slice(0, 40);
  });
  for (const x of out) errs.push(x);
  console.log('GARBAGE', JSON.stringify([...new Set(errs)].slice(0, 40), null, 1));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
