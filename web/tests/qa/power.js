// 势力页天下各家全列、自家不列成别人、不留空白；人的本事只写品第不写数（CLAUDE.md 人物「本事不用数目量」、舆图「天下各方全列上」）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 430, height: 1600 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof realmPowers === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    // 2026-11-01 玩家截图：闽王王审知开局，势力页只五家、「闽」被列成别家、吴写杨隆演、国库地盘兵马整页空着、本事页一直空白
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' });
    S.idm = 'warlord'; S.realm = { treasury: null, granary: null, army: null };
    S.powers = [{ name: '闽', leader: '王审知', seat: '福州', troops: '约3万', stance: '对主角：宗主' }, { name: '吴', leader: '杨隆演', seat: '扬州', troops: '约10万', stance: '对主角：邻国' }, { name: '后梁', leader: '朱友贞', seat: '开封', troops: '约20万', stance: '对主角：宗主国' }];
    tidyState(S);
    if (S.powers.some(x => x.name === '闽')) bad.push('自家的「闽」还列在别家里');
    const PW = realmPowers(S), nm = PW.map(x => x.name);
    for (const n of ['后梁', '晋', '岐', '前蜀', '吴', '吴越', '楚', '南汉', '荆南', '契丹']) if (!nm.includes(n)) bad.push('天下各方漏了' + n);
    if (nm.includes('闽')) bad.push('自家政权列成了别家');
    const wu = PW.find(x => x.name === '吴'); if (!wu || !/杨溥/.test(wu.leader)) bad.push('921 年吴的首领应是杨溥，写成了' + (wu && wu.leader));
    if (PW.length < 20) bad.push('天下各方只列了' + PW.length + '家');
    // 地盘照地图先列上；国势、兵马没立好时写「正在推」，不写「没查定」「还没有」
    VIEW = 'game'; TAB = 'power'; SIDE_FOLD = false; render(); let t = document.body.innerText;
    if (arr(S.territory).length !== 5) bad.push('闽王的地盘没照地图列上：' + arr(S.territory).map(x => x.place));
    if (/没查定|还没有地盘|还没有兵马|还没有各方|史料没载/.test(t)) bad.push('势力页还有空白的说法：' + (t.match(/没查定|还没有地盘|还没有兵马|还没有各方|史料没载/) || [])[0]);
    if (!/正在照史料推/.test(t)) bad.push('没推好的地方没写「正在照史料推」');
    if (/户口约 ?0|守军 0/.test(t)) bad.push('不知道的户口守军写成了 0');
    if (!realmFixDue(S)) bad.push('一方之主国势空着，后台没排上立国势');
    // 后台推各家兵力：照返回的落到表上（假的 DeepSeek）
    const keep = window.callClaude; window.callClaude = async () => ({ text: JSON.stringify({ realms: [{ name: '晋', leader: '', seat: '', troops: 100000, why: '推：照河东、河北兵额', stance: '敌对', note: '与梁夹河相持' }, { name: '归义军', leader: '曹议金', seat: '沙州', troops: 10000, why: '推', stance: '互不往来', note: '据瓜沙' }] }) });
    try { await realmEstimate(S); } catch (e) { bad.push('推各家兵力报错 ' + (e.message || e.code)); } window.callClaude = keep;
    const P2 = realmPowers(S), jin = P2.find(x => x.name === '晋'), gy = P2.find(x => x.name === '归义军');
    if (!jin || !/100,000|10万/.test(jin.troops) || jin.stance !== '敌对') bad.push('推出的晋的兵力、态度没落到表上：' + JSON.stringify(jin));
    if (!gy || gy.leader !== '曹议金') bad.push('史料里没写首领的，推出的首领没落上：' + JSON.stringify(gy));
    if (realmEstDue(S)) bad.push('推完了还在重推');
    // 本事页：没评好时不空白；评好了只写品第不写数
    S.skills = null; TAB = 'skill'; render(); t = document.body.innerText;
    if (!/王审知/.test(t) || !/评好了就摆在这里/.test(t)) bad.push('本事页没评好时是空白');
    S.attrs = { 体魄: 6, 灵巧: 5, 智识: 8, 魅力: 7, 心志: 9 }; S.attrWhy = {}; S.skills = Object.fromEntries(SKILLS.map(([k]) => [k, { lv: k === '统兵' ? 70 : 0, xp: 0, basis: '' }])); S.renown = 800; S.traits = { 仁: 2, 义: 1, 信: 0, 勇: 1, 智: 2 };
    render(); t = document.body.innerText;
    if (/\d+\s*\/\s*10|统兵\s*\d|声望\s*\d|[+-]\d/.test(t.slice(t.indexOf('属性')))) bad.push('本事页还写着数');
    if (!/统兵：精熟/.test(t) || !/心志：超群/.test(t) || !/仁：颇著/.test(t)) bad.push('本事页没写品第');
    // 别人的各项也只写品第
    const st = { 统兵: { v: 88, g: '一代之选', why: '史载' }, 理财: { v: 45, why: '推' } };
    const h = statChips(st) + statFull(st); if (/>\d+</.test(h) || !/一代之选/.test(h) || !/平常/.test(h)) bad.push('人物各项还写着数：' + h.slice(0, 200));
    if (/\d/.test(peopleStatBlock({ people: { 甲乙: { stats: st } }, chat: [] }, '甲乙'))) bad.push('给写正文的人物各项还带数');
    // 评定的品第照字收、内部折成高低
    if (gradeV('出众') !== 75 || gradeV('胡说') !== null) bad.push('品第折算不对');
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
