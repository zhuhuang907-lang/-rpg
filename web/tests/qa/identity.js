// 统一身份（CLAUDE.md「人事与职权」统一身份）：八种身份照账判定，官职名不等于实权——总兵不是一方之主、寨主管不了县令、商人不是统治者
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof identityOf === 'function' && typeof applyReply === 'function');
  const out = await p.evaluate(() => {
    const bad = [], mk = (o) => Object.assign({ id: 'i', v: 2, turn: 1, protagonist: { name: '甲', role: '', age: 30, gender: '男' }, career: null, idm: 'commoner', clock: { y: 1757, m: 3, d: 1, yearLabel: '乾隆二十二年' }, place: { full: '扬州府', polity: '清' }, people: {}, household: [], forces: [], territory: [], powers: [], chat: [] }, o);
    const C = [
      ['清代总兵', mk({ idm: 'official', protagonist: { name: '甲', role: '江南狼山镇总兵' }, career: { office: '狼山镇总兵', rank: '正二品' }, forces: [{ name: '狼山镇标', leader: '甲', troops: 3000 }], territory: [{ place: '通州' }] }), d => !d.ruler && d.power === 'appointed' && d.office.military && d.command === 'own' && roleKind(S) === 'military' && govScope(S) === '' && orgScope0() !== 'decree'],
      ['总兵被模型误标 warlord', mk({ idm: 'warlord', protagonist: { name: '甲', role: '江南狼山镇总兵' }, career: { office: '狼山镇总兵' }, forces: [{ name: '镇标', leader: '甲', troops: 3000 }] }), d => !d.ruler],
      ['大将军（汉，朝中受命）', mk({ idm: 'official', clock: { y: -100, m: 1, d: 1 }, place: { polity: '西汉' }, protagonist: { name: '甲', role: '大将军' }, career: { office: '大将军' } }), d => !d.ruler && d.office.military],
      ['唐末军阀（无官职、有兵有地）', mk({ idm: 'warlord', clock: { y: 885, m: 1, d: 1 }, place: { polity: '唐' }, protagonist: { name: '甲', role: '据有蔡州的军头' }, forces: [{ name: '蔡州兵', leader: '甲', troops: 8000 }], territory: [{ place: '蔡州' }] }), d => d.ruler && d.power === 'independent' && d.command === 'realm' && roleKind(S) === 'ruler'],
      ['唐末节度使', mk({ idm: 'official', clock: { y: 890, m: 1, d: 1 }, place: { polity: '唐' }, protagonist: { name: '甲', role: '宣武军节度使' }, career: { office: '宣武军节度使' } }), d => d.ruler],
      ['宋代节度使（虚衔）', mk({ idm: 'official', clock: { y: 1100, m: 1, d: 1 }, place: { polity: '宋' }, protagonist: { name: '甲', role: '节度使' }, career: { office: '节度使' } }), d => !d.ruler],
      ['土匪首领', mk({ protagonist: { name: '甲', role: '黑风山寨主' }, forces: [{ name: '山寨弟兄', leader: '甲', troops: 120 }] }), d => !d.ruler && d.power === 'org' && d.admin === 'none' && d.command === 'own' && d.tags.includes('匪') && roleKind(S) === 'none' && govScope(S) === '' && !tabsFor(S).some(t => t[0] === 'court') && tabsFor(S).some(t => t[0] === 'army')],
      ['商人', mk({ protagonist: { name: '甲', role: '扬州盐商' }, money: { cash: 900000 } }), d => !d.ruler && d.power === 'none' && d.admin === 'none' && d.social === '商' && roleKey(S) === '商'],
      ['县令', mk({ idm: 'official', protagonist: { name: '甲', role: '江都县知县' }, career: { office: '江都县知县', rank: '正七品' } }), d => !d.ruler && d.admin === 'local' && roleKind(S) === 'local' && govScope(S) === 'local' && d.command === 'none'],
      ['皇帝', mk({ idm: 'emperor', protagonist: { name: '弘历', role: '大清皇帝' } }), d => d.ruler && d.power === 'sovereign' && d.admin === 'realm' && d.command === 'realm' && govScope(S) === 'realm' && roleKey(S) === '贵'],
      ['普通农民', mk({ protagonist: { name: '甲', role: '江都县乡下的佃户' } }), d => !d.ruler && d.power === 'none' && !d.office.held && d.command === 'none' && roleKind(S) === 'none' && roleKey(S) === '农'],
      ['知县之子（别人的官不算自己的）', mk({ protagonist: { name: '甲', role: '江都县知县之子' } }), d => !d.office.held && govScope(S) === '' && roleKind(S) === 'none'],
      ['商人兼宗族（多重身份）', mk({ protagonist: { name: '甲', role: '徽州盐商、汪氏族长' }, orgs: [{ id: 'o1', name: '汪氏宗族', kind: '宗族', head: '甲', members: [] }] }), d => d.tags.includes('商') && d.orgs.length === 1 && d.power === 'org' && !d.ruler && d.command === 'none'],
      ['知府兼地主', mk({ idm: 'official', protagonist: { name: '甲', role: '扬州知府，家有田产的乡绅' }, career: { office: '扬州府知府' } }), d => d.tags.includes('官') && d.tags.includes('地主') && d.admin === 'local'],
      ['宫中妃嫔', mk({ idm: 'noble', protagonist: { name: '甲', role: '乾隆皇帝的令妃' } }), d => !d.ruler],
      ['自立称王', mk({ protagonist: { name: '甲', role: '起兵自立的闯王' } }), d => d.ruler],
      ['明代藩王（有封地无实权）', mk({ idm: 'noble', clock: { y: 1600, m: 1, d: 1 }, place: { polity: '明' }, protagonist: { name: '甲', role: '就藩开封的周王，封地在开封' } }), d => !d.ruler],
    ];
    function orgScope0() { return isRuler(S) ? 'decree' : 'x'; }
    for (const [name, st, ok] of C) { S = st; let d; try { d = identityOf(S); if (!ok(d)) bad.push(name + '：' + JSON.stringify({ power: d.power, ruler: d.ruler, admin: d.admin, command: d.command, tags: d.tags, rk: roleKind(S), gs: govScope(S), key: roleKey(S) })); } catch (e) { bad.push(name + ' 报错 ' + e.message); } }
    // 驻防的总兵有兵有地，autoIdentity 不把他改成一方之主；真举兵自立的才改
    S = C[0][1]; const ex = {}; autoIdentity(S, ex); if (S.idm === 'warlord') bad.push('总兵驻防有兵有地，被自动改成了一方之主');
    S = mk({ idm: 'official', protagonist: { name: '甲', role: '举兵自立的前总兵' }, career: { office: '自立' }, forces: [{ name: '镇标', leader: '甲', troops: 3000 }], territory: [{ place: '通州' }] }); autoIdentity(S, {}); if (S.idm !== 'warlord' && !isRuler(S)) bad.push('举兵自立、有兵有地的，没认成一方之主');
    // 别人的兵不算到你头上：平民名下没有兵，地图上记着别家兵马也不变军阀
    S = mk({ forces: [{ name: '清军', leader: '乙', troops: 9000 }], territory: [{ place: '扬州' }], protagonist: { name: '甲', role: '佃户' } }); autoIdentity(S, {}); if (S.idm === 'warlord') bad.push('别家的兵被算到平民头上，改成了军阀');
    // 旧存档：被误当一方之主的总兵，国库那套收回
    S = mk({ idm: 'official', protagonist: { name: '甲', role: '狼山镇总兵' }, career: { office: '狼山镇总兵' }, gov: { scope: 'realm', keys: [], stats: {} } }); S = migrate(S) || S; if (S.gov) bad.push('旧存档里误给总兵的国库没收回');
    // 给模型看的身份行写明管不到的
    S = C[6][1]; if (!/寨主管不了县令/.test(identityLine(S)) || !/自家势力的头领/.test(identityLine(S))) bad.push('身份行没写明权限：' + identityLine(S));
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
