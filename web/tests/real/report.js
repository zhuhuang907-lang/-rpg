// 汇总真实模型压力测试：调用次数、token、失败、JSON、空输出、用时（按身份、开局/普通回合），每回的身份、权限、组织、兵马、现钱、审稿、回执和刷新恢复
const fs = require('fs'), path = require('path'); const OUT = process.argv[2];
const calls = fs.readFileSync(path.join(OUT, 'calls.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const L = []; const say = s => L.push(s);
say('# 真实 DeepSeek 压力测试报告\n'); try { say(fs.readFileSync(path.join(OUT, 'meta.txt'), 'utf8')); } catch (_) { }
const agg = cs => { const n = cs.length, inT = cs.reduce((a, c) => a + (c.usage ? c.usage.in || 0 : 0), 0), outT = cs.reduce((a, c) => a + (c.usage ? c.usage.out || 0 : 0), 0), hit = cs.reduce((a, c) => a + (c.usage ? c.usage.cacheHit || 0 : 0), 0);
  return { n, inT, outT, hit, fail: cs.filter(c => c.err || (c.status && c.status >= 400)).length, jsonFail: cs.filter(c => c.json && c.jsonOk === false).length, empty: cs.filter(c => c.empty).length, trunc: cs.filter(c => c.finish === 'length').length, ms: cs.reduce((a, c) => a + (c.ms || 0), 0) }; };
const row = (k, a) => `| ${k} | ${a.n} | ${a.inT} | ${a.outT} | ${a.hit} | ${a.fail} | ${a.jsonFail} | ${a.empty} | ${a.trunc} |`;
const personas = [...new Set(calls.map(c => String(c.phase).split(':')[0]))].filter(x => x !== 'start');
say('\n## 调用与 token（来自 API 实际返回的 usage）\n\n| 身份/阶段 | 调用 | 输入 token | 输出 token | 缓存命中 | 失败 | JSON 解析失败 | 空输出 | 截断 |\n|---|---|---|---|---|---|---|---|---|');
for (const k of personas) { const cs = calls.filter(c => String(c.phase).startsWith(k + ':')); const op = cs.filter(c => /开局/.test(c.phase)), tu = cs.filter(c => !/开局/.test(c.phase)); const nT = new Set(tu.map(c => c.phase)).size || 1;
  say(row(k + ' 开局', agg(op))); const a = agg(tu); say(row(k + ` 十回合（平均每回 ${(a.n / nT).toFixed(1)} 次、${Math.round((a.inT + a.outT) / nT)} token）`, a)); }
say('\n## 每类调用\n\n| 类 | 调用 | 输入 token | 输出 token | 缓存命中 | 失败 | JSON 解析失败 | 空输出 | 截断 |\n|---|---|---|---|---|---|---|---|---|');
for (const k of [...new Set(calls.map(c => c.kind))]) say(row(k, agg(calls.filter(c => c.kind === k))));
say('\n## 「其他」里是哪些（后台活，按提示词开头归类，前 15 种）\n\n| 开头 | 调用 | 输入 token | 输出 token |\n|---|---|---|---|');
{ const G = {}; for (const c of calls.filter(c => c.kind === '其他')) (G[c.head] = G[c.head] || []).push(c); for (const [h, cs] of Object.entries(G).sort((a, b) => b[1].length - a[1].length).slice(0, 15)) { const a = agg(cs); say(`| ${h} | ${a.n} | ${a.inT} | ${a.outT} |`); } }
for (const k of personas) {
  const dir = path.join(OUT, k); if (!fs.existsSync(dir)) continue;
  say(`\n## ${k}\n`);
  const files = fs.readdirSync(dir).filter(f => /^\d\d\.json$/.test(f)).sort();
  try { const o = JSON.parse(fs.readFileSync(path.join(dir, '00-opening.json'))); say(`开局：${o.ok ? '成' : '失败'}，${Math.round(o.ms / 1000)} 秒；${o.view.name}（${o.view.role}），${o.view.when}，${o.view.place}；身份 ${JSON.stringify(o.view.identity)}；面板 ${o.view.tabs.join('、')}；兵马 ${JSON.stringify(o.view.forces)}；自家势力 ${JSON.stringify(o.view.orgs)}；现钱 ${o.view.cash}`); } catch (e) { say('开局记录读不出：' + e.message); }
  for (const f of files) { const t = JSON.parse(fs.readFileSync(path.join(dir, f))); const v = t.view || {}, b = t.before || {}, a = t.after || {};
    const cash = [(b.money || {}).cash, (a.money || {}).cash], fc = x => JSON.stringify(((x || {}).forces || []).map(f => [f.name, f.troops])), og = x => JSON.stringify(((x || {}).orgs || []).filter(o => !o.gone).map(o => [o.name, o.kind, o.head, o.count, o.force, o.seat]));
    const cs = calls.filter(c => c.phase === `${k}:第${t.i}回`), ag = agg(cs);
    say(`\n### 第${t.i}回${t.trap ? '（★ 放了毛病）' : ''}：${t.said}\n- ${t.ok ? '成' : '卡住'}，${Math.round(t.ms / 1000)} 秒；调用 ${ag.n} 次（${[...new Set(cs.map(c => c.kind))].join('、')}），token 入 ${ag.inT} / 出 ${ag.outT}，失败 ${ag.fail}，JSON 失败 ${ag.jsonFail}，空 ${ag.empty}\n- 身份：${JSON.stringify(v.identity)}；roleKind ${v.roleKind}，govScope「${v.govScope}」；${v.when}，${v.place}`);
    say(`- 现钱 ${cash[0]} → ${cash[1]}；兵马 ${fc(b)} → ${fc(a)}；自家势力 ${og(b)} → ${og(a)}；人物 ${Object.keys(b.people || {}).length} → ${Object.keys(a.people || {}).length}`);
    say(`- 审稿：${JSON.stringify(v.review)}；改字 ${Array.isArray(v.audit) ? v.audit.length : 0} 处`);
    say(`- 行动单：${JSON.stringify(v.acts)}；没落账：${JSON.stringify(v.unbooked)}`);
    say(`- 回执：${String(v.receipt || '').replace(/\n+/g, ' / ').slice(0, 400)}`);
    say(`- 正文开头：${String(v.text || '').replace(/\n+/g, ' ').slice(0, 300)}`);
    if (t.errs && t.errs.length) say(`- 页面报错：${t.errs.slice(-3).join(' | ')}`); }
  try { say('\n刷新后恢复：' + fs.readFileSync(path.join(dir, '99-reload.json'), 'utf8')); } catch (_) { say('\n没有刷新记录'); }
}
console.log(L.join('\n'));
