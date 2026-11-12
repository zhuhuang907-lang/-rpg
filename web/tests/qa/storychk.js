// 剧情 RPG 体检（R-206~208）：史论体打回、第二人称、对话场面、结尾行动钩；家常短步只查史论；好戏零缺陷
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof storyRpgCheck === 'function' && typeof draftFaults === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    const s = { protagonist: { name: '王二', age: 30, role: '佃户' }, clock: { y: 1068, m: 3, d: 5, yearLabel: '熙宁元年' }, place: { polity: '北宋', full: '扬州府江都县' }, people: {}, chat: [], goals: [], household: [], dossiers: {} };
    SETTINGS.len = 'normal';
    const said = '我去县衙问今年的青苗钱怎么交';
    // 1. 史论体 + 无对话 + 收死 + 第三人称：四条全打回
    const essay = `青苗钱是王安石变法的重要内容。历史告诉我们，这一制度深刻影响了宋代财政。纵观熙宁年间，全国各地陆续推行青苗法，究其原因，归根结底是国用不足。熙宁二年九月，制置三司条例司颁布青苗法，规定夏秋两收后随税偿还，每期取息二分。县里的吏员按户等抄录，乡里的里正挨家通知。粮房的算盘从早响到晚，来领钱的人和来还钱的人挤在一处。王二来到县衙，县令向他解释了政策要点，押司翻出旧册，逐条对照户等。王二听得半懂，只记住了二分利。回去的路上，他盘算着家里的几亩薄田。总之，青苗钱的推行意义深远，为后世留下了宝贵的经验。后来的事情，史书里写得很清楚。这一切都昭示着变法的必然性。`;
    let f = storyRpgCheck(s, said, essay, false);
    if (!f.some(x => x.includes('史论'))) bad.push('史论腔没打回：' + JSON.stringify(f));
    if (!f.some(x => x.includes('第二人称'))) bad.push('第三人称没打回');
    if (!f.some(x => x.includes('对话'))) bad.push('没对话没打回');
    if (!f.some(x => x.includes('结尾'))) bad.push('收死没打回');
    // 2. 合格的一场戏：第二人称、有对话、停在拿主意处、无史论 → 零缺陷
    const good = `你一大早赶到县衙，粮房前的队伍已经拐过照壁。押司把你让到廊下，翻着册子说：「你家的青苗钱折了八百文，谷贵的时候照市价折，官府不亏你。」他把笔往你手里一递：「愿意领钱的画押，领谷的去后院过斗——你走哪一头？」`;
    f = storyRpgCheck(s, said, good, false);
    if (f.length) bad.push('合格的一场戏被打回：' + JSON.stringify(f));
    // 3. 家常短一步：只查史论腔，没对话不罚
    const chatBad = `历史告诉我们，盐法自管仲以来多有变迁。你说了一句「哦」。`;
    f = storyRpgCheck(s, '你随便应了一声', chatBad, true);
    if (!f.some(x => x.includes('史论'))) bad.push('家常步史论没打回：' + JSON.stringify(f));
    const chatOk = `你说了一声「哦」，掌柜的把账本合上了。`;
    f = storyRpgCheck(s, '你随便应了一声', chatOk, true);
    if (f.length) bad.push('家常干净步被打回：' + JSON.stringify(f));
    // 4. draftFaults 不含 RPG 检查（回归不互相污染）：旧用例的短文本不带「你」也不打回
    const shortOld = `三日后的粮价涨了两成。`;
    const df = draftFaults(s, '歇了三天', shortOld, '');
    if (df.some(x => x.includes('第二人称') || x.includes('对话'))) bad.push('draftFaults 混进了 RPG 检查');
    return bad;
  });
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
