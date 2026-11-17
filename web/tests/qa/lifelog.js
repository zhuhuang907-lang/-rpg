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
      const s = newSave({ name: '李大', gender: '男', age: 19, role: '庐州军户次子', gregorianYear: 906, month: 3, day: 1, place: '庐州', polity: '吴' }); s.chat = [{ role: 'gm', text: '开场。' }]; s.money.cash = 3;
      if (lifeScan(s).length || arr(s.life).length) bad.push('头一回只立底，不该记事');
      if (lifeScan(s).length) bad.push('什么都没变也记了事');
      const step = f => { s.turn = (s.turn || 0) + 1; f(); return lifeScan(s); };
      let r = step(() => { s.protagonist.role = '庐州军中兵士'; }); if (!r.some(x => /成了「庐州军中兵士」/.test(x))) bad.push('身份变了没记：' + r);
      r = step(() => { s.career = { office: '都头' }; }); if (!r.some(x => /头一回得官：都头/.test(x))) bad.push('头一回得官没记');
      r = step(() => { s.career.office = '指挥使'; }); if (!r.some(x => /改任指挥使/.test(x))) bad.push('改任没记');
      r = step(() => { s.household.push({ name: '王氏', relation: '妻', age: 18 }); s.money.cash = 40; }); if (!r.some(x => /成家：妻王氏/.test(x)) || !r.some(x => /十倍/.test(x))) bad.push('成家、发家没记：' + r);
      r = step(() => { s.household.push({ name: '李小乙', relation: '长子', age: 1 }); s.people['徐温'] = { favor: 45 }; s.people['张颢'] = { favor: -50 }; }); if (!r.some(x => /添丁/.test(x)) || !r.some(x => /与徐温成了至交/.test(x)) || !r.some(x => /与张颢结下了仇/.test(x))) bad.push('添丁、至交、结仇没记：' + r);
      r = step(() => { s.impeach = { by: '张颢', charge: '擅权' }; s.court2 = { patron: '徐温', moves: {}, known: {}, cases: [], log: [] }; }); if (!r.some(x => /被人上章参劾（张颢）/.test(x)) || !r.some(x => /投在徐温门下/.test(x))) bad.push('被参、投门下没记：' + r);
      // 败的也记：丢官、丧妻、家底败落、靠山没了
      r = step(() => { s.career.office = ''; s.household.find(m => m.name === '王氏').dead = true; s.money.cash = 0.2; s.court2.patron = ''; });
      for (const k of [/丢了官/, /妻王氏去世/, /家底败落/, /靠山徐温没了/]) if (!r.some(x => k.test(x))) bad.push('败的没记：' + k + ' / ' + r);
      // 改了史书上的事；换了人接着玩
      r = step(() => { s.history = arr(s.history).concat([{ event: '张颢弑杨渥', now: '事泄被诛' }]); }); if (!r.some(x => /改了史书上的一件事：张颢弑杨渥/.test(x))) bad.push('改史没记');
      r = step(() => { s.protagonist = { name: '李小乙', gender: '男', age: 20, role: '庐州军户' }; }); if (!r.some(x => /李大去世，李小乙接着/.test(x))) bad.push('换人接着玩没记');
      if (new Set(s.life.map(x => x.key)).size !== s.life.length) bad.push('同一件事记了两遍');
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
