// 世界自己转（CLAUDE.md「剧情」世界自己转）：要紧的人照身份、所在、资源、关系自己办事，结果真落到账上；账上没有的人不收、家里人不重推；
// 病故要有因、兵数不凭空涨落、看得见的进年谱、暗地里的只进幕后；外地出事落到辖区小幅动国势；推了没动静的下回往后排；检索词各处并成一批
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof applyNpcMoves === 'function');
  const out = await p.evaluate(async () => {
    const bad = [], mk = (o) => { const st = Object.assign({ id: 'w', v: 2, turn: 8, title: 't', protagonist: { name: '甲', role: '江都县乡下的佃户', age: 30, gender: '男' }, career: null, idm: 'commoner', clock: { y: 1757, m: 5, d: 1, h: 10, yearLabel: '乾隆二十二年' }, place: { full: '扬州府江都县', polity: '清' }, people: {}, household: [{ relation: '妻', name: '王氏', age: 28 }], chat: [], canon: [], deeds: [], chronicle: [], summaries: [], orders: [], goals: [], status: {}, gmNotes: [], prices: [], powers: [], territory: [], forces: [], world: { events: [], upcoming: [] }, money: { cash: 3, unit: '两' } }, o); S = migrate(st) || st; return S; };
    // 1 普通百姓：邻里、地主照自己的盘算办事；看得见的进年谱、暗地里的只进幕后；账上没有的人、家里人不收
    let st = mk({ people: { 刘地主: { role: '本村地主', tie: '东家', seen: 7, favor: -10, age: 55, plan: '收回佃田' }, 张三: { role: '邻居', seen: 2, age: 40 }, 李四: { role: '货郎', seen: 6, age: 35 } } });
    const pick = npcPick(st, 12).map(x => x[0]); if (pick[0] !== '刘地主' || pick.includes('王氏')) bad.push('挑要推的人不对（东家该排前、家里人不该在里头）：' + pick);
    let mv = applyNpcMoves(st, [{ name: '刘地主', op: '结交', with: '江都县典史', did: '给典史送了一份年礼', cause: '想借官府的势收回佃田', open: false, plan: '秋后收田' }, { name: '李四', op: '迁', where: '仪征县', did: '挑着担子去仪征做买卖', open: true },
      { name: '王氏', op: '其他', did: '回娘家' }, { name: '赵大虎', op: '招兵', did: '拉起三百人', res: { troops: 300 } }, { name: '张三', op: '病故', did: '病死了', cause: '' }]);
    if (st.people.刘地主.ties['江都县典史'] !== '结交' || st.people.刘地主.plan !== '秋后收田') bad.push('结交、新打算没落到账上');
    if (st.people.李四.where !== '仪征县' || !st.chronicle.some(c => c.who === '李四')) bad.push('迁居没落账、或看得见的事没进年谱');
    if (st.chronicle.some(c => c.who === '刘地主') || !st.gmNotes.some(g => /暗中：刘地主/.test(g.text))) bad.push('暗地里的事进了年谱（主角看得到了）或没进幕后');
    if (mv.some(m => m.name === '王氏' || m.name === '赵大虎')) bad.push('家里人被重推了、或账上没有的人被收了：' + JSON.stringify(mv.map(m => m.name)));
    if (st.people.张三.dead) bad.push('没写死因的病故也落了账');
    if (!(st.people.张三.npcQuiet >= 1) && !mv.some(m => m.name === '张三')) bad.push('推了没动静的人没往后排');
    // 同一件事下回再报不重记
    const n0 = st.chronicle.length; applyNpcMoves(st, [{ name: '李四', op: '迁', where: '仪征县', did: '挑着担子去仪征做买卖', open: true }]); if (st.chronicle.length !== n0) bad.push('同一件事重复记了');
    // 2 商人：同行竞争、合伙；同行的兵数、钱财不凭空来
    st = mk({ protagonist: { name: '甲', role: '扬州盐商' }, people: { 江春: { role: '两淮总商', tie: '同行', seen: 7 }, 程立昌: { role: '盐商', tie: '同行', seen: 6, age: 50 } } });
    applyNpcMoves(st, [{ name: '江春', op: '结怨', with: '甲', did: '在运司面前说你压价抢引', cause: '你抢了他的引窝', open: false }, { name: '程立昌', op: '投靠', with: '江春', did: '把引窝托给江春代运', cause: '本钱周转不开', open: false }]);
    if (!(st.people.江春.favor <= -10) || st.people.程立昌.ties.江春 !== '投靠' || st.people.江春.ties.程立昌 !== '结交') bad.push('同行结怨、投靠没落到好感和关系上：' + JSON.stringify([st.people.江春, st.people.程立昌]));
    // 3 土匪首领：官府、别的山寨的反应；别家山寨添人照上限
    st = mk({ protagonist: { name: '甲', role: '黑风寨寨主' }, forces: [{ name: '黑风寨弟兄', leader: '甲', troops: '120' }], people: { 梁大: { role: '梁家寨寨主', seen: 7 }, 周知县: { role: '曹县知县', tie: '对头', seen: 5 } }, orgs: [{ id: 'o9', name: '梁家寨', kind: '山寨', head: '梁大', members: [], count: 200 }] });
    applyOrgs(st, { orgs: [] }, {});
    applyNpcMoves(st, [{ name: '梁大', op: '招兵', did: '收了一批流民入伙', cause: '春荒流民多', res: { troops: 1000 }, open: true }, { name: '周知县', op: '其他', did: '详请巡抚派兵会剿黑风寨', cause: '寨子劫了县里的大户', open: false }]);
    { const o = st.orgs.find(x => x.name === '梁家寨'); if (Number(o.count) !== 250) bad.push('别家山寨一个月添一千人照单全收了（该照二成、至少五十的上限）：' + o.count); }
    if (!st.gmNotes.some(g => /周知县详请巡抚派兵会剿/.test(g.text))) bad.push('官府背后的动作没进幕后');
    if (Number(st.forces[0].troops) !== 120) bad.push('别人的动作改了主角自己的兵');
    // 4 清代总兵：别的官员、营伍各办各的；势力兵数无因暴涨不收
    st = mk({ idm: 'official', protagonist: { name: '甲', role: '狼山镇总兵' }, career: { office: '狼山镇总兵', rank: '正二品' }, people: { 王提督: { role: '江南提督', tie: '上司', seen: 7, age: 58 } }, powers: [{ name: '海上盗伙', leader: '蔡牵', troops: '2000' }] });
    applyNpcMoves(st, [{ name: '王提督', op: '升迁', role: '湖广提督', did: '调任湖广提督', cause: '部议调补', open: true }]);
    if (st.people.王提督.role !== '湖广提督' || !arr(st.people.王提督.roleLog).length) bad.push('上司调任没落账');
    let rows = powerGuard(st, [{ name: '海上盗伙', troops: '9000', note: '声势大振' }], 'world'); if (rows[0].troops !== '2000') bad.push('势力兵数无因暴涨收了');
    rows = powerGuard(st, [{ name: '海上盗伙', troops: '2500', note: '收编了几伙小盗' }], 'world'); if (rows[0].troops !== '2500') bad.push('有因的兵数变化被挡了');
    // 5 皇帝：地方出事落到国势（小幅、写因）；外地官员各办各的
    st = mk({ idm: 'emperor', protagonist: { name: '弘历', role: '大清皇帝' }, gov: { scope: 'realm', keys: GOV_KEYS, stats: { 民心: 60, 灾情: 20, 边患: 30 }, hist: [] }, people: { 尹继善: { role: '两江总督', tie: '大臣', seen: 6 } } });
    localImpact(st, { where: '徐州府', kind: '灾害', cause: '黄河决口' }, '徐州黄河决口');
    if (st.gov.stats.灾情 !== 23 || st.gov.stats.民心 !== 59 || !arr(st.worldFx).some(x => /徐州/.test(x.why))) bad.push('皇帝治下出灾，国势没照规矩小幅动：' + JSON.stringify(st.gov.stats));
    applyNpcMoves(st, [{ name: '尹继善', op: '其他', did: '奏请截漕赈济徐州灾民', cause: '徐州决口', open: true }]); if (!st.chronicle.some(c => c.who === '尹继善')) bad.push('外地官员自己办的事没记');
    // 县令：别县的事不落到自己辖区
    st = mk({ idm: 'official', protagonist: { name: '甲', role: '江都县知县' }, career: { office: '江都县知县' }, gov: { scope: 'local', keys: LOCAL_KEYS, stats: { 治安: 60 }, hist: [] } });
    localImpact(st, { where: '苏州府吴县', kind: '治安' }, '吴县盗案'); if (st.gov.stats.治安 !== 60) bad.push('别县出事落到了自己辖区');
    localImpact(st, { where: '江都县', kind: '治安' }, '江都盗案'); if (st.gov.stats.治安 !== 57) bad.push('本县出事没落到治安上');
    // 检索词并成一批：几处同时要查的，凑在一起问
    const calls = []; const orig = callClaude; callClaude = async (prompt) => { calls.push((prompt.match(/^\d+\. /gm) || []).length); return { text: JSON.stringify({ results: [] }) }; };
    try { await Promise.all([dsLookup(['甲 一', '甲 二']), dsLookup(['乙 一', '乙 二', '乙 三']), dsLookup(['丙 一']), dsLookup(['甲 一'])]); } finally { callClaude = orig; }
    if (calls.length !== 1 || calls[0] !== 6) bad.push('几处同时查的词没并成一批：' + JSON.stringify(calls));
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
