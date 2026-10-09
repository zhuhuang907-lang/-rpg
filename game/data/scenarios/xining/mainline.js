'use strict';
/**
 * 主线史事表 · 熙宁变法（1068–1076）
 *
 * 规则：
 * - confidence：'已核'＝有可信来源；'二手'＝只有百科、通俗文章或研究者转述，月份可能有出入；
 *   '存疑'＝来源互相矛盾或只凭记忆 → 一律不发给玩家（deliver 不写），只在史事面板里显示为待核。
 * - precision：'month' 月可信；'season' 只信到季（来源月份互相矛盾时用）；'year' 只信到年。
 *   正文只能写到 precision 这一级，比如 season 级的条目不得写出具体月份。
 * - kind：'fixed' 不因玩家而变（天灾、外任、人物行迹）；'court' 朝廷决策。
 *   朝廷决策在"皇帝"身份里变成待决的来报（照史发生与否由玩家定），在其他身份里依史发生。
 * - deliver：按身份类别给出来报的到达方式。delay 单位是月。没写某类就表示这类身份收不到。
 * - 每条都要有 source。改动本表前，先在 史实核查/ 里登记。
 */

const SRC = {
  shenzong: 'https://www.thepaper.cn/newsDetail_forward_30875472',
  wasRuDui: 'https://game.xiaomi.com/viewpoint/1599755827_1789446947179_16',
  hanqi: 'https://www.thepaper.cn/newsDetail_forward_3150506',
  nanjiao: 'https://www.chinanews.com/cul/2014/04-28/6112599.shtml',
  chensz: 'https://k.sina.cn/article_6539764538_185cce33a00100nuto.html',
  suizhou: 'https://www.rujiazg.com/article/28801',
  fubi: 'https://baike.baidu.com/item/%E5%AF%8C%E5%BC%BC/1479250',
  timeline: 'https://zh.wikipedia.org/wiki/%E7%86%99%E8%B1%90%E8%AE%8A%E6%B3%95',
  qingmiao: 'https://www.cssn.cn/skgz/bwyc/202303/t20230328_5616194.shtml',
  junshu: 'https://qks.sufe.edu.cn/j/PDFFull/A160824005620.pdf',
  qmLiangzhe: 'https://www.rujiazg.com/article/18800',
  zhaobian: 'https://zh.wikipedia.org/zh-hans/%E8%B6%99%E6%8A%83',
  zhaobianHz: 'https://hznews.hangzhou.com.cn/wenti/content/2025-02/23/content_8866628.htm',
  baojia: 'https://www.guoxuedashi.net/shijian/231246coet/',
  sushiHz: 'https://hznews.hangzhou.com.cn/wghz/content/2024-05/13/content_8728204.htm',
  liujing: 'https://hznews.hangzhou.com.cn/wghz/content/2020-11/16/content_7854443.htm',
  zhengxia: 'https://www.fuqing.gov.cn/xjwz/zwgk/ztzl/fqsjwjcw/xcjy/202212/t20221208_4483883.htm',
  bamian: 'https://baike.baidu.com/item/%E7%8E%8B%E5%AE%89%E7%9F%B3%E5%8F%98%E6%B3%95/705728',
  wuyue: 'https://www.aisixiang.com/data/154328.html',
  sushiLeave: 'https://www.cssn.cn/skgz/bwyc/202609/t20260924_6068791.shtml',
  mianyi: 'https://kotobank.jp/word/%E5%8B%9F%E5%BD%B9%E6%B3%95-132558',
  yaqian: 'https://www.zywhyj.cn/Uploads/PdfFile/2023-04-11/643504b6e7453.pdf',
};

