// 家室合常情：四十多岁的盐商开局后照常情补上正妻、妾、子女、管家（标推算、写依据），不写「某」；长辈比本人小、儿女比本人大的年岁程序当场改
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !BG && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  await p.waitForFunction(() => arr(S.household).some(m => /正室|妻/.test(m.relation)), null, { timeout: 60000 }).catch(() => {});
  const h = await p.evaluate(() => ({ age: S.protagonist.age, H: arr(S.household).map(m => [m.relation, m.name, m.age, !!m.inferred, m.basis || '']), needs: familyNeeds(S) }));
  const has = re => h.H.some(m => re.test(m[0]));
  if (!has(/正室|妻/)) bad('四十多岁的盐商没有妻子：' + JSON.stringify(h));
  if (!has(/妾/)) bad('富商没有妾：' + JSON.stringify(h));
  if (!has(/子|女/)) bad('没有子女');
  if (!has(/管家|仆|婢/)) bad('大户人家没有仆婢');
  if (h.H.some(m => /某/.test(m[1]))) bad('家里人名字里有「某」：' + JSON.stringify(h.H));
  if (!h.H.some(m => m[3] && /推算|多/.test(m[4]))) bad('推出来的家里人没标推算、没写依据');
  if (h.needs.length) bad('补过一轮还缺：' + h.needs.join('、'));
  const wife = h.H.find(m => /正室/.test(m[0])), son = h.H.find(m => m[1] === '汪承裕');
  if (wife && son && !(wife[2] >= son[2] + 16)) bad('正妻比儿子大不到十六岁：' + JSON.stringify([wife, son]));
  const fx = await p.evaluate(() => { S.household.push({ relation: '母', name: '吴氏', age: 20 }, { relation: '长子', name: '汪大成', age: 60 }); const r = familyAgeFix(S); return { r, m: S.household.find(x => x.name === '吴氏').age, c: S.household.find(x => x.name === '汪大成').age, me: S.protagonist.age }; });
  if (!(fx.m >= fx.me + 15)) bad('母亲比本人还小，没改：' + JSON.stringify(fx));
  if (!(fx.c <= fx.me - 14)) bad('儿子比本人还大，没改：' + JSON.stringify(fx));
  await p.click('[data-tab="people"]'); await p.waitForTimeout(400);
  if (!/推算/.test(await p.evaluate(() => document.body.innerText))) bad('家室表上看不到推算的标记');
  console.log('HOUSE', JSON.stringify(h));
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
