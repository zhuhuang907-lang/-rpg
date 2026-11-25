// 全时代体检：各代表年份的政权/州府覆盖、重名、君主称号
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const years = (process.env.YEARS || '-200,0,100,200,280,350,500,600,618,700,755,800,880,907,930,960,1000,1050,1100,1150,1200,1279,1300,1368,1400,1500,1600,1644,1700,1800,1900,1911').split(',').map(Number);
  const r = await p.evaluate((years) => {
    const out = {};
    for (const y of years) {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      const R = realmsAt(y, 6), M = mapUnits(S), pol0n = String(S.place.polity || '');
      const names = R ? R.list.map(x => x.name) : [];
      // 一家有多少州府
      const cnt = {}; for (const u of M.L2) { if (!u.lat) continue; const g = M.reg(u); if (!g) continue; const nm = String(g.name || ''); cnt[nm] = (cnt[nm] || 0) + 1; }
      const zero = names.filter(n => !cnt[n]);
      // 同名根（荆南/荆南（南平）、辽/契丹这类）
      const root = n => String(n || '').replace(/[（(].*$/, '');
      const byRoot = {}; for (const n of names) (byRoot[root(n)] = byRoot[root(n)] || []).push(n);
      const dupRoot = Object.entries(byRoot).filter(([, L]) => L.length > 1).map(([k, L]) => k + ':' + L.join('/'));
      // 君主称号：庙号/谥号没换成当年称号的
      const RL = (() => { try { return rulersAt(y, S); } catch (e) { return []; } })();
      const titleBad = [], titleSample = [];
      for (const x of RL.slice(0, 80)) {
        const reg = (() => { try { return regRuler(S, { name: x.polity }) || ''; } catch (_) { return ''; } })();
        if (/[帝宗祖]$/.test(String(x.title || '')) && !/王|公|侯|可汗|赞普|单于/.test(String(x.title || ''))) titleBad.push(x.polity + '/' + x.name + '=' + x.title + (reg ? '→' + reg : '（无当年称号）'));
        if (titleSample.length < 6) titleSample.push(x.polity + '/' + x.name + '=' + (reg || x.title));
      }
      out[y] = { realms: names.length, zero: zero.slice(0, 12), dupRoot: dupRoot.slice(0, 8), titleBad: titleBad.slice(0, 10), sample: titleSample };
    }
    return out;
  }, years);
  console.log(JSON.stringify({ r, errs }, null, 1));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