module.exports = [
  // ———— 开局之前（背景，只进史事面板与人物记忆） ————
  {
    id: 'M00', date: { y: 1067, m: 1 }, precision: 'month', kind: 'fixed', scope: '京师',
    title: '英宗崩，神宗即位', confidence: '已核', source: [SRC.shenzong],
    fact: '治平四年正月，英宗崩，太子赵顼即位，次年改元熙宁。',
    background: true,
  },
  {
    id: 'M00b', date: { y: 1067, m: 10 }, precision: 'month', kind: 'fixed', scope: '陕西',
    title: '种谔取绥州', confidence: '二手', source: [SRC.suizhou],
    fact: '治平四年十月，种谔招降嵬名山部，取绥州，赐名绥德城。司马光先前曾上疏力谏。',
    background: true,
  },
  {
    id: 'M01', date: { y: 1068, m: 4 }, precision: 'month', kind: 'fixed', scope: '京师',
    title: '王安石越次入对', confidence: '二手', source: [SRC.wasRuDui],
    fact: '熙宁元年，召王安石为翰林学士；四月越次入对，神宗问为治所先，对以"择术为先"。',
    background: true,
  },
  {
    id: 'M02', date: { y: 1068, m: 7 }, precision: 'month', kind: 'fixed', scope: '陈升之',
    title: '陈升之知枢密院事', confidence: '二手', source: [SRC.chensz],
    fact: '熙宁元年七月，陈升之知枢密院事（枢密使由文彦博担任，故只任知院）。',
    background: true,
  },
  {
    id: 'M03', date: { y: 1068, m: 7 }, precision: 'year', kind: 'fixed', scope: '河北',
    title: '河朔灾伤，韩琦出判大名', confidence: '二手', source: [SRC.hanqi],
    fact: '熙宁元年七月，韩琦复判相州；河北受灾，又改判重灾区大名府，熙宁二年二月正式任河北四路安抚使、判大名府。',
    deliver: {
      court: { delay: 0, from: '河北路转运司', form: '奏状', text: '河朔今岁灾伤，州县仓廪不继，流移之民渐多。乞朝廷拨赐钱粮，宽减今岁秋税，并择重臣镇抚。' },
    },
  },
  // ———— 熙宁元年 ————
  {
    id: 'M04', date: { y: 1068, m: 11 }, precision: 'year', kind: 'court', scope: '京师',
    title: '南郊赐赉之议', confidence: '二手', source: [SRC.nanjiao],
    fact: '熙宁元年，执政以河朔灾伤、国用不足，请南郊不赐金帛。司马光以为救灾节用当自贵近始；王安石以为善理财者不加赋而国用足。',
    deliver: {
      court: {
        delay: 0, from: '中书', form: '札子',
        text: '今岁河朔灾伤，国用不足。臣等乞今冬南郊大礼，两府臣僚所当赐金帛，一切辞免，以佐经费。伏候圣旨。',
      },
    },
    choice: {
      prompt: '两府请辞南郊赐赉。准，还是不准？',
      history: '神宗以为然，但仍"不允"；王安石草诏引常衮故事，两府遂不敢再辞。',
    },
  },
  // ———— 熙宁二年 ————
  {
    id: 'M05', date: { y: 1069, m: 2 }, precision: 'month', kind: 'court', scope: '京师',
    title: '王安石参知政事，置制置三司条例司', confidence: '二手', source: [SRC.timeline, SRC.wasRuDui],
    fact: '熙宁二年二月，王安石除参知政事；设制置三司条例司，主持变法。',
    deliver: {
      court: { delay: 0, from: '翰林学士王安石', form: '札子', text: '理财以平均为先。乞置一司，取三司条贯详加讲求，兴利除弊，以为天下法。' },
      official: { delay: 2, from: '邸报', form: '邸报', text: '翰林学士王安石除参知政事。又置制置三司条例司，讲求财利之法。' },
      commoner: { title: '京里换了个管钱粮的参政', delay: 6, from: '茶坊里的闲话', form: '传闻', text: '说是京里换了个姓王的参政，专管钱粮，脾气硬得很。' },
    },
    choice: { prompt: '用不用王安石主持财计？', history: '神宗用之。' },
  },
  {
    id: 'M06', date: { y: 1069, m: 2 }, precision: 'month', kind: 'court', scope: '京师',
    title: '富弼拜相', confidence: '二手', source: [SRC.fubi],
    fact: '熙宁二年二月，富弼拜相；后因反对青苗法，熙宁四年六月罢使相。',
    deliver: {
      official: { delay: 2, from: '邸报', form: '邸报', text: '富弼拜相。' },
    },
  },
  {
    id: 'M07', date: { y: 1069, m: 7 }, precision: 'month', kind: 'court', scope: '东南六路',
    title: '均输法', confidence: '二手', source: [SRC.junshu],
    fact: '熙宁二年七月，于淮、浙、江、湖六路立均输法，由发运司"徙贵就贱，用近易远"，调度上供物资。',
    deliver: {
      court: { delay: 0, from: '制置三司条例司', form: '札子', text: '东南六路上供，岁有定额，丰年不敢多取，歉岁不能足数。乞令发运使总六路财赋，徙贵就贱，用近易远，以省劳费。' },
      official: { delay: 2, from: '路分转运司', form: '牒', text: '奉敕：六路上供并听发运司均输，徙贵就贱，州县毋得违误。' },
      commoner: { title: '米行说上供的米要改法子', delay: 4, from: '米行的伙计', form: '传闻', text: '城里米行的人说，往后上供的米由发运司调拨，哪里贱就在哪里买，行里的价怕是要被官家搅动。' },
    },
    choice: { prompt: '东南六路上供改归发运司均输，行不行？', history: '行之。' },
  },
  {
    id: 'M08', date: { y: 1069, m: 9 }, precision: 'month', kind: 'court', scope: '河北、京东、淮南先行',
    title: '青苗法', confidence: '已核', source: [SRC.qingmiao],
    fact: '熙宁二年九月颁青苗法（常平新法），以常平、广惠仓钱谷为本，春散秋敛；首批在河北、京东、淮南路试行。',
    deliver: {
      court: { delay: 0, from: '制置三司条例司', form: '札子', text: '常平、广惠仓钱谷，积而不散，民无所资。乞以其本散与人户，春借秋还，取息二分，使兼并之家不得乘新陈不接以邀倍息。先于河北、京东、淮南试行。' },
      official: { delay: 2, from: '邸报', form: '邸报', text: '诏以常平、广惠仓钱谷为本，散与人户，春散秋敛。先行于河北、京东、淮南三路。' },
    },
    choice: { prompt: '青苗法先在三路试行，准不准？', history: '准，熙宁三年推及诸路。' },
  },
  {
    id: 'M09', date: { y: 1069, m: 11 }, precision: 'month', kind: 'court', scope: '诸路',
    title: '农田水利法', confidence: '二手', source: [SRC.timeline],
    fact: '熙宁二年十一月颁农田利害条约（农田水利法），鼓励开垦、兴修水利。',
    deliver: {
      official: { delay: 2, from: '邸报', form: '邸报', text: '颁农田利害条约：吏民能知土地种植之法、陂塘圩垾堤堰沟洫利害者，皆得自言。' },
    },
  },
  // ———— 熙宁三年 ————
  {
    id: 'M10', date: { y: 1070, m: 2 }, precision: 'season', kind: 'fixed', scope: '两浙',
    title: '青苗钱散于两浙，抑配之争', confidence: '二手', source: [SRC.qmLiangzhe],
    fact: '熙宁三年春，青苗法推及诸路。知杭州郑獬言两浙诸州乡民皆不愿请青苗钱，提举官一入境，州县即支俵；变法派李定所言相反。',
    deliver: {
      official: { delay: 0, from: '提举常平官', form: '牒', text: '奉敕：青苗钱本路诸州并依条支俵，愿请者听，州县毋得阻抑。' },
      court: {
        delay: 1, from: '知杭州郑獬', form: '奏状', text: '两浙诸州乡民，皆不愿请青苗钱；提举官一入境，州县即时支俵，名为愿请，实同抑配。乞罢提举官，听民自便。',
        approaches: [
          { id: 'forbid', label: '下诏严禁抑配，愿请者听', kw: ['禁', '抑配', '愿请'], by: { sima: '"散青苗本为惠民，抑配则为害民。"' }, eff: { people: 3, 'g.censors': 4, treasury: -2 }, report: '诏诸路提举官毋得抑配。', rumor: '提举官们说，不催就散不出去。' },
          { id: 'trust', label: '以变法派所奏为准，不予理会', kw: ['不理', '不予', '照旧'], by: { wang: '"此皆浮议。李定自江南来，言民便之。"' }, eff: { 'g.censors': -5, people: -3 }, report: '郑獬奏状不下。', rumor: '有人说郑獬不久要被调走。' },
        ],
      },
      commoner: {
        title: '里正来劝请青苗钱', region: { 县里: { 近况: '催请青苗钱' } }, delay: 0, from: '里正', form: '口信', text: '官府今春放青苗钱，按户等借，秋后连本带息还。里正说上头催得紧，上户都要请。',
        approaches: [
          { id: 'take', label: '劝母亲照里正说的请', kw: ['请', '借', '照办'], by: { uncle: '"上户都要请，周家不请，里正面上不好看。"' }, eff: { money: 0, 'g.yamen': 5 }, flags: { qingmiaoDebt: 1 }, report: '伯父出面请了，说秋后连本带息还。', rumor: '邻村有人家请了钱，转手就花了，秋后还不上。' },
          { id: 'refuse', label: '劝母亲推说不缺钱，不请', kw: ['不请', '不借', '推'], by: { mother: '"借官府的钱，到时候还不上，要吃官司的。"' }, eff: { 'g.yamen': -6 }, report: '里正脸色不好看，说"上头问起来，我可不替你家担着"。', rumor: '' },
          { id: 'uncle', label: '由伯父拿主意', kw: ['伯父', '不管'], by: {}, eff: {}, report: '伯父请了一笔。', rumor: '' },
        ],
      },
    },
  },
  {
    id: 'M11', date: { y: 1070, m: 4 }, precision: 'month', kind: 'fixed', scope: '杭州',
    title: '赵抃知杭州', confidence: '已核', source: [SRC.zhaobian, SRC.zhaobianHz],
    fact: '熙宁三年四月，赵抃因反对青苗法，以资政殿学士知杭州；同年十二月诏移青州，四年正月与沈立交割。',
    deliver: {
      official: { delay: 0, from: '州衙', form: '公文', text: '资政殿学士赵抃到任知杭州。' },
      commoner: { title: '新来的知州', region: { 城中: { 近况: '新知州姓赵' } }, delay: 0, from: '街坊', form: '传闻', text: '新来的知州姓赵，听说是在京里跟王参政顶过嘴才外放的。' },
    },
  },
  {
    id: 'M12', date: { y: 1070, m: 12 }, precision: 'month', kind: 'court', scope: '京师、畿县',
    title: '王安石同平章事；保甲法试行畿县', confidence: '二手', source: [SRC.baojia, SRC.timeline],
    fact: '熙宁三年十二月，王安石、韩绛并同中书门下平章事；同时在开封府畿县试行保甲法，十家为保。',
    deliver: {
      court: { delay: 0, from: '司农寺', form: '札子', text: '乞于畿县团结保甲：十家为一保，五保为一大保，十大保为一都保。主户两丁以上选一人为保丁，农隙教阅，夜则轮巡。' },
      official: { delay: 2, from: '邸报', form: '邸报', text: '王安石、韩绛并同中书门下平章事。司农寺颁畿县保甲条例。' },
    },
    choice: { prompt: '拜王安石为相，并在畿县试行保甲？', history: '行之。' },
  },
  // ———— 熙宁四年 ————
  {
    id: 'M13', date: { y: 1071, m: 10 }, precision: 'season', kind: 'court', scope: '诸路',
    title: '免役法颁行', confidence: '二手', source: [SRC.timeline, SRC.mianyi, SRC.yaqian],
    fact: '熙宁四年颁行免役（募役）法：罢差役，按户等出免役钱，由官府雇人充役；原不服役的官户等出助役钱。（颁行月份各书有出入，只信到季。）',
    deliver: {
      court: { delay: 0, from: '司农寺', form: '札子', text: '乡户差充衙前，破产者相属。乞罢差役，令人户随等第出钱，官自募人充役；坊郭、官户、寺观亦量出助役钱。' },
      official: { delay: 2, from: '提举司', form: '牒', text: '奉敕颁免役条贯：罢乡户衙前等差役，依户等出免役钱。县须重定户等、造簿。' },
      commoner: {
        title: '往后不派衙前了', region: { 县里: { 光景: '重排户等，改收免役钱' } }, delay: 3, from: '里正', form: '口信', text: '往后不再派衙前了，改成按户等交免役钱，官府自己雇人。县里要重排户等。',
        approaches: [
          { id: 'tell', label: '把这事说给母亲和伯父听', kw: ['说', '告诉'], by: { agui: '"伯父知道了，就不用再怕衙前了吧？"' }, eff: { uncle: -8, mother: 3 }, report: '伯父听完，半晌说了一句："早两年有这个法子，何至于……"他没往下说。', rumor: '' },
          { id: 'ask', label: '问里正：周家要交多少', kw: ['多少', '问'], by: { mother: '"问清楚，好有个数。"' }, eff: { 'g.yamen': 2 }, report: '里正说要等县里重排了户等才知道。', rumor: '' },
        ],
      },
    },
    choice: { prompt: '罢差役，改为出钱募役？', history: '行之。' },
  },
  {
    id: 'M14', date: { y: 1071, m: 11 }, precision: 'month', kind: 'fixed', scope: '杭州',
    title: '苏轼到杭州任通判', confidence: '已核', source: [SRC.sushiHz],
    fact: '熙宁四年十一月，苏轼到杭州任通判，至熙宁七年离任。',
    deliver: {
      official: { delay: 0, from: '州衙', form: '公文', text: '新任通判苏轼到任。' },
      commoner: { title: '州里来了个新通判', delay: 1, from: '街坊', form: '传闻', text: '州里来了个新通判，姓苏，听说文章写得极好，在京里说新法的不是，才放到杭州来的。' },
    },
  },
  {
    id: 'M14x', date: { y: 1071, m: 2 }, precision: 'year', kind: 'court', scope: '科举',
    title: '贡举改制（罢诗赋）', confidence: '存疑', source: [],
    fact: '熙宁四年前后改贡举、罢诗赋、以经义论策取士；月份未查实，暂不发给玩家。',
  },
  // ———— 熙宁五年 ————
  {
    id: 'M15', date: { y: 1072, m: 3 }, precision: 'month', kind: 'court', scope: '京师',
    title: '市易法', confidence: '二手', source: [SRC.timeline],
    fact: '熙宁五年三月颁市易法，在京师置市易务，收购滞销货物，贵时出卖，限制大商人操纵物价。',
    deliver: {
      court: { delay: 0, from: '魏继宗等', form: '奏状', text: '京师百货无常价，富商大贾因时乘公私之急，以邀倍息。乞置市易务，贱则少增价取之，贵则少损价出之。' },
      official: { delay: 2, from: '邸报', form: '邸报', text: '诏在京置市易务。' },
    },
    choice: { prompt: '在京师置市易务？', history: '行之。' },
  },
  {
    id: 'M16', date: { y: 1072, m: 6 }, precision: 'year', kind: 'fixed', scope: '杭州',
    title: '陈襄、苏轼修浚钱塘六井', confidence: '已核', source: [SRC.liujing],
    fact: '熙宁五年，知州陈襄修浚杭州六井，通判苏轼协助，以瓦筒代竹管，并新置二井；苏轼作《钱塘六井记》。',
    deliver: {
      official: { delay: 0, from: '州衙', form: '公文', text: '知州陈公议修六井，令诸县量差工役。' },
      commoner: { title: '城里在修六井', region: { 城中: { 近况: '州里修浚六井' } }, delay: 0, from: '街坊', form: '传闻', text: '州里在修城中的六井，说要把竹管换成瓦筒，往后井水就不会断了。' },
    },
  },
  {
    id: 'M17x', date: { y: 1072, m: 8 }, precision: 'year', kind: 'court', scope: '京东',
    title: '方田均税法', confidence: '存疑', source: [SRC.timeline],
    fact: '方田均税法颁行，一说熙宁四年八月，一说熙宁五年八月；先行于京东，暂不发给两浙的玩家。',
  },
  // ———— 熙宁七年 ————
  {
    id: 'M18', date: { y: 1074, m: 3 }, precision: 'season', kind: 'court', scope: '京师',
    title: '郑侠上流民图；王安石罢相', confidence: '二手', source: [SRC.zhengxia, SRC.bamian],
    fact: '熙宁七年春，久旱，监安上门郑侠绘《流民图》上进，请罢新法。同年王安石罢相，出知江宁府（月份有四月、六月两说，只信到季）。',
    deliver: {
      court: { delay: 0, from: '监安上门郑侠', form: '奏疏（附图）', text: '臣谨以逐日所见，绘成一图。旱魃为虐，流民扶携塞道，质妻鬻子，斩桑伐木以偿官钱。乞罢新法，以召和气。' },
      official: { delay: 3, from: '邸报', form: '邸报', text: '王安石罢相，出知江宁府。' },
      commoner: { title: '京里那位王相公罢了', delay: 4, from: '街坊', form: '传闻', text: '听说京里那位王相公罢了，有人画了张逃荒的图给官家看。' },
    },
    choice: { prompt: '流民图摆在案上，罢不罢王安石？', history: '罢之，以韩绛代，吕惠卿参知政事。' },
  },
  {
    id: 'M19', date: { y: 1074, m: 7 }, precision: 'season', kind: 'fixed', scope: '杭州',
    title: '苏轼离杭', confidence: '二手', source: [SRC.sushiHz, SRC.sushiLeave],
    fact: '熙宁七年秋，苏轼离杭州通判任，移知密州（七月、九月两说）。',
    deliver: {
      commoner: { title: '苏通判要走了', delay: 0, from: '街坊', form: '传闻', text: '苏通判要走了，说是调去山东做知州。' },
    },
  },
  // ———— 熙宁八年 ————
  {
    id: 'M20', date: { y: 1075, m: 2 }, precision: 'month', kind: 'court', scope: '京师',
    title: '王安石复相', confidence: '二手', source: [SRC.bamian],
    fact: '熙宁八年二月，王安石复相；与吕惠卿关系破裂，变法阵营分裂。',
    deliver: {
      court: {
        delay: 0, from: '中书', form: '札子', text: '王安石罢相以来，中书议论多有不协，新法推行渐缓。或请召王安石还朝。',
        approaches: [
          { id: 'recall', label: '召王安石还朝复相', kw: ['召', '复相', '还朝'], by: { wang: '（王安石不在京。）' }, eff: { 'g.council': 3, 'g.censors': -4, admin: 2 }, report: '遣使召王安石于江宁。', rumor: '吕惠卿闻讯，数日不出。', mainlineSet: 'followed' },
          { id: 'no', label: '不召，令现任宰执协力', kw: ['不召', '协力'], by: { wen: '"宰执和衷，则不必更张。"' }, eff: { 'g.council': -2 }, report: '诏宰执同心辅政。', rumor: '', mainlineSet: 'rejected' },
        ],
      },
      official: { delay: 2, from: '邸报', form: '邸报', text: '王安石复同中书门下平章事。' },
    },
    choice: { prompt: '召王安石复相？', history: '召之。' },
  },
  {
    id: 'M21', date: { y: 1075, m: 5 }, precision: 'season', kind: 'fixed', scope: '两浙（吴越）',
    title: '吴越大旱', confidence: '二手', source: [SRC.wuyue],
    fact: '熙宁八年夏，吴越大旱；知越州赵抃救灾，曾巩作《越州赵公救灾记》。',
    deliver: {
      court: { delay: 1, from: '两浙路转运司', form: '奏状', text: '本路自夏不雨，田苗焦槁，越州尤甚。乞截留上供米赈粜，并许州县募民修城以食饥者。' },
      official: { delay: 0, from: '州衙', form: '公文', text: '本州夏旱，诸县具灾伤分数申州，毋得隐漏。' },
      commoner: {
        title: '西乡的塘见底了', region: { 西乡: { 近况: '大旱，塘水见底' } }, delay: 0, from: '佃户', form: '口信', text: '西乡的塘都见底了，秧子黄了一半。佃户来问今年的租怎么算。',
        approaches: [
          { id: 'cut', label: '请母亲跟伯父说，今年减租', kw: ['减租', '减', '宽'], by: { mother: '"灾年不减租，佃户要跑的。"' }, eff: { 'g.tenants': 12, uncle: 5 }, report: '伯父答应按灾伤减租。', rumor: '' },
          { id: 'keep', label: '不插手', kw: ['不管', '不插手'], by: { uncle: '"减了租，周家吃什么？"' }, eff: { 'g.tenants': -12 }, report: '租照收。', rumor: '有两户佃户夜里走了。' },
        ],
      },
    },
    weather: { region: '两浙', kind: '旱', severity: 3 },
  },
  // ———— 熙宁九年 ————
  {
    id: 'M22', date: { y: 1076, m: 10 }, precision: 'season', kind: 'court', scope: '京师',
    title: '王安石再罢相', confidence: '二手', source: [SRC.bamian],
    fact: '熙宁九年，王安石之子王雱病卒，王安石再罢相，退居江宁（十月、十一月两说，只信到季）。',
    deliver: {
      court: {
        delay: 0, from: '王安石', form: '表', text: '臣衰病相仍，子雱又亡，精力不复堪任机务。伏望陛下矜察，许解重任，归老江宁。',
        approaches: [
          { id: 'let', label: '准其所请，罢相判江宁府', kw: ['准', '许', '放'], by: { wen: '"大臣求去至再，宜从其请。"' }, eff: { 'g.censors': 5, admin: -2 }, report: '王安石罢相，判江宁府。', rumor: '', mainlineSet: 'followed' },
          { id: 'keep', label: '挽留，不许', kw: ['留', '不许', '挽留'], by: {}, eff: { 'g.council': 2, 'g.censors': -3 }, report: '降诏不允。', rumor: '王安石又上了一道表。', mainlineSet: 'rejected' },
        ],
      },
      official: { delay: 2, from: '邸报', form: '邸报', text: '王安石罢相，判江宁府。' },
      commoner: { title: '王相公又罢了', delay: 4, from: '街坊', form: '传闻', text: '那位王相公又罢了，说是儿子死了，心灰了。' },
    },
    choice: { prompt: '王安石再三求去，留还是放？', history: '放之。' },
  },
];
