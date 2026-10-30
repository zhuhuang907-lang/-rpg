// 自家势力（CLAUDE.md「人事与职权」自家势力）：山寨、商号、商队、宗族、乡勇、绿林……共用一套账；人数带兵的照军务、商号本钱照营生，不另立账；建、入、退、换头领、增减员、迁、资、结交、散；各样的权不互相转成官府的权
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof applyOrgs === 'function' && typeof applyReply === 'function');
  const out = await p.evaluate(() => {
    const bad = [], mk = (o) => { const st = Object.assign({ id: 'g', v: 2, turn: 4, title: 't', protagonist: { name: '甲', role: '', age: 30, gender: '男' }, career: null, idm: 'commoner', clock: { y: 1757, m: 3, d: 1, h: 10, yearLabel: '乾隆二十二年' }, place: { full: '扬州府江都县', polity: '清' }, people: {}, household: [], chat: [], canon: [], deeds: [], chronicle: [], summaries: [], orders: [], goals: [], status: {}, prices: [], powers: [], territory: [], forces: [], world: { events: [], upcoming: [] }, money: { cash: 100, unit: '两' } }, o); S = migrate(st) || st; return S; };
    const act = (st, what, type = '令') => { CUR_SAID = what; st.actsNow = [actNew(st, { type, what, who: '自己' })]; };
    const run = (st, orgs) => { const ex = {}; applyOrgs(st, { orgs }, ex); return ex; };
    // 1 农民入宗族：头领是族长，不是主角；主角在内、没有族务以外的权
    let st = mk({ protagonist: { name: '王二', role: '江都县乡下的佃户' } });
    run(st, [{ op: '入', name: '王氏宗族', kind: '宗族', head: '王老太爷', who: '王二' }]);
    { const o = orgsLive(st)[0], d = identityOf(st); if (!o || o.head !== '王老太爷' || !o.members.includes('王二') || d.power !== 'none' || d.command !== 'none' || !d.orgs.length) bad.push('农民入宗族不对：' + JSON.stringify({ o, d: [d.power, d.command, d.orgs] })); }
    // 2 商人经营商号：本钱照营生那门生意，不另立
    st = mk({ protagonist: { name: '甲', role: '扬州盐商' }, business: [{ name: '汪大有盐号', kind: '铺面', capital: 30000 }] });
    act(st, '在扬州开汪大有盐号');
    run(st, [{ op: '建', name: '汪大有盐号', kind: '商号', head: '甲', seat: '扬州府', n: 12 }]);
    { const o = orgsLive(st)[0], d = identityOf(st); if (!o || o.biz !== '汪大有盐号' || o.kind !== '商号' || d.ruler || d.admin !== 'none' || d.command !== 'none' || d.power !== 'org') bad.push('商号不对：' + JSON.stringify({ o, d: [d.power, d.admin, d.command] }));
      if (!/商号的本钱就是|本钱 30000/.test(orgBlock(st)) || !/调不动驻军/.test(orgBlock(st))) bad.push('商号的材料没写本钱或权的分界：' + orgBlock(st)); }
    // 3 商人组商队：伙计、据点、迁移
    act(st, '组一支商队去汉口贩盐');
    run(st, [{ op: '建', name: '汉口盐队', kind: '商队', head: '甲', n: 30, seat: '扬州府' }, { op: '入', name: '汉口盐队', who: '程立德' }]);
    run(st, [{ op: '迁', name: '汉口盐队', seat: '汉口镇' }]);
    { const o = orgsLive(st).find(x => x.name === '汉口盐队'); if (!o || o.count !== 30 || o.seat !== '汉口镇' || !o.members.includes('程立德') || arr(st.forces).length) bad.push('商队不对（商队不该变成兵马）：' + JSON.stringify({ o, f: st.forces })); }
    // 4 土匪首领管山寨：开局照身份和兵马补上山寨；人数就是那支兵马；没招人的令，添人不落账；有令才落
    st = mk({ protagonist: { name: '甲', role: '黑风寨寨主' }, forces: [{ name: '黑风寨弟兄', leader: '甲', troops: '120' }] });
    applyOrgs(st, { orgs: [] }, {});
    { const o = orgsLive(st)[0]; if (!o || o.kind !== '山寨' || o.head !== '甲' || o.force !== '黑风寨弟兄' || orgCount(st, o) !== 120) bad.push('寨主的山寨没照兵马补上：' + JSON.stringify(o));
      st.actsNow = []; CUR_SAID = '在寨里喝酒'; const ex = run(st, [{ op: '增员', id: o.id, n: 300 }]); if (orgCount(st, o) !== 120 || !arr(ex.unbooked).length) bad.push('没招人，正文说添了三百人也落了账');
      act(st, '下山招人入伙'); run(st, [{ op: '增员', id: o.id, n: 30, why: '招来流民' }]); if (orgCount(st, o) !== 150 || Number(st.forces[0].troops) !== 150) bad.push('招了人，山寨人数（军务那支兵马）没跟着涨：' + orgCount(st, o));
      const d = identityOf(st); if (d.ruler || d.admin !== 'none' || d.command !== 'own' || !myForce(st, st.forces[0])) bad.push('寨主的权不对：' + JSON.stringify([d.power, d.admin, d.command]));
      if (!/管不了县里/.test(orgBlock(st))) bad.push('山寨材料没写管不了县里'); }
    // 5 绿林人物入别家：在内不是头领，调不动
    st = mk({ protagonist: { name: '甲', role: '江湖上的绿林好汉' } });
    act(st, '去投梁山', '试'); run(st, [{ op: '入', name: '二龙山', kind: '绿林', head: '乙', who: '甲' }]);
    { const o = orgsLive(st)[0], d = identityOf(st); if (!o || o.head !== '乙' || !o.members.includes('甲') || d.command !== 'none' || !/调不动/.test(orgBlock(st))) bad.push('绿林入伙不对：' + JSON.stringify({ o, cmd: d.command })); }
    run(st, [{ op: '退', id: orgsLive(st)[0].id, who: '甲' }]); if (orgsLive(st)[0].members.includes('甲')) bad.push('退出组织没记上');
    // 6 乡勇有实际成员：立起时带兵的人数进军务，不另记一份
    st = mk({ protagonist: { name: '甲', role: '江都县的乡绅' } });
    act(st, '募乡勇二百人守村');
    run(st, [{ op: '建', name: '江都乡勇', kind: '乡勇', head: '甲', n: 200, seat: '江都县' }]);
    { const o = orgsLive(st)[0], f = st.forces.find(x => x.name === '江都乡勇'); if (!o || !f || Number(f.troops) !== 200 || o.count != null || orgCount(st, o) !== 200) bad.push('乡勇人数没进军务、或另记了一份：' + JSON.stringify({ o, f }));
      const d = identityOf(st); if (d.ruler || d.admin !== 'none' || d.command !== 'own') bad.push('乡勇头目被当成了一方之主或地方官：' + JSON.stringify([d.power, d.admin])); }
    // 换头领、结交、散
    { const o = orgsLive(st)[0]; run(st, [{ op: '结交', id: o.id, tie: { to: '江都县衙', rel: '依附' } }]); run(st, [{ op: '换头领', id: o.id, head: '丙' }]); if (o.head !== '丙' || !o.members.includes('甲') || st.forces[0].leader !== '丙' || !o.ties.some(t => t.to === '江都县衙')) bad.push('换头领、结交没记对');
      run(st, [{ op: '散', id: o.id, why: '官府勒令解散' }]); if (orgsLive(st).length || !st.forces[0].gone) bad.push('散伙没记上'); }
    // 7 军阀管所属势力：照旧是一方之主，自家亲随不改他的权
    st = mk({ idm: 'warlord', clock: { y: 885, m: 1, d: 1 }, place: { full: '蔡州', polity: '唐' }, protagonist: { name: '甲', role: '据有蔡州的军头' }, forces: [{ name: '蔡州兵', leader: '甲', troops: 8000 }], territory: [{ place: '蔡州' }] });
    act(st, '挑三十个亲兵做亲随'); run(st, [{ op: '建', name: '牙兵亲随', kind: '亲随', head: '甲', n: 30 }]);
    { const d = identityOf(st); if (!d.ruler || d.command !== 'realm' || roleKind(st) !== 'ruler') bad.push('军阀立了亲随，一方之主的权丢了'); }
    // 8 皇帝原来的功能不受影响
    st = mk({ idm: 'emperor', protagonist: { name: '弘历', role: '大清皇帝' } });
    { const d = identityOf(st); if (!d.ruler || govScope(st) !== 'realm' || roleKind(st) !== 'ruler' || !tabsFor(st).some(t => t[0] === 'court') || orgsLive(st).length) bad.push('皇帝的身份、面板被自家势力改坏了'); }
    // 记账：说到山寨才附 orgs 字段；势力页画得出
    st = mk({ protagonist: { name: '甲', role: '黑风寨寨主' }, forces: [{ name: '黑风寨弟兄', leader: '甲', troops: '120' }] }); applyOrgs(st, { orgs: [] }, {});
    if (!/"orgs":\[\{"op"/.test(ledgerRules(st, '在寨里喝酒'))) bad.push('有山寨的人记账没附 orgs 字段');
    if (/"orgs":\[\{"op"/.test(ledgerRules(mk({}), '去集上买米'))) bad.push('没有组织、也没说到的，记账也附了 orgs 字段');
    try { const h = orgsHtml(st); if (!/黑风寨/.test(h) || !/招人入伙/.test(h) || !/管不到/.test(h)) bad.push('势力页没画出山寨'); } catch (e) { bad.push('势力页报错 ' + e.message); }
    if (!tabsFor(st).some(t => t[0] === 'power')) bad.push('有山寨的没有「势力」页');
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
