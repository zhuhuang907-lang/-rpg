'use strict';
/**
 * 日常与节令：案头不足三份时，用这些补齐。都是具体的人、具体的事，不写"局势紧张"之类空话。
 * month：农历月；xun：0 上旬 / 1 中旬 / 2 下旬（不写＝该月任一旬）。
 */
module.exports = {

  /** 家常池：案头少于两份时随机抽一份（二十回合内不重复）。都是一家一户尺度的事。 */
  commonerPool: [
    { id: 'P_xiuhuo', title: '绣铺来收活', from: '阿桂', form: '口信', text: '城里绣铺的人来了，问三娘子上回那幅枕顶绣完没有，绣完了给二百文。', approaches: [
      { id: 'sell', label: '赶几天工，绣完卖了', kw: ['绣', '赶工', '卖'], by: { agui: '"我帮三娘子分线。"' }, eff: { money: 200, health: -3 }, report: '枕顶交了，绣铺给了二百文。', rumor: '' },
      { id: 'keep', label: '留着自己用，不卖', kw: ['不卖', '留着'], by: {}, eff: {}, report: '', rumor: '' } ] },
    { id: 'P_agui', title: '阿桂家里来人', from: '阿桂', form: '哭着说', text: '阿桂家里捎信来，她娘病了，想请假回去两天，又不敢跟娘子开口。', approaches: [
      { id: 'help', label: '替她跟母亲求情，再给她一百文', kw: ['求情', '给钱', '准假'], by: { mother: '"去吧，早去早回。"' }, eff: { money: -100, mother: 1 }, flags: { aguiLoyal: 1 }, report: '阿桂磕了个头，走了两天，回来时眼睛还是肿的。', rumor: '阿桂说，往后三娘子的事，她死也不往外说。' },
      { id: 'no', label: '让她等过了这阵再说', kw: ['等', '不准'], by: {}, eff: {}, report: '阿桂没再提，夜里在灶间哭。', rumor: '' } ] },
    { id: 'P_jiemi', title: '邻家借米', from: '邻家媳妇', form: '上门', text: '邻家媳妇上门，说男人病着，家里断了米，想借三斗，等开春还。', approaches: [
      { id: 'lend', label: '请母亲借给她', kw: ['借'], by: { mother: '"借吧，远亲不如近邻。"' }, eff: { 'g.neighbors': 8 }, report: '米借出去了。', rumor: '' },
      { id: 'no', label: '推说家里也紧', kw: ['不借', '推'], by: { uncle: '"今年的米都粜了。"' }, eff: { 'g.neighbors': -5 }, report: '邻家媳妇讪讪地走了。', rumor: '' } ] },
    { id: 'P_touteng', title: '母亲头疼', from: '阿桂', form: '口信', text: '你娘这两天头疼得厉害，饭也吃得少，又不肯请大夫，说花钱。', approaches: [
      { id: 'doctor', label: '拿自己的钱请大夫', kw: ['大夫', '请', '看病'], by: { agui: '"巷口的大夫一次要一百文。"' }, eff: { money: -100, mother: 6 }, report: '大夫说是心里有事，开了两帖药。', rumor: '' },
      { id: 'care', label: '自己守着，熬些姜汤', kw: ['守', '姜汤', '照顾'], by: {}, eff: { mother: 3, health: -2 }, report: '你守了两夜，你娘好些了。', rumor: '' } ] },
    { id: 'P_shufang', title: '旧书箱', from: '阿桂', form: '口信', text: '阿桂收拾后楼，翻出你爹的一只旧书箱，里头有几本账簿和一叠旧信。', approaches: [
      { id: 'read', label: '把账簿和信拿来看', kw: ['看', '翻', '账簿', '信'], by: {}, eff: {}, flags: { readFatherBox: 1 }, report: '账簿上记着西乡三十亩的来历："治平元年，买得……契已投印。"信里有一封是你爹写给你伯父的，没寄出去。', rumor: '' },
      { id: 'leave', label: '原样收好', kw: ['收好', '不看'], by: {}, eff: {}, report: '', rumor: '' } ] },
    { id: 'P_huoban', title: '伙伴约你做针线', from: '邻家小娘子', form: '上门', text: '隔壁的小娘子来约你一起做针线，说城里新兴了一种花样。', approaches: [
      { id: 'go', label: '一起做', kw: ['做', '一起'], by: {}, eff: { 'g.neighbors': 4, repute: 1 }, report: '你们在廊下坐了一下午。她说起城里的闲话：吕家米铺今年收了好几家的田。', rumor: '' },
      { id: 'no', label: '推了', kw: ['推'], by: {}, eff: {}, report: '', rumor: '' } ] },
  ],
  courtPool: [
    { id: 'Q_zongshi', title: '宗室请俸', from: '大宗正司', form: '奏状', text: '宗室日繁，近属俸给岁增；有疏属以贫乏，乞增给。', approaches: [
      { id: 'give', label: '量增', kw: ['增', '给'], by: {}, eff: { treasury: -3, prestige: 1 }, report: '诏量增疏属贫乏者俸给。', rumor: '' },
      { id: 'limit', label: '令有司议宗室恩数，渐加裁损', kw: ['裁', '议', '减'], by: { sima: '"宗室繁多，国用所以不足。"', wang: '"宗室恩数，当以亲疏为差。"' }, eff: { treasury: 2, 'g.council': -1 }, report: '诏有司详定宗室恩数。', rumor: '宗室中颇有怨言。' } ] },
    { id: 'Q_difang', title: '地方修堤', from: '某路转运司', form: '奏状', text: '部内一段河堤年久卑薄，乞拨役兵、物料修筑，限来春毕工。', approaches: [
      { id: 'yes', label: '准，限期毕工', kw: ['准', '修'], by: { wen: '"堤防不可缓。"' }, eff: { treasury: -2, people: 1 }, report: '诏依所请。', rumor: '' },
      { id: 'later', label: '令转运司自筹', kw: ['自筹', '缓'], by: {}, eff: {}, report: '诏转运司于本路钱物内支给。', rumor: '转运司抱怨无钱可支。' } ] },
    { id: 'Q_shuoyu', title: '刑部奏疑狱', from: '刑部', form: '奏状', text: '有州县奏一疑狱，罪有可疑，法当上请，乞圣裁。', approaches: [
      { id: 'lenient', label: '从轻', kw: ['从轻', '宽'], by: { sima: '"罪疑惟轻。"' }, eff: { people: 1, prestige: 1 }, report: '诏从轻断。', rumor: '' },
      { id: 'law', label: '依法', kw: ['依法'], by: { wang: '"法者，天下之公。"' }, eff: { admin: 1 }, report: '诏依法断。', rumor: '' } ] },
  ],
  commoner: [
    {
      id: 'D_hanyi', month: 10, xun: 0, title: '十月朝上坟', from: '母亲', form: '吩咐',
      text: '十月初一，你娘说要备些纸钱、果子，去给你爹上坟。伯父说西乡事忙，让你们娘儿俩自己去。',
      approaches: [
        { id: 'go', label: '陪母亲去', kw: ['去', '陪', '上坟'], by: { mother: '"你爹最疼你，你去，他高兴。"' }, eff: { mother: 4, money: -50 }, report: '坟上的草长高了，你娘蹲在坟前拔了很久。', rumor: '回来的路上，你娘说了一句："你伯父这两年，连坟都不来了。"' },
        { id: 'stay', label: '推说身子不爽，不去', kw: ['不去', '身子'], by: {}, eff: { mother: -3 }, report: '你娘自己带着阿桂去了。', rumor: '' },
      ],
    },
    {
      id: 'D_dongzhi', month: 11, title: '冬至祭祖', from: '母亲', form: '吩咐',
      text: '冬至快到了，家里要祭祖。你娘让你去帮着备供品，又说今年的钱紧，供品比往年要少两样。',
      approaches: [
        { id: 'help', label: '帮着备办，拿出自己的钱添一样', kw: ['添', '帮', '拿钱'], by: { agui: '"三娘子添一样，娘子脸上也好看。"' }, eff: { money: -150, mother: 5 }, report: '供桌上多了一盘时果。伯父看见了，没说话。', rumor: '' },
        { id: 'just', label: '照母亲说的办', kw: ['照办', '照', '办'], by: {}, eff: {}, report: '祭礼办完了，比往年冷清些。', rumor: '' },
      ],
    },
    {
      id: 'D_nianzhong', month: 12, xun: 2, title: '年终的账', from: '阿桂', form: '口信',
      text: '腊月底了，阿桂说管家在前厅跟伯父对账，西乡佃户也来送年礼。你娘让你去帮着收年礼、记个数。',
      approaches: [
        { id: 'record', label: '去记账，顺便看看伯父的账本', kw: ['记账', '看账', '账本'], by: { agui: '"账本就摊在前厅桌上。"' }, eff: { uncle: 5 }, flags: { sawLedger: 1 }, report: '你看见账上记着"西乡租米，粜与吕铺"，数目被伯父用袖子挡住了。', rumor: '' },
        { id: 'skip', label: '只收年礼，不看账', kw: ['只收', '不看'], by: {}, eff: { 'g.tenants': 2 }, report: '佃户们送来鸡和米，你一一记下，回了些点心。', rumor: '' },
      ],
    },
    {
      id: 'D_shangyuan', month: 1, xun: 1, title: '上元看灯', from: '阿桂', form: '口信',
      text: '正月十五，城里放灯。阿桂央你跟娘子说说，晚上去街上看一回灯。',
      approaches: [
        { id: 'go', label: '求母亲准了，带阿桂去看灯', kw: ['看灯', '去', '求'], by: { mother: '"去吧，早些回来，别往人多的地方挤。"' }, eff: { repute: -1, health: 2 }, report: '街上人挤人。你在一处灯棚下，远远看见了严七娘，她正跟一个穿青袍的男人说话。', rumor: '' },
        { id: 'stay', label: '不去', kw: ['不去'], by: {}, eff: {}, report: '你在院子里听着远处的鼓声。', rumor: '' },
      ],
    },
    {
      id: 'D_chungeng', month: 2, title: '佃户借种', from: '佃户', form: '上门',
      text: '开春了，西乡两户佃户来借稻种，说去年交了租，家里的种子不够。伯父不在，他们来求你娘。',
      approaches: [
        { id: 'lend', label: '请母亲借给他们，秋后还', kw: ['借', '借给'], by: { mother: '"借吧，你爹在时也是这么办的。"' }, eff: { 'g.tenants': 8, uncle: 3 }, report: '佃户千恩万谢地走了。', rumor: '伯父回来听说了，嫌你娘多事。' },
        { id: 'wait', label: '说等伯父回来再定', kw: ['等', '伯父'], by: {}, eff: { 'g.tenants': -3 }, report: '佃户们等了两天，伯父才回来，只借了一半。', rumor: '' },
      ],
    },
    {
      id: 'D_qingming', month: 3, title: '清明', from: '母亲', form: '吩咐',
      text: '清明要上坟，你娘说今年想把你爹坟前的石供桌修一修，要两贯钱，伯父说没钱。',
      approaches: [
        { id: 'pay', label: '拿出自己的钱补一些', kw: ['补', '拿钱', '出钱'], by: { mother: '"你的钱留着吧……"' }, eff: { money: -500, mother: 8 }, report: '石供桌修好了。', rumor: '' },
        { id: 'no', label: '劝母亲明年再修', kw: ['明年', '不修'], by: {}, eff: {}, report: '你娘叹了口气。', rumor: '' },
      ],
    },
    {
      id: 'D_duanwu', month: 5, xun: 0, title: '端午', from: '阿桂', form: '口信',
      text: '端午到了，阿桂在门上插了艾，又问你要不要编几个长命缕送人。',
      approaches: [
        { id: 'make', label: '编几个，送给母亲和邻家孩子', kw: ['编', '送'], by: {}, eff: { 'g.neighbors': 3, mother: 2 }, report: '邻家的孩子戴着你编的长命缕在巷子里跑。', rumor: '' },
        { id: 'skip', label: '不编了', kw: ['不'], by: {}, eff: {}, report: '', rumor: '' },
      ],
    },
    {
      id: 'D_zhongqiu', month: 8, xun: 1, title: '中秋', from: '母亲', form: '吩咐',
      text: '中秋夜，你娘在院里摆了几样果子，伯父难得在家，三个人坐在月下，谁也没先开口。',
      approaches: [
        { id: 'talk', label: '先开口，跟伯父说几句家常', kw: ['开口', '家常', '说话'], by: {}, eff: { uncle: -5 }, report: '伯父说起你爹小时候的事，说着说着，叹了口气。', rumor: '' },
        { id: 'quiet', label: '不说话', kw: ['不说'], by: {}, eff: {}, report: '月亮升到中天，你娘先回屋了。', rumor: '' },
      ],
    },
  ],
  court: [
    {
      id: 'C_yuanri', month: 1, title: '元日大朝会', from: '礼院', form: '札子',
      text: '元日大朝会，诸国使人与诸路贺表并至，礼院请定仪注。',
      approaches: [
        { id: 'plain', label: '依常制，务从简省', kw: ['简', '省', '常制'], by: { sima: '"礼贵得中，不在华侈。"' }, eff: { treasury: 1, prestige: 1 }, report: '朝会如仪。', rumor: '' },
        { id: 'grand', label: '盛陈仪卫，以示新政气象', kw: ['盛', '隆重', '气象'], by: { wang: '"朝廷气象，所以示天下。"' }, eff: { treasury: -2, prestige: 3 }, report: '朝会极盛。', rumor: '三司说又多出一笔开支。' },
      ],
    },
    {
      id: 'C_jingyan', month: 2, title: '经筵', from: '迩英阁', form: '讲读',
      text: '迩英阁讲读，今日讲《尚书》。讲官请陛下发问。',
      approaches: [
        { id: 'ask', label: '问：三代之治，今日可复否？', kw: ['三代', '问'], by: { wang: '"陛下当以尧舜为法。"', sima: '"祖宗之法，不可轻改。"' }, eff: { prestige: 1 }, flags: { askedSandai: 1 }, report: '讲官各有对答。', rumor: '' },
        { id: 'listen', label: '只听不问', kw: ['只听', '不问'], by: {}, eff: {}, report: '讲读毕。', rumor: '' },
      ],
    },
  ],
};
