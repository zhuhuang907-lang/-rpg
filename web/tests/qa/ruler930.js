const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 7, day: 3, place: '福州', polity: '闽' });
    const L = rulersAt(930, S).filter(x => /闽|后唐|吴|楚|南汉|荆南|吴越/.test(x.polity));
    return L.map(x => { let reg=''; try { for (const q of [x.polity, String(x.polity||'').replace(/[（(].*$/, '')]) { if (!q) continue; const v=regRuler(S,{name:q}); if (v){reg=v;break;} } } catch(_){} const nm=reg?reg.replace(/（.*$/,''):x.name, mm=/（([^（）]*)）\s*$/.exec(reg||''); return { pol:x.polity, rosterName:nm, rosterPost: mm?mm[1]:(x.title||x.polity), reg: reg || '(none)' }; });
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
