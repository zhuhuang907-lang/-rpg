'use strict';
/**
 * 随机时代 / 自定义身份：用一个假的大模型和假的博查（返回真实接口的格式），走完整条路：
 * 开局检索 → 写底本 → 引用核对与评级 → 醒来 → 每回合生成来报（不过关的被丢弃）→ 伏笔回响 →
 * 往后续查 → 查一下 → 前情提要 → 收场。
 */
const env = require('./_env');
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

let server, base;
const calls = { search: 0 };
test.before(async () => {
  server = await require('./_mock').start(0);
  base = `http://127.0.0.1:${server.address().port}`;
  const orig = server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request', (req, res) => { if (req.url === '/v1/web-search') { calls.search++; assert.ok(req.headers.authorization === 'Bearer test-bocha'); } orig(req, res); });
  env.config({ llm: { provider: 'openai', baseUrl: base, apiKey: 'x', model: 'm' }, search: { apiKey: 'test-bocha', endpoint: base + '/v1/web-search', wikiEndpoint: base + '/w/api.php', budget: 100 } });
});
test.after(() => server.close());

test('开局检索：按出处评级，没出处的史事与要点降为存疑', async () => {
  const research = require('../engine/research');
  const progress = [];
  const w = await research.createWorld({ year: 1600, place: '苏州', identity: '绣娘', gender: '女' }, p => progress.push(p), { used: 0, max: 100 });
  assert.ok(calls.search >= 4, '应先联网检索');
  const ml = Object.fromEntries(w.mainline.map(m => [m.title, m]));
  assert.strictEqual(ml['苏州织工之变'].confidence, '已核');
  assert.strictEqual(ml['税监加征'].confidence, '二手');
  assert.strictEqual(ml['税监加征'].date.m, 12, '只信到年的放到年底，保证不早到');
  assert.strictEqual(ml['没有出处的大事'].confidence, '存疑');
  assert.strictEqual(w.facts.length, 1);
  assert.ok(w.identity.stats.some(x => x.key === 'health'), '自动补上身体');
  assert.strictEqual(w.eras[0].name, '万历');
  assert.ok(progress.some(p => p.step === 'done'));
});

test('自定义身份整局：醒来、来报、伏笔、续查、查一下、提要、收场', async () => {
  const research = require('../engine/research');
  const game = require('../engine/game');
  const cal = require('../engine/calendar');
  const w = await research.createWorld({ year: 1600, place: '苏州', identity: '绣娘' }, null, { used: 0, max: 100 });
  const s = game.newGameFromWorld(w, { used: 5 });
  assert.strictEqual(game.view(s).status.date.includes('清晨'), true);
  assert.strictEqual(game.view(s).status.name, '', '第一拍还不知道名字');
  await game.act(s, { type: 'beat', index: 0 });
  await game.act(s, { type: 'beat', text: '我先去绸庄看看' });
  assert.strictEqual(s.phase, 'turn');
  assert.ok(s.docket.some(d => d.ref.kind === 'hook0'), '第一件事上了案头');
  assert.ok(game.view(s).status.date.startsWith('万历二十八年'));
  await game.act(s, { type: 'goals', goals: ['攒下一张自己的织机', '不让娘受人欺负'] });
  const r = await game.act(s, { type: 'consult', person: 'mother' });
  assert.ok(r.consult.reply);
  let sawFake = false, sawUnsourced = false;
  for (let t = 0; t < 40 && s.phase === 'turn'; t++) {
    for (const d of s.docket) {
      if (d.title === '新玩意') sawFake = true;
      if (d.title === '假消息') sawUnsourced = true;
      const c = s.generated[d.uid];
      if (c && c.approaches.some(a => a.id === 'doc')) await game.act(s, { type: 'note', uid: d.uid, approachId: 'doc' });
    }
    await game.act(s, { type: 'endTurn', text: t % 3 ? '' : '照常做活' });
  }
  assert.ok(!sawFake, '含现代词的来报被丢弃');
  assert.ok(!sawUnsourced, '没出处的史事不发');
  assert.ok(s.gm.issues.some(i => i.where === '生成来报被拦'));
  assert.ok(s.story.some(e => e.kind === 'docket' && /药钱/.test(e.text || '')), '伏笔到期一定回来（大模型没写就本地兜底）');
  assert.ok(s.ext.mainline.length > 0, '快到头时自动往后续查');
  assert.ok(s.ext.horizon.y > 1603);
  assert.ok(s.recaps.length >= 1, '每十回合写前情提要');
  assert.ok(s.extraPeople.some(p => p.name === '阿巧'), '生成的新人物进了人物卡');
  assert.ok(s.goals.find(g => g.text.includes('娘')).progress > 0, '志向能推进');
  const lk = await game.act(s, { type: 'lookup', question: '税监' });
  assert.strictEqual(lk.lookup.grade, '已核');
  const h = game.historyView(s);
  assert.ok(h.table.some(m => m.title === '苏州织工之变' && m.status === 'delivered'));
  assert.ok(h.sources.length > 0);
  await game.act(s, { type: 'retire', why: '归隐收场' });
  assert.strictEqual(s.phase, 'ended');
  assert.ok(s.ending.text.includes('沈二姐'));
  assert.ok(cal.ord(s.date) > cal.ord({ y: 1603, m: 1, d: 1 }));
});

