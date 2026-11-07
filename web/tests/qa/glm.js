// GLM 写故事和推演、DeepSeek 做杂活；GLM 出错自动退回 DeepSeek；设置页能填 GLM Key、改分工（需求台账 R-135；2026-11-07 玩家：「可以接入 glm，以后用 glm 来写故事和辅助搜索……deepseek 干不担心结构和幻觉的活」）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  const hits = [];
  // 拦下发往 DeepSeek、GLM 的请求：照流式格式回一句话；GLM 的 Key 写 bad 时回 500
  await p.route(/api\.deepseek\.com|open\.bigmodel\.cn|api\.z\.ai/, async route => {
    const u = route.request().url(), h = route.request().headers(), body = JSON.parse(route.request().postData() || '{}');
    const who = /deepseek/.test(u) ? 'ds' : 'glm'; hits.push({ who, model: body.model, url: u });
    if (/\/models$/.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'glm-test-a' }, { id: 'glm-test-b' }] }) });
    if (who === 'glm' && /bad/.test(h.authorization || '')) return route.fulfill({ status: 500, body: 'busy' });
    const txt = body.response_format ? JSON.stringify({ ok: who }) : (who === 'glm' ? 'GLM写的' : 'DeepSeek写的');
    return route.fulfill({ status: 200, contentType: 'text/event-stream', body: `data: ${JSON.stringify({ choices: [{ delta: { content: txt } }] })}\n\ndata: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n` });
  });
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof callClaude === 'function' && typeof glmDirect === 'function');
  const bad = await p.evaluate(async () => {
    const bad = [];
    MODE = 'web'; SAMPLE = directSample; lsSet('hrpg:dskey', 'sk-test1234'); webKeyRefresh(); SETTINGS.route = null;
    // 没填 GLM：全走 DeepSeek
    lsSet('hrpg:glmkey', null); glmWebRefresh();
    let r = await callClaude('写一段', null, { json: false, kind: '写戏' }); if (!/DeepSeek/.test(r.text)) bad.push('没填 GLM 时写故事没走 DeepSeek：' + r.text);
    // 填了 GLM：写故事、推演记账、辅助搜索走 GLM；审读、编书走 DeepSeek
    lsSet('hrpg:glmkey', 'glm-key-ok'); lsSet('hrpg:glmmodel', 'glm-test-a'); lsSet('hrpg:glmbase', 'https://open.bigmodel.cn/api/paas/v4'); glmWebRefresh();
    r = await callClaude('写一段', null, { json: false, kind: '写戏' }); if (!/GLM/.test(r.text)) bad.push('写故事没走 GLM：' + r.text);
    for (const k of ['裁定', '记账', '检索', '研读']) { r = await callClaude('给表', null, { kind: k }); if (!/glm/.test(r.text)) bad.push(k + '没走 GLM：' + r.text); }
    for (const k of ['审读', '编书']) { r = await callClaude('看看', null, { json: false, kind: k }); if (!/DeepSeek/.test(r.text)) bad.push(k + '没走 DeepSeek：' + r.text); }
    // 设置里改分工：写故事改给 DeepSeek
    SETTINGS.route = { story: 'ds' }; r = await callClaude('写一段', null, { json: false, kind: '写戏' }); if (!/DeepSeek/.test(r.text)) bad.push('分工改了写故事给 DeepSeek，还走 GLM'); SETTINGS.route = null;
    // GLM 出错：自动改由 DeepSeek，不报错
    lsSet('hrpg:glmkey', 'glm-key-bad'); glmWebRefresh();
    try { r = await callClaude('写一段', null, { json: false, kind: '写戏' }); if (!/DeepSeek/.test(r.text)) bad.push('GLM 出错没退回 DeepSeek：' + r.text); } catch (e) { bad.push('GLM 出错直接报错给玩家：' + (e.message || e.code)); }
    // 只填 GLM 不填 DeepSeek：也能玩，全走 GLM
    lsSet('hrpg:glmkey', 'glm-key-ok'); glmWebRefresh(); lsSet('hrpg:dskey', null); webKeyRefresh();
    try { r = await callClaude('看看', null, { json: false, kind: '审读' }); if (!/GLM/.test(r.text)) bad.push('只填 GLM 时杂活没走 GLM'); } catch (e) { bad.push('只填 GLM 不能玩：' + (e.message || e.code)); }
    lsSet('hrpg:dskey', 'sk-test1234'); webKeyRefresh();
    // 设置页字数说法和实际约定一致
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' }); S.chat = [{ role: 'gm', text: '开场' }];
    TAB = 'set'; VIEW = 'game'; SIDE_FOLD = false; render0();
    const opt = [...document.querySelectorAll('#sLen option')].map(o => o.textContent).join('|');
    if (!/六百到一千字/.test(opt) || /八百到一千五百/.test(opt)) bad.push('设置页字数和实际约定不一致：' + opt);
    if (!document.querySelector('#gKey') || !document.querySelector('#rt-story')) bad.push('设置页没有 GLM 的 Key 框或分工表');
    return bad;
  });
  // 真点设置页：列出型号、选型号、保存并试连、改分工
  await p.click('#bGlmModels'); await p.waitForFunction(() => /列出 2 个型号/.test(document.body.innerText), null, { timeout: 8000 }).catch(() => bad.push('点「列出型号」没列出来'));
  await p.selectOption('#gModel', 'glm-test-b'); await p.fill('#gKey', 'glm-key-new');
  await p.click('#bGlmSave'); await p.waitForFunction(() => /试连通了/.test(document.body.innerText), null, { timeout: 8000 }).catch(() => bad.push('点「保存并试连」没试通'));
  const after = await p.evaluate(() => ({ key: lsGet('hrpg:glmkey'), model: lsGet('hrpg:glmmodel'), has: GLM.has }));
  if (after.key !== 'glm-key-new' || after.model !== 'glm-test-b' || !after.has) bad.push('设置页存的 GLM Key、型号不对：' + JSON.stringify(after));
  await p.selectOption('#rt-story', 'ds'); if ((await p.evaluate(() => (SETTINGS.route || {}).story)) !== 'ds') bad.push('改分工没存上');
  await p.click('#bGlmClear'); await p.waitForTimeout(300); if (await p.evaluate(() => GLM.has)) bad.push('清除 GLM Key 没清掉');
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
