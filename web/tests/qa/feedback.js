// 吩咐有回音、后果要合理（CLAUDE.md「剧情」吩咐有回音）：职权以内跟前能办的令当回办成；费时的照旧在办；诏令没缘由不打折；应对过的临门之事不罚误期；一个月新来的事有上限；起兵先有密报
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof applyActs === 'function' && typeof buildPress === 'function');
  const out = await p.evaluate(async () => {
    const bad = [], mk = () => newSave({ name: '卢见曾', gender: '男', age: 68, born: 1690, role: '两淮盐运使', real: true, gregorianYear: 1757, month: 3, day: 1, place: '扬州府', polity: '清' });
    // 1 跟前能办的令，记账漏报也照办成；回执不唠叨「下一回接着看」
    let s = mk(); s.turn = 2; s.actsNow = [{ tmp: 't1', type: '令', what: '叫管家去米行买十石米', who: '管家', ok: '能' }, { tmp: 't2', type: '令', what: '派人去江宁府打听盐价', who: '长随', ok: '能' }];
    CUR_RULING = { steps: [{ what: '管家去米行买米', time: '当天', ok: '能' }, { what: '长随去江宁府打听盐价', time: '半个月', ok: '能' }] };
    let rc = applyActs(s, { actResults: [] }); CUR_RULING = null;
    const a1 = s.acts.find(x => /买十石米/.test(x.what)), a2 = s.acts.find(x => /江宁/.test(x.what));
    if (!a1 || a1.state !== '办成') bad.push('跟前能办的令，记账漏报就吊着：' + (a1 && a1.state));
    if (rc.some(r => /下一回接着看/.test(r.why || ''))) bad.push('回执还在唠叨「交代下去，下一回接着看」');
    if (!a2 || a2.state !== '在办') bad.push('要走半个月的事被当场记成办成');
    // 2 拖了两回的，推演、写正文必须见分晓
    s.turn = 4; if (!/拖了两回的（这一回正文必须写出结果/.test(actBlock(s))) bad.push('拖了两回的事没催着见分晓');
    // 3 诏令：经手的人没有坏的缘由，就照办（不平白打折、拖延、虚报）
    s = mk(); let odd = 0; for (let i = 0; i < 60; i++) { const w = edictWho(s, { who: '尹继善', what: '赈济淮安饥民' + i, day0: 1000 + i * 37, travel: 3 }); if (w.out !== '照办') odd++; }
    if (odd) bad.push(`没有缘由的诏令 60 道里有 ${odd} 道被打折、拖延或虚报`);
    // 4 应对过的临门之事，到期不罚误期；没理会的照罚
    s = mk(); s.renown = 10; const ym = Math.floor(ymOf(s.clock));
    s.press = [{ id: 'p1', kind: '出手', who: '高恒', title: '高恒：索要盐引', effects: [{ key: '名声', delta: -5 }], due: ym - 1, state: '临门', at: 1 }, { id: 'p2', kind: '出手', who: '普福', title: '普福：参劾', effects: [{ key: '名声', delta: -5 }], due: ym - 1, state: '临门', at: 1 }];
    applyPress(s, {}, '请高恒过府一叙，把盐引的事说清楚');
    if (s.press[0].state === '误期') bad.push('玩家应对过的事，记账漏报也被罚误期'); if (s.press[1].state !== '误期') bad.push('没理会的事到期也不罚');
    // 5 一个月新来的事有上限：手上压着三件，这个月最多再来一件
    s = mk(); s.turn = 3; s.press = [1, 2, 3].map(i => ({ id: 'o' + i, kind: '出手', who: '甲' + i, title: '旧事' + i, due: ym + 2, state: '临门', at: 1 }));
    const oc = callClaude, ob = bochaDeep; bochaDeep = async () => ({ text: '', items: [] });
    callClaude = async () => ({ text: JSON.stringify({ hits: [1, 2, 3].map(i => ({ event: '大事' + i, source: '清史稿', reach: '邸报', demand: '筹饷' + i, due: 2, effects: [], choices: [] })), moves: [1, 2, 3].map(i => ({ who: '乙' + i, visible: '上门' + i, stake: '利', due: 1, effects: [], choices: [] })) }) });
    try { await buildPress(s); } finally { callClaude = oc; bochaDeep = ob; }
    const open = s.press.filter(x => x.state === '临门').length; if (open > 4) bad.push(`一个月堆了 ${open} 件临门的事`);
    // 6 统兵的人怨深也不会毫无风声就反：先有密报
    s = newSave({ name: '张九四', gender: '男', age: 45, role: '自立为吴王，割据平江', gregorianYear: 1365, month: 3, day: 1, place: '平江府', polity: '吴' }); s.realm = { capital: '平江府' }; s.people['张勇'] = { favor: -90, traits: ['野心'], role: '部将' };
    s.forces = [{ name: '张勇营', leader: '张勇', troops: 3000, at: '常州府', owner: '' }];
    if (!isRuler(s)) bad.push('测试设定不是一方之主'); else { const r1 = vassalTick(s, 3); if (s.powers && s.powers.some(x => /张勇叛军/.test(x.name))) bad.push('没有一点风声就起兵反了'); if (!r1.some(x => /密报/.test(x))) bad.push('怨深的部将没有密报'); }
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