test('没填博查 Key：自动用免费的维基百科查，带出处', async () => {
  const llm = require('../engine/llm');
  const c = llm.config();
  const saved = c.search;
  c.search = { ...saved, apiKey: '' }; llm.saveConfig(c);
  try {
    const search = require('../engine/search');
    assert.strictEqual(search.providerName(), '维基百科（免费）');
    const before = calls.search;
    const list = await search.web('葛成 万历 苏州');
    assert.strictEqual(calls.search, before, '不该去调博查');
    assert.ok(list.length && list[0].url.includes('wikipedia.org'));
    assert.strictEqual(search.trust(list[0].url), '可信站点');
  } finally { c.search = saved; llm.saveConfig(c); }
});

test('检索关掉：史事一律"未查证"，默认不发', async () => {
  const llm = require('../engine/llm');
  const c = llm.config();
  const saved = c.search;
  c.search = { ...saved, provider: 'off' }; llm.saveConfig(c);
  try {
    const research = require('../engine/research');
    const game = require('../engine/game');
    const w = await research.createWorld({ year: 1600, identity: '绣娘' }, null, null);
    assert.ok(w.mainline.every(m => m.confidence === '未查证'));
    const s = game.newGameFromWorld(w);
    while (s.phase === 'opening') await game.act(s, { type: 'beat', index: 0 });
    for (let t = 0; t < 20; t++) await game.act(s, { type: 'endTurn' });
    assert.ok(!s.story.some(e => e.kind === 'docket' && e.title === '阊门外闹起来了'));
  } finally { c.search = saved; llm.saveConfig(c); }
});

test('服务端：新开局走后台任务，进度可查，存档落在临时目录', async () => {
  const { routes } = require('../server');
  const { job } = await routes['POST /api/new-custom']({ spec: { random: true } });
  let j;
  for (let i = 0; i < 100; i++) { j = await routes['POST /api/job']({ id: job }); if (j.status !== 'running') break; await new Promise(r => setTimeout(r, 50)); }
  assert.strictEqual(j.status, 'done', j.error);
  assert.ok(j.progress.length > 3);
  assert.ok(j.view && j.view.phase === 'opening');
  const saves = (await routes['GET /api/saves']()).saves;
  assert.ok(saves.length >= 1);
  assert.ok(process.env.SHU_SAVES.startsWith(env.root));
});

test('一句话开局：规则能抽出年份、朝代；"随便"就随机；单字朝代不误认', async () => {
  const research = require('../engine/research');
  const llm = require('../engine/llm');
  const c = llm.config(); const saved = c.llm; delete c.llm; llm.saveConfig(c);
  try {
    assert.deepStrictEqual(await research.parseText('随便'), { random: true });
    assert.strictEqual((await research.parseText('1600年苏州的绣娘')).year, 1600);
    assert.strictEqual((await research.parseText('公元前200年长安的商人')).year, -200);
    assert.strictEqual((await research.parseText('公元前200年长安的商人')).dynasty, undefined, '"公元"里的"元"不算元朝');
    assert.strictEqual((await research.parseText('唐朝的书生')).dynasty, '唐');
    assert.strictEqual((await research.parseText('清晨卖早点的')).dynasty, undefined, '"清晨"不是清朝');
    assert.strictEqual((await research.parseText('汉朝的戍卒')).dynasty, '西汉');
  } finally { c.llm = saved; llm.saveConfig(c); }
});

test('服务端：一句话开局、首页一步填 Key（不冲掉已有的博查 Key）、健康检查', async () => {
  const { routes } = require('../server');
  assert.deepStrictEqual(await routes['GET /api/health'](), { ok: true });
  const llm = require('../engine/llm');
  const before = llm.config();
  await routes['POST /api/quick-setup']({ deepseekKey: '', bochaKey: '' });
  assert.strictEqual(llm.config().search.apiKey, before.search.apiKey, '空 Key 不冲掉已有 Key');
  const { job } = await routes['POST /api/new-custom']({ text: '1600年苏州的绣娘' });
  let j;
  for (let i = 0; i < 100; i++) { j = await routes['POST /api/job']({ id: job }); if (j.status !== 'running') break; await new Promise(r => setTimeout(r, 50)); }
  assert.strictEqual(j.status, 'done', j.error);
  assert.strictEqual(j.view.phase, 'opening');
});

test('配置文件坏了（带 BOM 或乱码）：能读的照读，读不懂的先备份、不覆盖', () => {
  const fs = require('fs');
  const llm = require('../engine/llm');
  const good = llm.config();
  fs.writeFileSync(llm.CONFIG, '\uFEFF' + JSON.stringify(good));
  assert.deepStrictEqual(llm.config().llm, good.llm, '带 BOM 也能读');
  fs.writeFileSync(llm.CONFIG, '{坏了');
  assert.deepStrictEqual(llm.config(), {});
  assert.throws(() => llm.saveConfig({}), /读不懂/);
  assert.ok(fs.readdirSync(require('path').dirname(llm.CONFIG)).some(f => f.includes('.unreadable-')));
  fs.writeFileSync(llm.CONFIG, JSON.stringify(good));
  llm.config();
});
