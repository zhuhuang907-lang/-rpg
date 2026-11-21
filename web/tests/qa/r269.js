// R-269：后台活轮流来——开局查齐以后每回只做一件，排在单子后面的（国计民生、本地价钱、你的兵马）不能永远轮不上
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof afterTurnPool === 'function');
  const r = await p.evaluate(async () => { let R0 = {}; const s = newSave({ name: '李从荣', gender: '男', age: 33, role: '皇帝', gregorianYear: 936, month: 1, day: 1, place: '洛阳', polity: '后唐' }); s.settledAt = 1; S = s; BG_STOP = false;
    const ran = [], ids = ['a', 'b', 'c', 'd', 'fisc']; const old = bgJobs;
    bgJobs = () => ids.map(id => ({ id, msg: id, due: () => true, run: async () => { ran.push(s.turn + ':' + id); } }));
    try { for (let t = 2; t <= 3; t++) { s.turn = t; BG_CTX = { s0: s, d: null, g: null }; await afterTurnPool(s); } } finally { bgJobs = old; }
    const R = { 安元信: '明宗加同枢密院省平章事，移镇徐州；山南东道、归德军节度使，加……', 李琪: '天成元年为相（孔循郑珏恶之谓「非无艺学但不廉」；与崔协争位败……', 张从宾: '长兴中山南西道节度使兼西面马步军都部署；末帝起于凤翔闵帝诏虔……', 冯道: '宰相' };
    s.people = Object.fromEntries(Object.entries(R).map(([k, v]) => [k, { role: v }])); tidyState(s);
    s.people = Object.assign(s.people, { 范延光: { role: '枢密使' }, 李崧: { role: '枢密副使' }, 刘赞: { role: '给事中', dead: true } });
    s.org = { nodes: [{ name: '枢密院', posts: [{ title: '枢密使', holder: '' }, { title: '枢密副使', holder: '' }] }, { name: '门下', posts: [{ title: '给事中', holder: '刘赞', src: '史书' }] }] }; tidyState(s);
    s.people.崔棁 = { role: '监察御史' }; s.people.张湛 = { role: '侍卫亲军都指挥使' }; s.people.李专美 = { role: '西京留守判官' }; s.org.nodes.push({ name: '门下省', posts: [{ title: '右散骑常侍', holder: '' }] });
    const ap = typeof textAppoint === 'function' ? textAppoint(s, '照他们拟的人选下诏任命', '舍人草诏：崔棁可守右散骑常侍，张湛兼兵部尚书。范延光道：「臣荐一人：李专美可为御史中丞。」') : []; orgSync(s);
    s.people.李崧 = { role: '枢密副使' }; s.people.刘赞 = { role: '给事中', dead: true }; const dd = { mode: 'play', reply: '李崧进殿。刘赞也来了。', presentNpcs: [{ name: '李崧', role: '户部侍郎' }, { name: '刘赞', role: '给事中' }] }; ledgerGate(s, dd, '召李崧问话'); R0 = { role: dd.presentNpcs.map(n => n.name + ':' + n.role).join(',') };
    const og = Object.fromEntries(s.org.nodes.flatMap(n => n.posts.map(q => [q.title, q.holder])));
    return { gate: R0, ap, ape: [s.people.崔棁.role, s.people.张湛.role, s.people.李专美.role], og2: (s.org.nodes.find(n => n.name === '门下省').posts[0] || {}).holder, og, ran, roles: Object.fromEntries(Object.entries(s.people).map(([k, v]) => [k, v.role])) }; });
  const bad = [];
  for (const [k, v] of Object.entries(r.roles)) if (['安元信', '李琪', '张从宾', '冯道'].includes(k)) if (/[；;（…]/.test(v) || v.length > 24 || !/使|相|部署/.test(v)) bad.push(`${k}的现任还是一串履历或不像官名：${v}`);
  r.ran = r.ran || r;
  if (r.gate.role !== '李崧:枢密副使') bad.push('记账顺手改官、死人出场没拦住：' + r.gate.role);
  if (r.ape[0] !== '右散骑常侍' || !/兼兵部尚书/.test(r.ape[1]) || r.og2 !== '崔棁') bad.push('诏书里的任命没落账、没进人事树：' + JSON.stringify(r.ape) + r.og2);
  if (r.ape[2] !== '西京留守判官') bad.push('只是举荐的也当成了任命：' + r.ape[2]);
  if (r.og.枢密使 !== '范延光' || r.og.枢密副使 !== '李崧') bad.push('人物现任是枢密使、枢密副使，人事树上还空着：' + JSON.stringify(r.og));
  if (r.og.给事中) bad.push('已故的刘赞还挂在给事中上');
  if (!r.ran.some(x => /:fisc$/.test(x))) bad.push('界面上挂着「正在推」的国计民生排在最后，两回都没先做：' + r.ran.join(' '));
  if (r.ran.length > 2) bad.push('一回做了不止一件，花费涨了：' + r.ran.join(' '));
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
