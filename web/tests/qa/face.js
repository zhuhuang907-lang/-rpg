// 捏脸：开局有画像（画布上真有图）；捏脸面板能改、能存；换一张脸；身边人的小像；相貌进了写正文的材料；页面重画不清空面板
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const idle = () => p.waitForFunction(() => !BUSY && !BG, null, { timeout: 120000, polling: 300 }).catch(() => bad('卡住了'));
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart'); await p.waitForSelector('#said', { timeout: 300000 }); await idle();
  const inked = sel => p.evaluate(sel => { const c = document.querySelector(sel); if (!c) return -1; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] < 120) n++; return n; }, sel);
  await p.click('[data-tab="board"]').catch(() => {}); await p.waitForTimeout(300);
  if (!(await p.evaluate(() => S.face && S.face.gender === 'male'))) bad('开局没有生成脸，或性别不对');
  if (await p.evaluate(() => S.face.headwear) !== '瓜皮帽') bad('清代男子没戴瓜皮帽：' + await p.evaluate(() => S.face.headwear));
  if ((await inked('canvas[data-face="me"]')) < 50) bad('局面里的画像是空白的');
  await p.click('#bFaceEdit'); await p.waitForTimeout(300);
  if (!(await p.$('#faceModal:not([hidden]) #fmCv'))) bad('捏脸面板没打开');
  await p.screenshot({ path: (process.env.SHOTS || '.') + '/face-editor.png' });
  await p.evaluate(() => render());   // 后台重画不该清掉面板
  if (!(await p.$('#faceModal:not([hidden]) #fmCv'))) bad('页面重画把捏脸面板清掉了');
  const r = await p.$('#fmPane input[type=range]'); await r.evaluate(el => { el.value = 95; el.dispatchEvent(new Event('input', { bubbles: true })); });
  const k = await r.getAttribute('data-fmk');
  await p.click('#fmOk'); await p.waitForTimeout(300);
  if ((await p.evaluate(k => S.face[k], k)) !== 95) bad('捏好的脸没存上');
  const before = await p.evaluate(() => JSON.stringify(S.face)); await p.click('#bFaceRand'); await p.waitForTimeout(200);
  if (await p.evaluate(() => JSON.stringify(S.face)) === before) bad('换一张脸没换');
  await p.fill('#said', '找程立德问亏空的事'); await p.click('#bSend'); await p.waitForTimeout(500); await idle();
  const prompt = require('fs').readFileSync('last_story_prompt.txt', 'utf8');
  if (!/【主角的相貌/.test(prompt)) bad('相貌没进写正文的材料');
  await p.click('[data-tab="people"]').catch(() => {}); await p.waitForTimeout(400);
  const n = await p.evaluate(() => document.querySelectorAll('canvas[data-face-npc]').length);
  if (!n) bad('人物册里没有小像'); else if ((await inked('canvas[data-face-npc]')) < 20) bad('身边人的小像是空白的');
  const same = await p.evaluate(() => { const k = Object.keys(S.npcFaces || {})[0]; return k && JSON.stringify(S.npcFaces[k]); });
  await p.reload(); await p.waitForTimeout(1500); await p.click('[data-tab="people"]').catch(() => {}); await p.waitForTimeout(400);
  if (same && same !== await p.evaluate(() => { const k = Object.keys(S.npcFaces || {})[0]; return k && JSON.stringify(S.npcFaces[k]); })) bad('同一个人刷新后换了脸');
  await p.screenshot({ path: (process.env.SHOTS || '.') + '/face-people.png' });
  await p.click('[data-tab="board"]').catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: (process.env.SHOTS || '.') + '/face-board.png' });
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
