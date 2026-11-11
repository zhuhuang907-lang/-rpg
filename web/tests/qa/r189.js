// R-189 三方分工与原文库进推演：整理资料归 DeepSeek、写故事和想事情归 GLM；DeepSeek 出错改 GLM、GLM 出错改 DeepSeek；材料太长删中间；
// 开局人事树、朝堂全表、市面民生、探报的提示里带「史书原文佐证」
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof libEvidence === 'function');
  const r = await p.evaluate(async () => { const bad = [];
    KEY = { ...KEY, has: true }; GLM = { ...GLM, has: true, model: 'glm-x', base: 'https://glm-proxy.example/api/paas/v4' };
    const R = k => routeOf(k, false); if (R('研读') !== 'ds' || R('检索') !== 'ds' || R('核任期') !== 'ds' || R('审读') !== 'ds') bad.push('整理资料、核对、审稿没归 DeepSeek');
    if (R('推演') !== 'ds' || routeOf('写戏', true) !== 'ds') bad.push('默认没全交 DeepSeek');
    SETTINGS.route = { story: 'glm', struct: 'glm' }; if (R('推演') !== 'glm' || R('记账') !== 'glm' || routeOf('写戏', true) !== 'glm') bad.push('设置里选了 GLM 写故事、想事情没照走'); if (R('研读') !== 'ds') bad.push('整理资料不该给 GLM');
    // 互为后备
    const calls = []; const old = SAMPLE;
    SAMPLE = async (input, o) => { calls.push(o.provider === 'glm' ? 'glm' : 'ds'); if (o.provider !== 'glm') throw { code: 'local', message: 'DS 坏了' }; return { text: '{"ok":1}' }; };
    try { const x = await callClaude('测试', null, { kind: '研读', detached: true, thinking: false }); if (!/ok/.test(x.text) || calls.join() !== 'ds,glm') bad.push('DeepSeek 出错没改由 GLM：' + calls.join()); } catch (e) { bad.push('DeepSeek 出错整件失败：' + (e.message || e)); }
    calls.length = 0; SAMPLE = async (input, o) => { calls.push(o.provider === 'glm' ? 'glm' : 'ds'); if (o.provider === 'glm') throw { code: 'local', message: 'GLM 坏了' }; return { text: '{"ok":2}' }; };
    try { const x = await callClaude('测试', null, { kind: '推演', detached: true, thinking: false }); if (!/2/.test(x.text) || calls.join() !== 'glm,ds') bad.push('GLM 出错没改由 DeepSeek：' + calls.join()); } catch (e) { bad.push('GLM 出错整件失败'); }
    calls.length = 0; SAMPLE = async (input, o) => { calls.push(String(input).length); return { text: '{}' }; };
    await callClaude('甲'.repeat(200000), null, { kind: '推演', detached: true, thinking: false }); if (!(calls[0] <= CTX_MAX.ds + 100)) bad.push('材料太长没删中间：' + calls[0]);
    SAMPLE = old;
    // 原文库佐证进提示
    citeFetch = async () => [{ book: 'songshi', name: '宋史', volume: '卷一', text: '熙宁三年，以王安石同中书门下平章事。', score: 9 }];
    S = newSave({ name: '某人', gender: '男', age: 30, role: '知县', real: false, gregorianYear: 1070, month: 6, day: 1, place: '江宁府上元县', polity: '北宋' }); S.chat = [{ role: 'gm', text: '开场' }];
    const ev = await libEvidence(S, ['熙宁', '王安石*2'], '官制'); if (!/史书原文佐证/.test(ev) || !/《宋史》卷一/.test(ev)) bad.push('原文佐证没拼成材料：' + ev);
    S.money = { cash: 100, unit: '贯' }; S.econ = { v: 2, y: 1070, pl: geoCenter(S), unit: '贯', rice: 1, wage: 0.1 };
    let q = ''; callClaude = async (x) => { q = x; return { text: '{}' }; }; try { await msSim(S); } catch (_) {} if (!/史书原文佐证/.test(q)) bad.push('市面民生推演没带原文佐证');
    return bad; });
  const all = r.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
