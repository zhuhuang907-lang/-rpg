// 930 闽王开局：外交/后勤/联姻/军务 可用性诊断
const { chromium } = require('playwright');
const PLAY = process.env.PLAY || 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof newSave === 'function' && typeof dipRole === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王';
    const D = (() => { try { return myDomain(S); } catch (e) { return { err: String(e) }; } })();
    const PW = (() => { try { return realmPowers(S).map(x => x.name); } catch (e) { return ['ERR ' + e]; } })();
    const out = {
      isRuler: (() => { try { return isRuler(S); } catch (e) { return 'ERR ' + e; } })(),
      pol0: (() => { try { return pol0(S); } catch (e) { return 'ERR ' + e; } })(),
      domainKind: D.kind, domainPlaces: D.places, domainSeat: D.seat,
      realmKeys: S.realm ? Object.keys(S.realm) : null,
      treasury: S.realm && S.realm.treasury, granary: S.realm && S.realm.granary,
      dipRole: (() => { try { return dipRole(S); } catch (e) { return 'ERR ' + e; } })(),
      logiOK: (() => { try { return logiOK(S); } catch (e) { return 'ERR ' + e; } })(),
      powers: PW.slice(0, 40), powersN: PW.length,
      forces: arr(S.forces).map(f => ({ name: f.name, leader: f.leader, at: f.at, troops: f.troops, mine: (() => { try { return myForce(S, f); } catch (e) { return 'ERR'; } })(), status: f.status })),
      depots: (() => { try { return depotsOf(S).map(d => ({ place: d.place, main: !!d.main, lv: d.lv, grain: N0(d.grain) })); } catch (e) { return ['ERR ' + e]; } })(),
      myPlaces: (() => { try { return myPlaces(S); } catch (e) { return ['ERR ' + e]; } })(),
      household: arr(S.household).map(m => ({ name: m.name, rel: m.relation, age: m.age, sex: m.sex, note: m.note, dead: m.dead })).slice(0, 30),
      kidOK: (() => { try { return arr(S.household).some(m => m && /子|女/.test(m.relation || '') && !/孙/.test(m.relation || '') && !m.dead && (num(m.age) == null || (num(m.age) >= 13 && num(m.age) <= 35)) && !/妻|夫|已嫁|已娶/.test(m.note || '')); } catch (e) { return 'ERR ' + e; } })(),
      dipHtmlLen: (() => { try { return diploHtml(S).length; } catch (e) { return 'ERR ' + e; } })(),
      logiHtmlLen: (() => { try { return logiHtml(S).length; } catch (e) { return 'ERR ' + e; } })(),
      warHtmlLen: (() => { try { return war2Html(S).length; } catch (e) { return 'ERR ' + e; } })(),
      armyTabLen: (() => { try { return armyTab(S).length; } catch (e) { return 'ERR ' + e; } })(),
      rice: (() => { try { return ricePrice(S); } catch (e) { return 'ERR ' + e; } })(),
      annualRev: (() => { try { return annualRev(S); } catch (e) { return 'ERR ' + e; } })(),
    };
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  console.log('ERRS ' + JSON.stringify(errs.slice(0, 5)));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
