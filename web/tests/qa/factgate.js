// 正文不作凭据（任务十六第一步，R-233）：写戏的模型在正文里凭空写主角得官、写在世的真人死了——
// 程序挑得出来、重写了还在就删那一句、存档里一样不认；玩家自己求的、在办的照认；许诺、传闻、丢官不误伤
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof factClaims === 'function' && typeof applyReply === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    const mk = () => { const s = newSave({ name: '王二', gender: '男', age: 24, role: '洛阳城外的佃户', gregorianYear: 930, month: 3, day: 5, place: '洛阳', polity: '后唐' }); s.chat = [{ role: 'gm', text: '开场' }]; return s; };
    const fig = (() => { const s = mk(); for (const h of histFor(930, s)) for (const f of arr(h.figures)) { const g = figState(s, f, 930, 3); if (f.name.length >= 2 && !(g && /unborn|gone|dead/.test(g.state || '')) && (f.died == null || f.died > 932)) return f.name; } return ''; })();
    if (!fig) bad.push('史料里找不到 930 年在世的真人，测试没法做');
    const said = '我去东市把今年的麦子卖了';
    const fake = `你挑着麦子进了东市。粮行的掌柜掂了掂，说：「今年的麦好，给你个实价。」正说着，一名中使策马而来，当街宣敕，授你为河南府参军。${fig}昨夜暴病，已死于府中。掌柜把钱串往你手里一塞：「数数。」你接过钱，日头已经偏西了。`;
    // 1 挑得出来
    let s = mk(); let c = factClaims(s, said, fake, null);
    if (!c.some(x => x.kind === 'gain')) bad.push('凭空得官没挑出来：' + JSON.stringify(c.map(x => x.kind)));
    if (!c.some(x => x.kind === 'death' && x.who === fig)) bad.push('在世真人的死讯没挑出来');
    if (factFaults(s, said, fake, null).length !== c.length) bad.push('没并进打回清单');
    // 2 删句：两句都没了，别的原样
    const sf = stripFacts(s, said, fake, null);
    if (/授你为|已死于/.test(sf.text) || !sf.text.includes('数数') || !sf.text.includes('粮行的掌柜')) bad.push('删句不对：' + sf.text);
    // 3 玩家自己求的、在办的：照认
    if (factClaims(s, '我去吏部投状，求补一个参军的缺', fake, null).some(x => x.kind === 'gain')) bad.push('玩家自己求官的也被挑了');
    s = mk(); s.acts = [{ id: 'a1', what: '托人保举我做河南府参军', state: '在办', type: '请' }];
    if (factClaims(s, said, fake, null).some(x => x.kind === 'gain')) bad.push('行动单上在办的升迁也被挑了');
    s = mk(); if (factClaims(s, `我去找${fig}，当面一刀结果了他`, fake, null).some(x => x.kind === 'death')) bad.push('玩家亲手动的真人也被挑了');
    // 4 不误伤：许诺、传闻、丢官、别人得官
    s = mk();
    for (const t of ['掌柜笑道：「你若肯投军，日后立了功，封你为将军也未可知。」你没有接话，只把麦子放下，等他开价。',
      `茶肆里有人说${fig}已死，也有人说是讹传，各执一词。你听了一耳朵，没往心里去，挑起担子接着往东市走。`,
      '差役把文书往案上一拍：「你被革去里正的差事了，明日起不必再来。」你站在堂下，一时不知说什么好，手里的名册还没放下。',
      '中使当街宣敕，授张从宾为河南府参军。街上的人都挤过去看，你被挤到了墙根，麦担子差点翻了，只好先退到粮行檐下。']) { const x = factClaims(s, said, t, null); if (x.length) bad.push('误伤：' + t.slice(0, 16) + JSON.stringify(x.map(z => z.kind))); }
    // 5 存档不认：身份、官职、真人生死
    s = mk(); const role0 = s.protagonist.role;
    const led = () => ({ reply: fake, mode: 'play', elapsedDays: 1, identity: { role: '河南府参军', why: '中使宣敕授为河南府参军', identityModule: 'official' }, career: { office: '河南府参军', rank: '从八品' }, realFates: [{ name: fig, alive: false, why: '暴病而死' }] });
    applyReply(s, led(), said);
    if (s.protagonist.role !== role0) bad.push('凭空的身份进了存档：' + s.protagonist.role);
    if ((s.career || {}).office === '河南府参军') bad.push('凭空的官职进了存档');
    if (((s.figOver || {})[fig] || {}).dead) bad.push('在世真人被记成死了');
    if (!arr(s.unbooked).some(u => /参军/.test(u.text))) bad.push('没落账的没摆给玩家看');
    // 6 有凭据的照落账：玩家自己求的官
    s = mk(); const said2 = '我去吏部投状，求补河南府参军的缺';
    applyReply(s, led(), said2);
    if (s.protagonist.role === role0 && (s.career || {}).office !== '河南府参军') bad.push('玩家求来的官没落账：' + s.protagonist.role + '/' + JSON.stringify(s.career));
    // 7 玩家亲手杀的真人照记
    s = mk(); const said3 = `我带人闯进府里，杀了${fig}`;
    applyReply(s, { reply: `你带人闯进府里。${fig}被你一刀砍倒，当场身死。`, mode: 'play', elapsedDays: 1, realFates: [{ name: fig, alive: false, why: '被主角所杀' }] }, said3);
    if (!((s.figOver || {})[fig] || {}).dead) bad.push('玩家亲手杀的真人没记');
    // 8 凭空的好处不落账：横财、妻妾、过头的好感；小钱照记；自己挣的照记；破财结仇照记
    s = mk(); s.money.cash = 300; s.people['赵四'] = { favor: 10 }; s.people['钱六'] = { favor: 0 };
    const gift = () => ({ reply: '你在东市卖了麦子。回来的路上，有个过路的富商硬塞给你五千钱，又把女儿许给了你。', mode: 'play', elapsedDays: 1,
      ledger: [{ item: '富商相赠', amount: 5000 }, { item: '路上捡的', amount: 20 }, { item: '被偷', amount: -100 }],
      household: [{ name: '柳三娘', relation: '妾', change: '纳妾' }], presentNpcs: [{ name: '赵四', favor: 90 }, { name: '钱六', favor: -70 }] });
    let c0 = s.money.cash; applyReply(s, gift(), '我回家歇着');
    if (!(s.money.cash < c0)) bad.push('横财进了存档：' + c0 + '→' + s.money.cash);
    if (arr(s.household).some(m => m.name === '柳三娘')) bad.push('凭空的妾进了存档');
    if (!(s.people['赵四'].favor <= 30)) bad.push('没打交道的人好感一回涨了：' + s.people['赵四'].favor);
    if (s.people['钱六'].favor !== -70) bad.push('结仇被拦了：' + s.people['钱六'].favor);
    if (!arr(s.unbooked).some(u => /富商相赠/.test(u.text)) || !arr(s.unbooked).some(u => /柳三娘/.test(u.text))) bad.push('没认的横财、妾没摆给玩家看');
    s = mk(); s.money.cash = 300; c0 = 300; applyReply(s, gift(), '我把麦子卖了，再托媒人去柳家说亲，纳柳三娘为妾');
    if (!(s.money.cash > c0)) bad.push('自己卖货挣的钱没落账：' + s.money.cash);
    if (!arr(s.household).some(m => m.name === '柳三娘')) bad.push('自己说亲纳的妾没落账');
    // 9 裁定说办不到的：玩家嘴上求了也不算凭据；裁定说能办的照认
    const no = { steps: [{ what: '去吏部求补参军的缺', ok: '办不到', why: '白身无出身，吏部不收状' }] }, yes = { steps: [{ what: '去吏部求补参军的缺', ok: '有代价', why: '要使钱' }] };
    s = mk(); if (!factClaims(s, said2, fake, no).some(x => x.kind === 'gain')) bad.push('裁定说办不到，正文写得了官，没挑出来');
    if (factClaims(s, said2, fake, yes).some(x => x.kind === 'gain')) bad.push('裁定说能办的也被挑了');
    s = mk(); CUR_RULING = no; try { applyReply(s, led(), said2); } finally { CUR_RULING = null; }
    if (s.protagonist.role !== role0 || (s.career || {}).office === '河南府参军') bad.push('裁定说办不到的官进了存档：' + s.protagonist.role);
    // 10 行动单：裁定说办不到、越权的，记账报办成也只记受阻；裁定说能的照记办成
    s = mk(); s.turn = 3; s.actsNow = [{ tmp: 't1', type: '令', what: '命河南尹开仓放粮', who: '河南尹', ok: '越权' }, { tmp: 't2', type: '试', what: '去粮行把麦子卖掉', who: '自己', ok: '能' }];
    CUR_RULING = { steps: [{ what: '命河南尹开仓放粮', ok: '办不到', why: '佃户管不到河南尹' }, { what: '去粮行把麦子卖掉', ok: '能' }] };
    let ar; try { ar = applyActs(s, { actResults: [{ id: 't1', state: '办成', why: '河南尹照办', changed: '开了仓' }, { id: 't2', state: '办成', why: '卖了', changed: '得钱' }] }); } finally { CUR_RULING = null; }
    if (!ar.some(x => /开仓/.test(x.what) && x.state === '受阻')) bad.push('越权办不到的令被记成办成：' + JSON.stringify(ar.map(x => [x.what, x.state])));
    if (!ar.some(x => /麦子/.test(x.what) && x.state === '办成')) bad.push('能办的事没记办成');
    // 11 对账（R-236）：落账前空跑各道闸，列出正文里账上不会认的事；不动存档；回执不把没认的账摆给玩家
    s = mk(); s.money.cash = 300; const before = JSON.stringify(s);
    let mm = ledgerMismatch(s, Object.assign(gift(), { identity: { role: '河南府参军', why: '授为河南府参军' } }), '我回家歇着', null);
    if (!mm.some(x => /富商相赠/.test(x)) || !mm.some(x => /柳三娘/.test(x)) || !mm.some(x => /参军/.test(x))) bad.push('对账没列全：' + JSON.stringify(mm));
    if (JSON.stringify(s) !== before) bad.push('对账空跑动了存档');
    if (ledgerMismatch(s, gift(), '我把麦子卖了，再托媒人去柳家说亲，纳柳三娘为妾', null).length) bad.push('自己挣的、自己说的亲也被列成对不上');
    const ri = reconcileInput('你回了家。', mm); if (!/富商相赠/.test(ri) || !/别处一个字不动/.test(ri)) bad.push('对账改稿的话不对');
    if (/其实没成|没落账|没认/.test(receiptHtml([{ state: '受阻', type: '令', what: '开仓', why: '越权' }], ['进项「富商相赠」5000']))) bad.push('回执还在把没认的账摆给玩家看');
    if (receiptHtml([], ['进项「富商相赠」5000']) !== '') bad.push('只有没认的账时回执没收起来');
    // 12 写戏的材料：上一回没发生的事注明；缺数先查账；查到的账给它
    s = mk(); s.turn = 4; s.unbooked = [{ turn: 4, text: '正文写了进项「富商相赠」5000，可这一步你没有做带来它的事，账上没认' }];
    let si = JSON.stringify(storyInput(s, '我去东市看看', '', '', false, null));
    if (!/上一回其实没有发生的事/.test(si) || !/富商相赠/.test(si)) bad.push('上一回没发生的事没告诉写戏的');
    if (!/缺数先查账/.test(si)) bad.push('没告诉写戏的可以查账');
    EXTRA_LOOK = '现钱 300'; try { si = JSON.stringify(storyInput(s, '我去东市看看', '', '', false, null)); } finally { EXTRA_LOOK = ''; }
    if (!/你要查的账/.test(si) || !/现钱 300/.test(si) || /缺数先查账/.test(si)) bad.push('查到的账没给写戏的');
    // 13 改稿没改掉的：带着那几个名字的句子由程序删掉；进项、办没办成这类没有名字可认的不乱删
    const mc = mismatchCut('你回了家，院门虚掩着。柳三娘已在堂上等着。你把担子放下，天已经黑了。灶上还温着一碗粥，你端起来喝了。隔壁的狗叫了两声，又静了。', ['主角没有得到：家里添了妾「柳三娘」']);
    if (/柳三娘/.test(mc) || !/灶上还温着/.test(mc)) bad.push('点了名的没删干净：' + mc);
    const mc2 = '你卖了麦子，得了五千钱。'; if (mismatchCut(mc2, ['主角没有得到：进项「富商相赠」5000']) !== mc2) bad.push('没名字可认的被乱删');
    // 14 山寨的名字不硬截（真模型实测：截出「府菏泽县境内山」）
    for (const [r, want] of [['曹州府菏泽县境内山寨寨主，手下有数十名喽啰', '胡家寨'], ['黑风寨寨主', '黑风寨'], ['梁山泊头领', '梁山泊'], ['太行山上的山寨寨主', '胡家寨'], ['曹县城外二龙山寨主', '二龙山']]) { const g = bandName(r, '胡大彪'); if (g !== want) bad.push('山寨名不对：' + r + ' → ' + g); }
    // 15 真模型实测的四处（2026-11-14）
    // 15a 引号统一成「」：“”写的对话也算对话，不再回回误判「没有对话」
    const dq = splitStory('你进了粮行。掌柜掂了掂麦子，抬眼看你：“今年的麦好，给你个实价，一石一贯二，卖不卖？”他把算盘往柜上一搁，等你回话。' + '门外有人挑着担子过去，喊了一声借光。'.repeat(8) + '掌柜又问了一遍：“卖不卖？”');
    if (/“|”/.test(dq.text) || !/「今年的麦好/.test(dq.text)) bad.push('引号没统一');
    if (storyRpgCheck(mk(), said, dq.text, false).some(x => /没有一段直接对话/.test(x))) bad.push('“”写的对话还被判成没有对话');
    // 15b 禁写题材：玩家自己在问粮问账的不算
    s = mk(); s.chat = [{ role: 'gm', text: '账本账簿账目，对账盘账。' }, { role: 'me', text: '看看寨里多少粮食银子' }, { role: 'gm', text: '账本账目。' }];
    if (bannedTopics(s, '问问管粮的，寨里的粮还够吃几个月').includes('账本账目')) bad.push('玩家自己问粮账，还禁写账本账目');
    // 15c 白身不凭空得官职：开局记账给寨主安巡抚不认；真做官的照认
    s = mk(); s.protagonist.role = '曹州府菏泽县境内山寨寨主，手下有数十名喽啰'; applyReply(s, { reply: '开场。', mode: 'play', elapsedDays: 0, career: { office: '山东巡抚', rank: '从二品' } }, '');
    if ((s.career || {}).office) bad.push('寨主被安了官职：' + s.career.office);
    s = mk(); s.protagonist.role = '菏泽县知县'; applyReply(s, { reply: '开场。', mode: 'play', elapsedDays: 0, career: { office: '菏泽县知县', rank: '正七品' } }, '');
    if ((s.career || {}).office !== '菏泽县知县') bad.push('知县的官职没立上');
    // 16 第二轮真模型实测：凭据词不被「官兵」「官道」带过去；开局不谈凭据；小毛病只改那几处
    s = mk(); s.press = [{ state: '临门', title: '官兵沿官道设卡盘查', who: '' }];
    if (gainSanction(s, '我回家歇着', null)) bad.push('「官兵」「官道」被当成求官的凭据');
    if (gainSanction(s, '', null)) bad.push('没人说话也谈凭据');
    if (!gainSanction(s, '我去吏部投状求官', null)) bad.push('真求官的不算凭据了');
    s = mk(); s.protagonist.role = '曹州府菏泽县境山寨寨主，领数十人据险自守'; s.press = [{ state: '临门', title: '官兵设卡', who: '' }];
    applyReply(s, { reply: '开场。', mode: 'play', elapsedDays: 0, career: { post: '山寨寨主', office: '山东巡抚（驻济南府）', rank: '无品级（非官）' } }, '');
    if ((s.career || {}).office) bad.push('寨主又被安了官职：' + s.career.office);
    if (bandName('曹州府菏泽县境山寨寨主，领数十人据险自守', '胡大彪') !== '胡家寨') bad.push('山寨名：' + bandName('曹州府菏泽县境山寨寨主，领数十人据险自守', '胡大彪'));
    if (!STRUCT_FAULT.test('没接住玩家这一步：玩家说……') || STRUCT_FAULT.test('史实：「寨主老爷」称谓不合') || STRUCT_FAULT.test('结尾收死了（落尾是……）')) bad.push('该整段重写的和只改几处的没分对');
    const pi = patchInput('你进了粮行。', ['史实：「一石三两五钱」米价超出量级——应当：改为一两七钱']); if (!/别处一个字不动/.test(pi) || !/一两七钱/.test(pi) || pi.length > 400) bad.push('只改几处的话不对或带了多余材料');
    // 17 正文里夹的内部按语不给玩家看（真模型第八轮）；正经的括注不动
    { const t = splitStory('郑兴把册子摊开：「如今在寨的，六十六人（账中喽啰改66）。能上阵的五十出头。」他又翻了一页（那页已经发黄）。').text;
      if (/账中/.test(t) || !t.includes('六十六人。') || !t.includes('（那页已经发黄）')) bad.push('内部按语没去干净或误删了正经括注：' + t); }
    return bad;
  });
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
