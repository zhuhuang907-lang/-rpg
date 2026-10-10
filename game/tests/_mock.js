'use strict';
/** 测试用的假大模型与假博查：返回与真实接口相同格式的数据 */
const http = require('http');

/** 仿维基百科搜索接口的返回 */
const WIKI = { query: { search: [{ title: '葛成', pageid: 1, snippet: '<span>葛成</span>，明代苏州织工，万历二十九年……' }, { title: '万历', pageid: 2, snippet: '万历是明神宗的年号' }] } };

const CARDS = [
  { name: '明史·神宗本纪', url: 'https://zh.wikisource.org/wiki/明史/卷21', siteName: '维基文库', summary: '万历二十九年六月，苏州织工葛成等以税监孙隆加税，聚众击杀税官。' },
  { name: '万历年间苏州丝织业', url: 'https://www.example.com/suzhou-silk', siteName: '某网站', summary: '万历年间苏州机户、机工雇佣关系……米价、工钱的大致量级。' },
  { name: '明代称谓', url: 'https://blog.example.net/chengwei', siteName: '某博客', summary: '明代对已婚妇女称娘子……' },
];

function worldJson() {
  return {
    dynasty: '明',
    eras: [{ name: '万历', start: 1573, end: 1620, ruler: '明神宗', cite: ['S1'] }],
    identity: {
      name: '沈二姐', gender: '女', age: 19, origin: '苏州府长洲县', place: '苏州府长洲县', title: '城里机户人家的绣娘', idm: 'artisan', unit: 'month', startMonth: 3,
      executors: ['自己', '娘'],
      stats: [{ key: 'money', label: '手头的钱', value: 800, unit: '文' }, { key: 'skill', label: '手艺', value: 60, scale: ['生疏', '平常', '熟练', '出众'] }, { key: 'repute', label: '名声', value: 55, scale: ['坏', '有闲话', '平常', '好'] }, { key: 'kin', label: '娘的信任', value: 70, scale: ['冷淡', '平常', '亲近', '倚重'] }],
      groups: [{ key: 'neighbors', label: '街坊', value: 55 }, { key: 'guild', label: '机户同行', value: 50 }, { key: 'yamen', label: '税监爪牙', value: 30 }],
      regions: [{ name: '家里', cols: { 光景: '两张织机', 近况: '活计少' } }, { name: '阊门', cols: { 光景: '商铺林立', 近况: '税卡多了' } }],
      people: [
        { id: 'mother', name: '沈大娘', age: 44, role: '母亲', stance: '求稳', temper: '絮叨', sample: '"别跟人家去闹。"', want: '女儿嫁个好人家', betray: '不会', present: true },
        { id: 'boss', name: '周掌柜', age: 50, role: '绸庄掌柜', stance: '谁给钱听谁', temper: '笑面', sample: '"活计嘛，有的是。"', want: '压低工钱', betray: '税监来查时会推人出去', present: true },
      ],
      goals: ['攒下一张自己的织机', '不让娘受人欺负'],
      opening: [
        { text: '先是冷。窗外有人挑水，木桶碰着井沿。屋里有一股丝线的潮味。"二姐，起来了。"是娘。', meet: ['mother'], time: '清晨', actions: [{ label: '起身', bridge: '你应了一声，摸到床边的鞋。' }, { label: '再躺一会儿', bridge: '娘在外头又叫了一声。' }] },
        { text: '灶下煮着粥。娘说周掌柜昨天来过，说这个月的活计要减一半，又说阊门外的税卡又加了一道。', meet: [], actions: [{ label: '问娘活计的事', bridge: '娘叹了口气。' }, { label: '吃完去绸庄', bridge: '你出了门。' }] },
        { text: '绸庄里周掌柜笑着把一匹素缎推过来："这匹绣好，月底交，工钱照旧。可要是税监的人问起，你就说这缎子是你自己家的。"他在等你一句话。', meet: ['boss'] },
      ],
      hook: { title: '一匹素缎', from: '周掌柜', form: '当面', text: '周掌柜要你月底绣好一匹素缎，又要你替他瞒税。', deadline: 0, approaches: [
        { id: 'take', label: '接下，不多问', by: { boss: '"这才是明白人。"' }, eff: { money: 300 }, report: '你把素缎抱回了家。', rumor: '' },
        { id: 'refuse', label: '不接', by: { mother: '"瞒税的事，沾不得。"' }, eff: { money: -50 }, report: '周掌柜脸上的笑淡了。', rumor: '' },
      ] },
    },
    mainline: [
      { title: '苏州织工之变', year: 1601, month: 6, precision: 'month', fact: '万历二十九年六月，苏州织工葛成等击杀税官。', kind: 'fixed', cite: ['S1'], deliver: { delay: 0, from: '街坊', form: '传闻', title: '阊门外闹起来了', text: '街坊说阊门外的织工把税官打了。' } },
      { title: '税监加征', year: 1600, month: null, precision: 'year', fact: '税监在苏州增设税卡。', kind: 'fixed', cite: ['S2'], deliver: { delay: 0, from: '周掌柜', form: '口信', title: '税卡又加了', text: '周掌柜说城门口又多了一道税卡。' } },
      { title: '没有出处的大事', year: 1601, month: 3, precision: 'month', fact: '编出来的。', kind: 'fixed', cite: [], deliver: { delay: 0, from: '某人', form: '传闻', title: '假消息', text: '假的。' } },
    ],
    facts: [{ text: '苏州机户雇机工织造', cite: ['S2'] }, { text: '无出处的要点', cite: [] }],
    guard: { terms: [{ word: '天启', fromYear: 1621, why: '天启年号1621年才有' }], banned: [{ word: '苏州市', why: '后世建制' }] },
  };
}

