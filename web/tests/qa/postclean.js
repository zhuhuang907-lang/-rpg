// 任职里的遭遇不算官职（任务三，R-221）：史料 posts 里把「削籍归里」「罢归」「致仕」「下狱论死」这类遭遇记成了官职，
// 旧代码取「此刻的官职」直接拿这一条，1624 年的高攀龙就成了官职「削籍归里」、被排进朝堂。现在遭遇不算官职（当他闲居），
// 「知江宁府（罢相）」这类只留官名
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof figuresAt === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    const s = newSave({ name: '某甲', gender: '男', age: 40, role: '翰林院编修', gregorianYear: 1625, month: 6, day: 1, place: '北京', polity: '明' });
    const at = (y, n) => figuresAt(s, y).find(f => f.name === n);
    const gao = at(1625, '高攀龙'); if (!gao) bad.push('1625 年找不到高攀龙'); else if (gao.post) bad.push('高攀龙 1625 年的官职是「' + gao.post + '」，遭遇不该算官职');
    const yang = at(1625, '杨涟'); if (yang && yang.post && /削籍|归里/.test(yang.post)) bad.push('杨涟官职是「' + yang.post + '」');
    for (const f of figuresAt(s, 1625)) if (f.post && /削籍|归里|下狱|论死|致仕|罢归|闲住/.test(f.post) && !/[官使尉令守史丞卿侍郎书军督府州县尹]/.test(f.post.replace(/削籍|归里|下狱|论死|致仕|罢归|闲住/g, ''))) bad.push(f.name + ' 1625 年官职是遭遇「' + f.post + '」');
    const s2 = newSave({ name: '某乙', gender: '男', age: 40, role: '知县', gregorianYear: 1076, month: 6, day: 1, place: '开封', polity: '宋' });
    const wang = figuresAt(s2, 1077).find(f => f.name === '王安石'); if (wang && /罢相|（|\(/.test(wang.post || '')) bad.push('王安石官职夹了经历：「' + wang.post + '」');
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
