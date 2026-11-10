// R-171：行军路上探马先行，到城下当回就打；你亲手任命的官每年岁末考课（上中下考，连两年下考罢黜，七十致仕，卒年病故，出缺）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof trackMonthly === 'function');
  const bad = [];
  const setup = () => p.evaluate(() => { S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.realm = { treasury: 500000 }; S.gov = { scope: 'realm', stats: { 民心: 60, 腐败: 30 } }; S.territory = [{ place: '福州', troops: 3000 }];
    S.forces = [{ name: '威武军', leader: '王延钧', owner: '你', troops: 15000, morale: 65, orgNow: 70, train: 60, grain: 300000, at: '福州', status: '驻守' }];
    S.powers = [{ name: '南汉', leader: '刘䶮', seat: '广州', troops: '60000', stance: '敌' }]; warStart(S, '南汉', warCBs(S, '南汉')[0] || '', false); });
  // 探马先行
  await setup();
  { const r = await p.evaluate(async () => { const c = { force: '威武军', mode: '攻', target: '潮州', from: '福州', state: '行军', turn: 2, li: 600, done: 100, pace: 60 }; S.campaigns = [c];
      const due = scoutDue(S); window.callClaude = async () => ({ text: JSON.stringify({ troops: 4000, quality: '中', general: '苏章', terrain: '城池', why: '史料' }) }); window.bochaDeep = async () => ({ text: '' });
      await campScout(S); const pre = c.pre, st0 = c.state; c.done = c.li - 1; const out = campaignTick(S, 3); return { due, pre, st0, st: c.state, out: arr(out).join('；') }; });
    if (!r.due) bad.push('行军路上没派探马先行'); if (!r.pre || r.pre.troops !== 4000 || r.st0 !== '行军') bad.push('先行的探马没把守军记下、或打乱了行军：' + JSON.stringify(r));
    if (/待探报/.test(r.st) || !/围城|得手|败回/.test(r.st)) bad.push('探明了守军，到城下还要再等一回：' + JSON.stringify({ st: r.st, out: r.out.slice(0, 200) })); }
  // 考课
  await setup();
  { const r = await p.evaluate(() => { S.org = { nodes: [{ id: 'root', name: '闽', depth: 0, posts: [] }, { id: 'n1', name: '节度使府', depth: 1, parent: 'root', posts: [{ title: '判官', holder: '甲能', byPlayer: true }, { title: '掌书记', holder: '乙庸', byPlayer: true }, { title: '都押衙', holder: '丙老', byPlayer: true }, { title: '推官', holder: '丁史', src: '史书' }] }] };
      S.people = { 甲能: { favor: 40, stats: { 理政: { v: 95 } } }, 乙庸: { favor: -50, stats: { 理政: { v: 10 } } }, 丙老: { age: 72, favor: 0 }, 丁史: { favor: 0, stats: { 理政: { v: 5 } } } };
      const P = n => S.org.nodes[1].posts.find(q => q.title === n); trackMonthly(S); S.clock.y++; const o1 = trackMonthly(S); const a = { jia: arr(P('判官').kao).map(k => k.g).join(''), yi: P('掌书记').holder, lao: P('都押衙').holder, shi: arr(P('推官').kao).length };
      S.clock.y++; const o2 = trackMonthly(S); S.dossiers = { 甲能: { died: S.clock.y } }; S.clock.y++; const o3 = trackMonthly(S); render(); return { a, yi2: P('掌书记').holder, jia3: P('判官').holder, o: o1.concat(o2, o3), page: politicsHtml(S) }; });
    if (r.a.jia !== '上') bad.push('本事九十五、亲附的没考上等：' + JSON.stringify(r.a)); if (r.a.lao !== '') bad.push('七十二岁没致仕'); if (r.a.shi) bad.push('史书上的人也被程序考课了');
    if (r.yi2 !== '') bad.push('连两年下考没罢黜：' + JSON.stringify(r.o)); if (r.jia3 !== '') bad.push('史书卒年到了没病故出缺');
    if (!/你任命的官考课/.test(r.page)) bad.push('朝局页没写考课：' + r.page.slice(0, 300) + JSON.stringify(r.o)); }
  // 法理凭血统：你的妃子出自那一家
  await setup(); { const r = await p.evaluate(() => { S.powers.push({ name: '吴越', leader: '钱镠', seat: '杭州', stance: '和' }); S.household = [{ relation: '妃', name: '钱氏', note: '吴越王钱镠之女', age: 20 }]; S.renown = 50; claimAdd(S, '吴越'); return arr(S.claims).find(c => c.owner === '吴越'); });
    if (!r || r.basis !== '姻亲血统') bad.push('妃子出自吴越，法理没凭血统：' + JSON.stringify(r)); }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
