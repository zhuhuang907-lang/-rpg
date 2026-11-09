// 当面说（需求台账 R-148；2026-11-07 玩家：「不需要强加以什么条件，可以完全由AI来判断是否能谈过去，由玩家来进行一些口述……引用古代经济、诡辩可以成功，或是对面有爱才」）
// 假 AI 照指定回「允」或「不允」；真点：外交卡写说辞去说（允了落账、不允态度掉、一个月只能说一回）、交战时遣使议和、围城劝守将开城、劝俘虏归顺、名臣谱写信去说；
// 交给 DeepSeek、说辞原话进了提示、格式里没有示例；写到一半后台重画说辞不丢
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof parley === 'function');
  const bad = [];
  await p.evaluate(() => {
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.realm = { treasury: 500000 }; S.fisc = { kind: 'realm', base: { tianfu: 600000 }, pol: { tax: '常' } }; S.territory = [{ place: '福州', troops: 3000 }];
    S.forces = [{ name: '威武军', leader: '王审知', owner: '你', troops: 15000, morale: 65, grain: 300000, at: '福州', status: '驻守' }];
    S.powers = [{ name: '吴越', leader: '钱镠', seat: '杭州', troops: '40000', stance: '和' }, { name: '吴', leader: '徐温', seat: '扬州', troops: '90000', stance: '冷' }, { name: '南汉', leader: '刘䶮', seat: '广州', troops: '60000', stance: '敌' }];
    window.CALLS = []; window.VERDICT = '允'; window.callClaude = async (input, _o, extra) => { CALLS.push({ input: String(input), extra: extra || {} }); return { text: JSON.stringify({ verdict: VERDICT, reply: VERDICT === '允' ? '王上所言，正合吾意。' : '此事断不可行。', why: '照利害' }) }; };
    VIEW = 'game'; TAB = 'power'; SIDE_FOLD = false; render(); });
  const talk = async (kind, tg, ask, words, verdict) => { await p.evaluate(v => { VERDICT = v; }, verdict); const k = kind + ':' + tg;
    const box = await p.$(`[data-psay="${k}"]`); if (!box) { bad.push(`没有和${tg}当面说的框（${kind}）`); return false; }
    await p.evaluate(k => { const el = document.querySelector(`[data-psay="${k}"]`); el.closest('details').open = true; }, k);
    if (ask) await p.selectOption(`[data-pask="${k}"]`, ask); await p.fill(`[data-psay="${k}"]`, words); await p.click(`[data-parley="${kind}"][data-pt="${tg}"]`);
    await p.waitForFunction(() => !PARLEY_P, null, { timeout: 10000 }); await p.waitForTimeout(150); return true; };
  // 外交：说吴越结盟（允）
  const w1 = '吴越与闽唇齿相依，杨吴虎视江东，若两家不合，必为徐温各个击破。昔孙刘合力而破曹，今日之势正同。';
  if (await talk('dip', '吴越', '结盟', w1, '允')) { const r = await p.evaluate(() => ({ t: dipOf(S, '吴越').ties, c: CALLS.slice(-1)[0], txt: document.body.innerText }));
    if (!r.t.includes('盟')) bad.push('说动吴越结盟，没结成：' + JSON.stringify(r.t)); if (!r.c || r.c.extra.ds) bad.push('当面说硬指了 DeepSeek（照分工该随设置走，默认 GLM；2026-11-09 玩家：「你忘记分工了吗」）'); if (!r.c.input.includes('孙刘合力')) bad.push('玩家的说辞原话没进提示');
    if (/"verdict":"允"/.test(r.c.input)) bad.push('格式里放了示例答案'); if (!/正合吾意/.test(r.txt)) bad.push('对方的回话没显示出来'); }
  // 同一个月不能再说
  { const n0 = await p.evaluate(() => CALLS.length); await talk('dip', '吴越', null, '再请一事：开边互市，两利之道也。', '允'); const n1 = await p.evaluate(() => CALLS.length); if (n1 !== n0) bad.push('同一个月对同一家说了两回'); }
  // 说吴（不允）态度掉
  { const a0 = await p.evaluate(() => dipOf(S, '吴').att); await talk('dip', '吴', '修好', '愿与贵国修好，永息兵戈，互通有无。', '不允'); const a1 = await p.evaluate(() => ({ a: dipOf(S, '吴').att, t: dipOf(S, '吴').ties })); if (!(a1.a < a0) || a1.t.length) bad.push('没说动吴，态度没掉或者照样落了账：' + JSON.stringify(a1)); }
  // 交战时遣使议和（令其纳币）
  await p.evaluate(() => { warStart(S, '南汉', warCBs(S, '南汉')[0] || '', false); render(); });
  if (await talk('peace', '南汉', '纳币', '岭南瘴疠，贵国连年用兵，府库空虚。若肯岁输金帛，闽即退兵，两全之策也。', '允')) { const r = await p.evaluate(() => ({ w: !!warOf(S, '南汉') })); if (r.w) bad.push('说动南汉纳币求和，仗还在打'); }
  // 围城劝守将开城
  await p.evaluate(() => { warStart(S, '吴', warCBs(S, '吴')[0] || '', false); S.campaigns = [{ force: '威武军', mode: '攻', target: '建州', from: '福州', state: '待探报', turn: 2 }]; campResolve(S, S.campaigns[0], { troops: 2000, quality: '中', general: '某守将', owner: '吴' }); TAB = 'army'; render(); });
  if (await talk('yield', '威武军', null, '城中粮尽援绝，将军何苦以满城性命殉一家之私？开城则富贵不失，百姓得全。', '允')) { const r = await p.evaluate(() => ({ st: S.campaigns[0].state, t: S.territory.map(x => x.place) })); if (r.st !== '得手' || !r.t.includes('建州')) bad.push('劝守将开城说成了，城没归你：' + JSON.stringify(r)); }
  // 劝俘虏归顺
  await p.evaluate(() => { S.prisoners = [{ name: '张都头', owner: '吴', where: '建州' }]; render(); });
  if (await talk('pris', '张都头', null, '将军勇冠三军，徐氏不能用，我当以一军相付。', '允')) { const r = await p.evaluate(() => ({ p: S.prisoners.length, v: S.people && S.people['张都头'] })); if (r.p || !r.v || !/部将/.test(r.v.tie)) bad.push('劝俘虏归顺说成了，没归你：' + JSON.stringify(r)); }
  // 名臣谱：写信去请
  await p.evaluate(() => { S.dossiers = { 罗隐: { tl: [1], real: true, temper: '清高', will: '难', born: 833, career: [] } }; TAB = 'people'; render(); });
  if (await talk('fig', '罗隐', null, '先生文章冠绝当世，闽中虽小，愿以师礼相待，共保一方百姓。', '允')) { const r = await p.evaluate(() => !!talentOf(S, '罗隐')); if (!r) bad.push('写信说动罗隐出仕，没进人选'); }
  { const r = await p.evaluate(() => { const s = JSON.parse(JSON.stringify(S)); s.wars = [{ with: '吴', state: '交战' }]; return { wy: !!warOf(s, '吴越'), w: !!warOf(s, '吴') }; }); if (r.wy || !r.w) bad.push('和吴交战，吴越也被当成在交战（名字互相包含认错）：' + JSON.stringify(r)); }
  // 写到一半后台重画，说辞不丢、框还开着
  await p.evaluate(() => { TAB = 'power'; S.talkYM = {}; render(); });
await p.evaluate(() => { document.querySelector('[data-psay="dip:吴越"]').closest('details').open = true; }); await p.fill('[data-psay="dip:吴越"]', '写到一半的说辞');
  await p.evaluate(() => render()); const kept = await p.evaluate(() => { const el = document.querySelector('[data-psay="dip:吴越"]'); return { v: el.value, open: el.closest('details').open }; });
  if (kept.v !== '写到一半的说辞' || !kept.open) bad.push('写到一半后台重画，说辞丢了或框收起来了：' + JSON.stringify(kept));
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
