// 人生纪事（R-245）：程序比前后两回的账，自动记下人生的转折——成的败的都记、只记头一回或真变了的；摆在「年谱」页最上面；不问模型
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1200 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof lifeScan === 'function' && typeof render0 === 'function');
  const out = await p.evaluate(() => {
    const bad = [], oc = callClaude; let asked = 0; callClaude = async () => { asked++; return { text: '{}' }; };
    try {
      const s = newSave({ name: '李大', gender: '男', age: 19, role: '庐州军户次子', gregorianYear: 906, month: 3, day: 1, place: '庐州', polity: '吴' }); s.chat = [{ role: 'gm', text: '开场。' }]; s.money.cash = 3; s.turn = 2;
      if (lifeScan(s).length || arr(s.life).length) bad.push('头一回只立底，不该记事');
      if (lifeScan(s).length) bad.push('什么都没变也记了事');
      const step = f => { s.turn = (s.turn || 0) + 1; f(); return lifeScan(s); };
      let r = step(() => { s.protagonist.role = '庐州军中兵士'; }); if (!r.some(x => /成了「庐州军中兵士」/.test(x))) bad.push('身份变了没记：' + r);
      r = step(() => { s.career = { office: '都头' }; }); if (!r.some(x => /头一回得官：都头/.test(x))) bad.push('头一回得官没记');
      r = step(() => { s.career.office = '指挥使'; }); if (!r.some(x => /改任指挥使/.test(x))) bad.push('改任没记');
      r = step(() => { s.household.push({ name: '王氏', relation: '妻', age: 18 }); s.money.cash = 40; }); if (!r.some(x => /成家：妻王氏/.test(x)) || !r.some(x => /十倍/.test(x))) bad.push('成家、发家没记：' + r);
      r = step(() => { s.household.push({ name: '李小乙', relation: '长子', age: 1 }); s.people['徐温'] = { favor: 65 }; s.people['朱瑾'] = { favor: 45 }; s.people['张颢'] = { favor: -50 }; }); if (!r.some(x => /添丁/.test(x)) || !r.some(x => /与徐温成了至交/.test(x)) || !r.some(x => /与张颢结下了仇/.test(x))) bad.push('添丁、至交、结仇没记：' + r); if (r.some(x => /朱瑾/.test(x))) bad.push('好感四十五就记成至交');
      r = step(() => { s.impeach = { by: '张颢', charge: '擅权' }; s.court2 = { patron: '徐温', moves: {}, known: {}, cases: [], log: [] }; }); if (!r.some(x => /被人上章参劾（张颢）/.test(x)) || !r.some(x => /投在徐温门下/.test(x))) bad.push('被参、投门下没记：' + r);
      // 败的也记：丢官、丧妻、家底败落、靠山没了
      r = step(() => { s.career.office = ''; s.household.find(m => m.name === '王氏').dead = true; s.money.cash = 0.2; s.court2.patron = ''; });
      for (const k of [/丢了官/, /妻王氏去世/, /家底败落/, /靠山徐温没了/]) if (!r.some(x => k.test(x))) bad.push('败的没记：' + k + ' / ' + r);
      // 改了史书上的事；换了人接着玩
      r = step(() => { s.history = arr(s.history).concat([{ event: '张颢弑杨渥', now: '事泄被诛' }]); }); if (!r.some(x => /改了史书上的一件事：张颢弑杨渥/.test(x))) bad.push('改史没记');
      r = step(() => { s.protagonist = { name: '李小乙', gender: '男', age: 20, role: '庐州军户' }; }); if (!r.some(x => /李大去世，李小乙接着/.test(x))) bad.push('换人接着玩没记');
      if (new Set(s.life.map(x => x.key)).size !== s.life.length) bad.push('同一件事记了两遍');
      // R-284（2026-11-27 项目主人：「人生纪事都是瞎编的」）：开局补的家室、照史补记的旧人、占位的钱、官职栏顶掉又改回、换个说法的身份、一国之主的兵，都不是转折
      const s2 = newSave({ name: '沈怀远', gender: '男', age: 20, role: '东京绸缎行富商之子', gregorianYear: 1126, month: 1, day: 15, place: '开封', polity: '北宋' }); s2.money.cash = 200; s2.turn = 1; lifeScan(s2);
      const st2 = f => { s2.turn++; f(); return lifeScan(s2); };
      let q = st2(() => { s2.household.push({ name: '王氏，闺名婉如', relation: '正室', age: 19, note: '茶商王家的女儿（推算）', inferred: true }, { name: '沈伯衡', relation: '父', age: 47, note: '史载；已故', rec: true }); s2.money.cash = 150000; s2.forces = []; });
      q = q.concat(st2(() => { s2.household.push({ name: '沈承宗', relation: '嫡子', age: 3, note: '（推算）', inferred: true }); s2.household.find(m => m.name === '沈伯衡').dead = true; s2.money.cash = 160000; }));
      q = q.concat(st2(() => { s2.career = { office: '知县' }; }), st2(() => { s2.career.office = '武英殿大学士'; }), st2(() => { s2.career.office = '知县'; }));
      q = q.concat(st2(() => { s2.protagonist.role = '河北兵马副元帅司札子暂领本部乡兵头目'; }), st2(() => { s2.protagonist.role = '副元帅司札子暂领本部（无品）'; }));
      for (const [re, why] of [[/成家/, '开局推算补的正室记成「成家」'], [/添丁/, '补记的推算嫡子记成「添丁」'], [/沈伯衡去世/, '史载已故的父亲记成这一年去世'], [/十倍/, '开局占位的两百文当底，记成「攒下了十倍」'], [/改任武英殿大学士/, '官职栏顶掉又改回，留着「改任」']]) if ((!/改任/.test(why) && q.some(x => re.test(x))) || s2.life.some(x => re.test(x.text))) bad.push(why);   // 改任那一回当时照记，改回来时一并撤掉
      if (s2.life.filter(x => /^role/.test(x.key)).length !== 1) bad.push('身份只换个说法也记成转折：' + s2.life.map(x => x.text).join('；'));
      const s3 = newSave({ name: '赵祯', gender: '男', age: 34, role: '皇帝', gregorianYear: 1043, month: 1, day: 1, place: '东京开封府', polity: '北宋', real: true }); s3.turn = 1; lifeScan(s3); s3.turn = 2;
      s3.forces = [{ name: '殿前司禁军', owner: '你', troops: 100000, at: '开封' }]; const q3 = lifeScan(s3); if (q3.some(x => /头一回手里有了兵/.test(x))) bad.push('皇帝的禁军晚一回立账，记成「头一回手里有了兵」');
      // 旧存档：照旧规矩记下的假转折打开时清掉
      const s4 = { protagonist: { name: '沈怀远', role: '副元帅司札子暂领本部' }, clock: { y: 1128 }, household: [{ name: '王氏，闺名婉如', relation: '正室', inferred: true }, { name: '汪楷', relation: '父', note: '早卒', rec: true, dead: true }], people: { 孙七: { favor: 20 } },
        life: [{ key: 'rich', turn: 1, text: '攒下了十倍于当初的家当' }, { key: 'wed_王氏，闺名婉如', turn: 1, text: '成家：正室王氏，闺名婉如' }, { key: 'troop1', turn: 6, text: '头一回手里有了兵（23人）' }, { key: 'friend_孙七', turn: 26, text: '与孙七成了至交' }, { key: 'poor42', turn: 42, text: '家底败落，手头只剩当初的一成' }, { key: 'die_汪楷', turn: 21, text: '父汪楷去世' }, { key: 'off6', turn: 6, text: '由知县改任典史' }, { key: 'off9', turn: 9, text: '由典史改任知县' }, { key: 'role46', turn: 46, text: '从「东京绸缎行富商之子」成了「副元帅司札子暂领本部」' }] };
      lifeTidy(s4); const left = s4.life.map(x => x.key).join(','); if (left !== 'troop1,role46') bad.push('旧存档的假转折没清干净（该剩 troop1,role46）：' + left);
      if (!LIFE_KINDS.every(k => s.life.some(x => x.kind === k))) bad.push('四类（人生、权力、人际、历史）没记全');
      if (asked) bad.push('记人生纪事还去问了模型');
      store.save = async () => {}; S = s; VIEW = 'game'; SIDE_FOLD = false; TAB = 'chron'; render0();
      const t = document.body.innerText; if (!/人生纪事/.test(t) || !/头一回得官：都头/.test(t) || !/丢了官/.test(t)) bad.push('年谱页上没有人生纪事');
    } finally { callClaude = oc; }
    return bad;
  });
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
