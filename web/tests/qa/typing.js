// 打字与地图交互（R-278，2026-11-26 项目主人：「打字问题」「地图交互」）：组字不被重画打断、名册搜索连打不丢字丢焦点、
// 小地图上普通滚轮滚页面、Ctrl+滚轮才缩放、拖动地图松手不误选州
const { chromium } = require('playwright');
const path = require('path'); const PLAY = path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('file://' + PLAY);
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 7, day: 3, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王'; S.turn = 5;
    S.realm = { treasury: 118000, granary: 286000, revenue: 90000, outlay: 80000, army: 30000, capital: '福州' };
    S.territory = ['福州', '建州', '泉州', '漳州', '汀州'].map(x => ({ place: x, pop: 60000, troops: 5000, grain: 40000, loyalty: 60 }));
    S.forces = [{ name: '威武军', leader: '王延钧', at: '建州', troops: 11000, grain: 6000, morale: 62, train: 55, orgNow: 66, quality: '中', units: [], status: '驻守' }];
    S.chat = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? 'me' : 'gm', text: '第' + i + '条：长兴元年六月的福州，海风穿过王宫。' })); VIEW = 'game'; TAB = 'board'; render();
  });
  const out = {};
  // 1) 普通打字
  await p.click('#said');
  await p.type('#said', '遣使往吴越');
  out.type1 = await p.evaluate(() => ({ v: document.querySelector('#said').value, a: document.querySelector('#said').selectionStart }));
  // 2) 组字中重画：不该换掉 textarea
  out.ime = await p.evaluate(() => {
    const el = document.querySelector('#said'); window.__n = el; window.__v = el.value;
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    el.value = window.__v + '修好'; el.setSelectionRange(el.value.length, el.value.length);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    render();
    const same = window.__n === document.querySelector('#said');
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    return { sameNode: same, v: document.querySelector('#said').value };
  });
  await p.waitForTimeout(400);
  out.imeAfter = await p.evaluate(() => ({ v: document.querySelector('#said').value, focus: document.activeElement && document.activeElement.id }));
  // 3) 名册搜索：连打三个字，值/焦点不丢
  await p.evaluate(() => { TAB = 'court'; render0(); const i = document.querySelector('#rosterQ'); if (i) { i.focus(); i.value = ''; } });
  const hasRoster = await p.evaluate(() => !!document.querySelector('#rosterQ'));
  if (hasRoster) {
    await p.click('#rosterQ');
    for (const ch of ['王', '延', '钧']) { await p.type('#rosterQ', ch, { delay: 60 }); }
    await p.waitForTimeout(500);
    out.roster = await p.evaluate(() => ({ v: (document.querySelector('#rosterQ') || {}).value, focus: document.activeElement && document.activeElement.id }));
  } else out.roster = 'no #rosterQ';
  // 4) 滚动：窗口与侧栏
  await p.evaluate(() => { TAB = 'power'; render0(); window.scrollTo(0, 300); const s = document.querySelector('.side'); if (s) s.scrollTop = 260; });
  await p.waitForTimeout(200);
  const beforeScroll = await p.evaluate(() => ({ y: window.scrollY, side: (document.querySelector('.side') || {}).scrollTop }));
  await p.evaluate(() => render0());
  await p.waitForTimeout(200);
  const afterScroll = await p.evaluate(() => ({ y: window.scrollY, side: (document.querySelector('.side') || {}).scrollTop }));
  out.scroll = { beforeScroll, afterScroll };
  // 5) 地图滚轮：普通滚轮滚侧栏，Ctrl+滚轮缩放
  await p.evaluate(() => { TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 117.6, lat: 27.8 }; MAPZ.span = 3.4; MAPZ.big = false; render(); });
  await p.waitForTimeout(800);
  const box = await p.evaluate(() => { const el = document.querySelector('svg.smap'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, span: MAPZ.span, side: (document.querySelector('.side') || {}).scrollTop }; });
  if (box) {
    await p.mouse.move(box.x, box.y);
    await p.mouse.wheel(0, 300);
    await p.waitForTimeout(400);
    const plain = await p.evaluate(() => ({ span: MAPZ.span, side: (document.querySelector('.side') || {}).scrollTop }));
    const b2 = await p.evaluate(() => { const el = document.querySelector('svg.smap'); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.waitForTimeout(200); await p.mouse.move(b2.x, b2.y);
    await p.keyboard.down('Control'); await p.mouse.wheel(0, -300); await p.keyboard.up('Control');
    await p.waitForTimeout(700);
    const ctrl = await p.evaluate(() => ({ span: MAPZ.span }));
    out.wheel = { start: box, plain, ctrl };
  } else out.wheel = 'no map';
  // 6) 拖动地图后松手不误选
  const beforeSel = await p.evaluate(() => MAPZ.sel);
  if (box) {
    await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.mouse.move(box.x + 70, box.y + 30, { steps: 6 }); await p.mouse.up();
    await p.waitForTimeout(500);
  }
  out.dragSel = { before: beforeSel, after: await p.evaluate(() => MAPZ.sel) };
  const bad = [];
  if (out.type1.v !== '遣使往吴越') bad.push('普通打字不对：' + JSON.stringify(out.type1));
  if (!out.ime.sameNode) bad.push('输入法组字中重画换掉了输入框（拼音会被吞）');
  if (!/遣使往吴越修好/.test(out.imeAfter.v)) bad.push('组字结束后字丢了：' + JSON.stringify(out.imeAfter));
  if (typeof out.roster === 'object' && (out.roster.v !== '王延钧' || out.roster.focus !== 'rosterQ')) bad.push('名册搜索连打丢字或丢焦点：' + JSON.stringify(out.roster));
  if (out.wheel && typeof out.wheel === 'object') { if (out.wheel.plain.span !== out.wheel.start.span) bad.push('小地图上普通滚轮被地图吃去缩放了'); if (!(out.wheel.ctrl.span < out.wheel.start.span)) bad.push('Ctrl+滚轮没缩放地图：' + JSON.stringify(out.wheel)); }
  else bad.push('地图没画出来');
  if (out.dragSel.after !== out.dragSel.before) bad.push('拖动地图松手误选了州：' + JSON.stringify(out.dragSel));
  console.log('ERRS', JSON.stringify([...errs, ...bad]));
  await b.close(); process.exit(errs.length || bad.length ? 1 : 0);
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
