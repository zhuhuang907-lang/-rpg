// 舆图缩放、跟人走、兵牌与军情卡、胜算、天时与军中突发之事（CLAUDE.md 舆图「放大了才标州县名、跟着人走」、军事「兵牌、胜算、突发之事」）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 430, height: 1300 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof mapUnits === 'function' && typeof stratMap === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' });
    S.idm = 'warlord'; S.territory = [{ place: '福州' }, { place: '泉州' }];
    S.forces = [{ name: '威武军', leader: '王审知', owner: '你', troops: 12000, morale: 68, orgNow: 72, train: 60, grain: 40000, at: '福州', status: '驻守' }, { name: '泉州兵', leader: '王延彬', owner: '你', troops: 5000, morale: 30, orgNow: 50, at: '泉州', status: '行军' }];
    S.campaigns = [{ force: '泉州兵', target: '汀州', mode: '攻', state: '行军', li: 400, done: 120, pace: 40 }];
    // 一个字的州（福州、虔州）认得出：以前 samePlace 一律对不上
    if (!samePlace('虔州', '虔州') || !samePlace('福州', '福州') || samePlace('福州', '泉州')) bad.push('一个字的州名认不出是同一处');
    // 天下图不标各州府名；放大才标
    MAPZ.inited = true; MAPZ.mode = 'world'; MAPZ.sel = ''; MAPZ.from = ''; MAPC.k = '';
    const names = h => (h.match(/>[^<>]{1,4}州</g) || []).length;
    let h = stratMap(S); const nW = names(h);
    MAPZ.mode = 'near'; MAPZ.c = { lon: 117.5, lat: 26.5 }; MAPZ.span = 3; MAPZ.follow = false; MAPC.k = ''; h = stratMap(S); const nZ = names(h);
    if (nW > 12) bad.push(`天下图上标了${nW}个州名，太挤（应只标都城、你在的、有兵的）`); if (nZ <= nW) bad.push(`放大以后州名没变多（天下${nW}、放大${nZ}）`);
    // 缩放：放大两倍 span 减半，缩到很大回天下
    mapZoomBy(2); if (Math.abs(MAPZ.span - 1.5) > 0.01) bad.push('放大按钮没把范围缩一半：' + MAPZ.span); mapZoomBy(0.05); if (MAPZ.mode !== 'world') bad.push('缩得很小没回到天下图');
    // 跟着人走：你走到哪图跟到哪；拖开看别处就不跟
    MAPZ.mode = 'near'; MAPZ.follow = true; MAPZ.span = 1.2; mapTab(S); if (Math.abs(MAPZ.c.lon - hereXY(S).lon) > 0.01) bad.push('本地图没以你为中心');
    S.place.full = '泉州'; S.at = '泉州'; const h2 = hereXY(S); mapTab(S); if (h2 && Math.abs(MAPZ.c.lon - h2.lon) > 0.01) bad.push('你走到泉州，图没跟过去');
    mapPanBy(3, 0); if (MAPZ.follow !== false) bad.push('拖开以后还在硬跟着你');
    // 你不在图里：图边上有箭头指回你
    MAPZ.mode = 'near'; MAPZ.c = { lon: 113, lat: 30 }; MAPZ.span = 1; MAPZ.follow = false; MAPC.k = ''; h = stratMap(S); if (!/点这里回到你那儿/.test(h)) bad.push('你不在图里时，图边没有指回你的箭头');
    // 兵牌：有兵力、士气、组织三条；行军的画出去向；点了出军情卡
    MAPZ.c = { lon: 118.9, lat: 25.6 }; MAPZ.span = 2.5; MAPC.k = ''; h = stratMap(S);
    if (!/data-mapforce="威武军"/.test(h) || !/data-mapforce="泉州兵"/.test(h)) bad.push('图上没有兵牌');
    if (!/marker-end="url\(#marr\)"/.test(h)) bad.push('行军的兵马没画去向');
    MAPZ.from = '威武军'; MAPZ.sel = '虔州'; const card = mapInfo(S);
    if (!/⚑ 威武军/.test(card) || !/军粮够/.test(card)) bad.push('选了兵马没出军情卡');
    if (!/打虔州的胜算：约 \d+%/.test(card) || !/吴的守军/.test(card)) bad.push('打别国的城，胜算没照那国的守军算（以前当成没人守）');
    if (!/data-write="令威武军进攻虔州"/.test(card)) bad.push('军令按钮没写成整句军令');
    // 天时：大雨、大雪等照季节南北定，同一回同一处结果一样
    S.clock.m = 1; const w1 = warWeather(S, '幽州'), w2 = warWeather(S, '幽州'); if (JSON.stringify(w1) !== JSON.stringify(w2)) bad.push('同一处天候一回里变来变去');
    let snow = 0, rain = 0; for (let t = 0; t < 60; t++) { S.turn = t; S.clock.m = 1; if (/雪/.test(warWeather(S, '幽州').txt)) snow++; S.clock.m = 6; if (/雨/.test(warWeather(S, '福州').txt)) rain++; } if (!snow || !rain) bad.push(`北方冬天不下雪、南方夏天不下雨（雪${snow}雨${rain}）`);
    S.clock.m = 7; let snowSummer = 0; for (let t = 0; t < 60; t++) { S.turn = t; if (/雪/.test(warWeather(S, '福州').txt)) snowSummer++; } if (snowSummer) bad.push('福州七月下大雪');
    // 突发之事：真扣人、记年谱、一月至多两件
    S.place.full = '福州'; S.at = ''; let ev = [], men0 = S.forces.reduce((a, f) => a + f.troops, 0);
    for (let t = 0; t < 40; t++) { S.turn = t; S.clock.m = (t % 12) + 1; const e = armyHazards(S, 1); const per = {}; for (const x of e) { const k = x.slice(0, 3); per[k] = (per[k] || 0) + 1; } if (Object.values(per).some(v => v > 2)) bad.push('一个月一支兵出了两件以上的事'); ev = ev.concat(e); }
    const men1 = S.forces.reduce((a, f) => a + (f.troops || 0), 0);
    if (!ev.length) bad.push('四十个月一件突发之事都没有'); if (!(men1 < men0)) bad.push('疫病逃亡没真扣人'); if (!arr(S.chronicle).some(c => c.who === '军中')) bad.push('突发之事没记进年谱');
    if (ev.some(x => /undefined|NaN/.test(x))) bad.push('突发之事的话里有 undefined/NaN：' + ev.find(x => /undefined|NaN/.test(x)));
    // 别家的兵马不出突发之事（只算归你调的）
    S.forces.push({ name: '吴军', leader: '刘信', owner: '吴', troops: 20000, morale: 10, at: '虔州' }); S.powers = [{ name: '吴', leader: '徐温' }];
    for (let t = 0; t < 40; t++) { S.turn = t; if (armyHazards(S, 1).some(x => /^吴军/.test(x))) { bad.push('别家的兵马也出了突发之事'); break; } }
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
