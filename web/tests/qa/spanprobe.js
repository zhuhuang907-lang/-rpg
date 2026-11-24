const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  await p.evaluate(() => { S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 2; VIEW = 'game'; render(); });
  const r = await p.evaluate(() => {
    const lab = document.querySelector('label[for="span"]'), sel = document.querySelector('#span');
    const a = lab.getBoundingClientRect(), b2 = sel.getBoundingClientRect();
    const cs = getComputedStyle(lab), cs2 = getComputedStyle(sel);
    return { labText: lab.textContent, labRect: [a.left, a.right, a.width], selRect: [b2.left, b2.right, b2.width], gap: b2.left - a.right, labMargin: cs.margin, labFlex: cs.flex, selMargin: cs2.margin, selFlex: cs2.flex, rowGap: getComputedStyle(lab.parentElement).gap };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
