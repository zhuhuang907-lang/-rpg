// 不要图片（2026-10-30 玩家：「我不想要图片功能」）：局面、人物册不摆画像，没有捏脸、换脸按钮，写正文的材料里不塞「捏出来的相貌」；页面照常
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const idle = () => p.waitForFunction(() => !BUSY, null, { timeout: 300000, polling: 300 }).catch(() => bad('卡住了'));
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart'); await p.waitForSelector('#said', { timeout: 300000 }); await idle();
  for (const tab of ['board', 'people']) { await p.click(`[data-tab="${tab}"]`).catch(() => {}); await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({ cv: document.querySelectorAll('canvas[data-face], canvas[data-face-npc]').length, btn: !!document.querySelector('#bFaceEdit, #bFaceRand'), txt: /捏脸|换一张脸/.test(document.body.innerText) }));
    if (r.cv || r.btn || r.txt) bad(tab + ' 页还有画像或捏脸按钮：' + JSON.stringify(r)); }
  await p.fill('#said', '找程立德问亏空的事'); await p.click('#bSend'); await p.waitForTimeout(500); await idle();
  const prompt = require('fs').existsSync('last_story_prompt.txt') ? require('fs').readFileSync('last_story_prompt.txt', 'utf8') : '';
  if (/【主角的相貌/.test(prompt)) bad('写正文的材料里还塞着捏出来的相貌');
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
