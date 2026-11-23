// 地图全年代扫描：从 -221 到 1911 每 20 年（五代十国每年）逐州对照「州→政权」常识表，列出可疑归属
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 30000 });
  const scan = async (Y) => p.evaluate((Y) => {
    S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: Y, month: 6, day: 1, place: '洛阳', polity: '唐' });
    const M = mapUnits(S), o = {};
    for (const u of M.L2) { if (!u.lat) continue; const r = M.reg(u); (o[r ? r.name : '（无主）'] = o[r ? r.name : '（无主）'] || []).push(u.n); }
    return o;
  }, Y);
  const years = []; for (let y = -200; y <= 1900; y += 20) years.push(y);
  for (let y = 885; y <= 975; y += 5) years.push(y);
  years.sort((a, b) => a - b);
  const out = {};
  for (const Y of years) out[Y] = await scan(Y);
  console.log('MAPSCAN ' + JSON.stringify(out));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
