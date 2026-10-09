'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const CFG = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shu-')), 'config.json');
process.env.SHU_CONFIG = CFG;
const scenario = require('../engine/scenario');
const guard = require('../engine/guard');

const scn = scenario.load('xining');
const Y1 = { y: 1068, m: 9, d: 14 };

test('把关能拦下时代错置、禁用词和考证腔', () => {
  assert.ok(guard.check('里正来催青苗钱', Y1, scn.guard).some(i => i.kind === '时代'));
  assert.deepStrictEqual(guard.check('里正来催青苗钱', { y: 1070, m: 2, d: 1 }, scn.guard), []);
  assert.ok(guard.check('临安城里', Y1, scn.guard).some(i => i.kind === '禁用'));
  assert.ok(guard.check('三娘子', Y1, scn.guard).length === 0, '"小娘子"之类的合法称呼不应被"小娘"误伤');
  assert.ok(guard.check('那个小娘唱得好', Y1, scn.guard).some(i => i.kind === '禁用'));
  assert.ok(guard.check('据考，此地……', Y1, scn.guard).some(i => i.kind === '出戏'));
  assert.ok(guard.check('苏通判来了', Y1, scn.guard).length > 0);
  assert.ok(guard.check('苏通判来了', { y: 1072, m: 1, d: 1 }, scn.guard).length === 0);
});

test('大模型写出时代错置的话：重写一次，仍不过关就退回本地内容；生成的来报不过关就丢弃', async () => {
  let calls = 0;
  const mock = http.createServer((req, res) => {
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      calls++;
      const body = JSON.parse(b);
      const wantJson = !!body.response_format;
      const content = wantJson
        ? JSON.stringify({ items: [{ title: '青苗钱', from: '里正', form: '口信', text: '官府来放青苗钱了', approaches: [] }] })
        : '据考，青苗法已经推行，临安城里人人都在说。';
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content } }] }));
    });
  });
  await new Promise(r => mock.listen(0, r));
  const cfg = CFG;
  fs.writeFileSync(cfg, JSON.stringify({ llm: { provider: 'openai', baseUrl: `http://127.0.0.1:${mock.address().port}`, apiKey: 'x', model: 'm' } }));
  try {
    const game = require('../engine/game');
    const s = game.newGame('xining', 'zhou');
    await game.act(s, { type: 'beat', text: '我先坐起来，喊阿桂进来' });
    const bridge = s.story.filter(e => e.kind === 'bridge').pop().text;
    assert.ok(!/青苗|临安|据考/.test(bridge), '生成的衔接文字被拦下后应退回本地内容');
    await game.act(s, { type: 'beat', index: 0 });
    assert.strictEqual(s.phase, 'turn');
    assert.ok(!s.docket.some(d => d.generated), '不过关的生成来报应被丢弃');
    const r = await game.act(s, { type: 'consult', person: 'agui' });
    assert.ok(!/青苗|临安|据考/.test(r.consult.reply));
    assert.ok(s.gm.issues.some(i => i.where === '生成被拦'));
    assert.ok(calls >= 4);
  } finally {
    fs.unlinkSync(cfg);
    mock.close();
  }
});