function docketJson(prompt) {
  return {
    items: [
      { title: '娘的咳嗽', from: '娘', form: '饭桌上', type: '人事', text: '娘这几天夜里咳得厉害，又不肯请郎中。', deadline: 0, truth: '',
        approaches: [
          { id: 'doc', label: '请郎中', by: { mother: '"花那冤枉钱做什么。"' }, eff: { money: -100, kin: 6 }, report: '郎中开了药。', rumor: '', then: [{ hook: '郎中说娘的病要拖到开春，药钱还得续上。', after: 2 }], goal: { g2: 20 } },
          { id: 'wait', label: '再看看', by: {}, eff: { kin: -3 }, report: '', rumor: '' },
        ] },
      { title: '新玩意', from: '某人', form: '口信', type: '人事', text: '有人拿着手机来找你。', approaches: [{ id: 'x', label: '看看', eff: {} }] },
    ],
    newPeople: [{ id: 'aqiao', name: '阿巧', age: 17, role: '隔壁机户的女儿', stance: '跟你要好', temper: '嘴快', sample: '"二姐，听说没有？"', want: '学你的针法', betray: '被她爹逼问时' }],
  };
}

function reply(prompt) {
  if (prompt.includes('列出 6 到 9 个中文网页检索词')) return { queries: ['万历 苏州 织工', '明代 机户', '万历 年号', '明代 物价'] };
  if (prompt.includes('世界底本')) return worldJson();
  if (prompt.includes('续写一局历史模拟的主线史事')) {
    const m = prompt.match(/\[(S\d+)\]/);
    const y = Number((prompt.match(/公元(\d+)年 到/) || [])[1]) || 1604;
    return { eras: [], mainline: [{ title: '续查到的事' + y, year: y, month: 5, precision: 'month', fact: '续查到的一件事。', kind: 'fixed', cite: m ? [m[1]] : [], deliver: { delay: 1, from: '街坊', form: '传闻', title: '城里的新闻' + y, text: '城里在传一件新事。' } }], guard: { terms: [] } };
  }
  if (prompt.includes('为主角的案头写')) return docketJson(prompt);
  if (prompt.includes('回合结算。')) return { map: {}, custom: {}, free: [{ report: '你去阊门看了看行情。', eff: { money: -10 } }], color: '雨停了，巷子里湿漉漉的。' };
  if (prompt.includes('想查')) return { answer: '此时已有税监。', existsNow: true, cite: ['S1'] };
  if (prompt.includes('前情提要')) return '二姐接了周掌柜的素缎，娘病了。';
  if (prompt.includes('小传')) return '沈二姐，长洲县人，以刺绣为业。';
  return '"二姐，你自己拿主意。"';
}


/** 起一个假服务：/v1/web-search 仿博查，/chat/completions 仿 OpenAI 兼容接口 */
function start(port = 0) {
  const server = http.createServer((req, res) => {
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      const body = JSON.parse(b || '{}');
      res.writeHead(200, { 'content-type': 'application/json' });
      if (req.url === '/v1/web-search') return res.end(JSON.stringify({ code: 200, data: { webPages: { value: CARDS.map(c => ({ ...c, snippet: c.summary })) } } }));
      if (req.url.startsWith('/w/api.php')) return res.end(JSON.stringify(WIKI));
      const out = reply(body.messages[body.messages.length - 1].content);
      res.end(JSON.stringify({ choices: [{ message: { content: typeof out === 'string' ? out : JSON.stringify(out) } }] }));
    });
  });
  return new Promise(r => server.listen(port, () => r(server)));
}

module.exports = { reply, CARDS, WIKI, worldJson, docketJson, start };

if (require.main === module) start(Number(process.argv[2]) || 3199).then(s => console.log('mock on', s.address().port));
