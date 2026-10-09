'use strict';
/**
 * 身份：周三娘（平民 · 杭州钱塘县 · 熙宁元年九月起）
 * 人物与地块均为虚构（CBDB 同名核查待补）；制度依据见 史实核查/。
 * 事件里的 when(s) 决定何时上案头；approaches 是可行的办法，问人时由对应的人提出来。
 */

const has = (s, f) => !!s.flags[f];

module.exports = {
  id: 'zhou',
  name: '周三娘',
  idm: 'commoner',
  deliverClass: 'commoner',
  title: '钱塘县乡居主户人家的在室女',
  age: 17,
  origin: '两浙路杭州钱塘县',
  place: '杭州钱塘县',
  region: '两浙',
  start: { y: 1068, m: 9, leap: false, d: 14 },
  unit: 'xun',
  executorDefault: '自己',
  executors: ['自己', '阿桂', '母亲'],

  stats: [
    { key: 'money', label: '手头的钱', value: 1200, unit: '文', fmt: 'qian', why: '三娘的私房（设定）' },
    { key: 'dowry', label: '奁田', value: 30, unit: '亩', note: '名下未定' },
    { key: 'mother', label: '母亲信任', value: 70, scale: ['冷淡', '平常', '亲近', '倚重'] },
    { key: 'uncle', label: '伯父戒心', value: 35, scale: ['不在意', '留心', '提防', '敌视'] },
    { key: 'repute', label: '名声', value: 60, scale: ['狼藉', '有闲话', '平常', '好'] },
    { key: 'health', label: '身体', value: 85, scale: ['病重', '虚弱', '平常', '康健'] },
  ],
  groups: [
    { key: 'tenants', label: '西乡佃户', value: 55 },
    { key: 'neighbors', label: '邻里', value: 60 },
    { key: 'yamen', label: '里正与差役', value: 50 },
  ],
  regions: [
    { name: '周家', cols: { 光景: '伯父主事，母亲管内宅', 近况: '伯父忙着收租粜米' } },
    { name: '西乡', cols: { 光景: '水田二顷三十亩，佃户九家', 近况: '秋收已毕' } },
    { name: '城中', cols: { 光景: '米行收新米', 近况: '米价往下走（严七娘说的）' } },
    { name: '县里', cols: { 光景: '排明年的差役', 近况: '里正来过周家' } },
  ],

  people: [
    {
      id: 'mother', name: '何氏', age: 41, origin: '钱塘县', role: '母亲', present: true,
      stance: '护着女儿，但不敢跟伯父硬顶', temper: '话少，心里有数，凡事先想名声',
      sample: '"这种事，不能让外人看出来。"', want: '给三娘说一门稳妥的亲事，奁田一亩不能少',
      betray: '不会出卖三娘；但若三娘私会外人的话传开，她会先顾全家的名声',
    },
    {
      id: 'agui', name: '阿桂', age: 14, origin: '钱塘县', role: '婢女', present: true,
      stance: '向着三娘', temper: '嘴快，腿勤，胆小',
      sample: '"三娘子，后门那边……我替你看着？"', want: '不挨骂，将来跟着三娘陪嫁过去',
      betray: '被伯父当面逼问时会说出一半',
    },
    {
      id: 'uncle', name: '周承祐', age: 52, origin: '钱塘县', role: '伯父 · 家中主事', present: false,
      stance: '保住周家门户，躲开衙前', temper: '精明，爱算账，对妇人家说话只说一半',
      sample: '"家里的事，有我。"', want: '现钱，以及把户等压下去',
      betray: '为了家门，会牺牲三娘的奁田',
    },
    {
      id: 'yan', name: '严七娘', age: 43, origin: '越州山阴县人，嫁到杭州', role: '牙人（说合婢女、绣活、典卖）', present: true,
      stance: '谁给钱替谁说话', temper: '嘴甜，眼尖，话里留三分',
      sample: '"三娘子是明白人，我就不绕弯了。"', want: '牙钱，以及在吕家米铺长期走动',
      betray: '三娘要告诉母亲时，她会抢先去伯父那里说三娘私托她联络外头的男人',
    },
    {
      id: 'qiao', name: '乔礼', age: 29, origin: '湖州乌程县', role: '城中吕家米铺的干人', present: false,
      stance: '替东家办事', temper: '客气，周到，从不把话说死',
      sample: '"小人只是替人跑腿，三娘子拿主意。"', want: '把那张旧契弄到手',
      betray: '事情败露就把一切推给严七娘',
    },
  ],

  opening: [
    {
      status: { date: 'short', name: false, time: '清晨' }, meet: ['agui'],
      text: `先是冷。被子滑下去半截，一只脚露在外头，脚背冰凉。

后院有人在扫地，竹扫帚一下一下刮着砖缝，扫得很慢。远处有鸡叫了两声，又不叫了。

你睁开眼。青布帐子洗得发白，帐钩上挂着一只旧香囊，早就没有香味了。窗纸透进一层灰白的光，天还没亮透。

灶间那边飘过来烧稻草的烟味，混着米汤的香。

门外有人轻轻叩了两下。

"三娘，醒了没有？粥熬好了。"

是阿桂。`,
      actions: [
        { label: '应一声，起身', bridge: '你应了一声，摸到床脚的鞋。阿桂在门外说："娘已经在堂屋坐下了。"' },
        { label: '翻个身，再躺一会儿', bridge: '你把被子拉上来，又闭了一会儿眼。门外的脚步声走远了，过了一阵又回来："三娘，娘在等你吃粥呢。"你只好起来。' },
        { label: '问阿桂是什么时辰了', bridge: '"卯时过了一刻，"阿桂隔着门说，"娘已经坐下了。"' },
      ],
    },
    {
      status: { date: 'full', name: true }, meet: ['mother'],
      text: `堂屋里只摆了两副碗筷。

你娘坐在下首，面前的粥已经不冒热气了，她没动。见你进来，她把咸菜碟子往你这边推了推。

"你伯父天不亮就去西乡了，"她说，"说今年的租米要赶在月底以前粜掉，晚了价钱还要跌。"

她停了一下，又补了一句："里正前几天来过一回，跟你伯父在前厅说了半天话。我问，他也不说是什么事。"

阿桂端着一碗热粥过来，换掉你娘面前那碗凉的，回身的时候在你耳边飞快地说了一句：

"后门上严七娘来过了，说是找三娘子的，我叫她在偏厢等着。"

你娘没听见，正低头拿筷子拨碗里的米粒。`,
      actions: [
        { label: '问母亲：里正来说了什么？', bridge: '你娘摇摇头："你伯父的脾气你知道，外头的事，他不跟我们说。"她把碗端起来，又放下，"吃吧。"' },
        { label: '不动声色，吃完粥去偏厢', bridge: '你低头把粥喝完，跟你娘说要去后院看看晒的绣线。' },
        { label: '让阿桂去回严七娘，说改日再来', bridge: '阿桂去了一趟，很快又回来，小声说："她不肯走，说就几句话，说完就走。"你只好去偏厢。' },
      ],
    },
    {
      status: { date: 'full', name: true, place: '周家后院偏厢' }, meet: ['yan'],
      text: `偏厢的门半掩着。檐下几盆菊开乱了，重阳过后就没人顾得上剪。

严七娘已经坐在里头了，见你进来，起身让了半步，又坐下。她先夸了菊，又夸你袖口的针线，然后才从袖子里摸出一张折了三折的短札，推到桌子当中。推出去，又缩回半寸，手指压着一角没松。她指甲缝里嵌着一道黑线。

"乔礼托我捎的，"她压低了声音，"他不便进周家的门。"

短札没有署名，也没有封泥，折痕是新的。底下还压着一页契纸抄件，写的是西乡三十亩水田。你娘一直说，这块地是你爹留给你的奁田。卖主一栏画了押，押字的样子像你爹的。纸角写着治平三年的日子，可通篇找不到一处官印的朱红。

严七娘不看那张纸，只看着你："今年西乡收成好，城里的米一斗六十来文，还在往下走。你伯父手里的租米卖不上价，里正又来过了，衙前的差事眼看要派到周家头上。他急着用现钱，你也知道。乔礼的意思是，这事还没投印，现在还来得及留条路。"

她把手从短札上收回来，理了理袖口。

"你娘要是问起来，就说我是来问绣活的。"

"三娘子，我就在这儿等你一句话。"`,
    },
  ],

  events: [
    {
      id: 'E01', type: '人事', title: '偏厢的短札', from: '严七娘', form: '当面口说，附短札与契纸抄件',
      when: s => s.turn === 1, deadline: 0,
      text: '严七娘还坐在偏厢里等你回话。短札没有署名；契纸抄件写的是西乡那三十亩奁田，押字像你爹的，日子是治平三年，没有官印。她说乔礼想"留条路"，又叮嘱你娘若问起，就说她是来问绣活的。',
      approaches: [
        {
          id: 'yes', label: '应下来，答应见乔礼', kw: ['答应', '应下', '去见', '见乔礼', '赴约', '好'],
          by: { yan: '"三娘子肯见一面，事情就好办了。他那边我去说，日子地方都由他定，你只管来。"' },
          eff: { repute: -3, 'g.neighbors': -2 }, flags: { agreedQiao: 1 }, then: [['E02', 1]],
          report: '严七娘笑着走了，临出门说："过两日我再来传话。"',
          rumor: '后门的老苍头跟阿桂嘀咕：这个月严七娘已经来了两趟。',
        },
        {
          id: 'no', label: '回绝她，请她以后别来', kw: ['回绝', '拒绝', '不见', '不去', '别来', '请她走'],
          by: { mother: '"这种人，沾上就甩不掉。叫她走，以后后门不许放她进来。"' },
          eff: { 'g.neighbors': 0 }, flags: { refusedYan: 1 }, then: [['E06', 2]],
          report: '严七娘脸上的笑停了一下，又挂回去："三娘子不急，想通了再说。"她把短札收回袖子里，那页抄件却忘了拿。',
          rumor: '阿桂说，严七娘出了后门没走远，往西乡的方向去了。',
        },
        {
          id: 'tellMother', label: '把抄件拿给母亲看', kw: ['母亲', '告诉娘', '给娘看', '拿给娘', '何氏', '跟娘说'],
          by: { agui: '"要不……给娘子看看？娘子那里收着老爷的旧契呢。"' },
          eff: { mother: 10, uncle: 5 }, flags: { motherKnows: 1 }, then: [['E07', 1], ['E06', 1]],
          report: '你娘把抄件凑到窗下看了很久，一句话没说，把它压进了妆奁最底下。',
          rumor: '阿桂说，严七娘走的时候脸色很难看。',
        },
        {
          id: 'delay', label: '收下抄件，说要想几天', kw: ['想想', '再想', '拖', '过几天', '收下', '留下'],
          by: { yan: '"不急，不急。只是过了这个月，就怕来不及了。"' },
          eff: {}, flags: { keptCopy: 1 }, then: [['E02', 1]],
          report: '严七娘说过两日再来，起身走了。抄件留在了你手里。',
          rumor: '',
        },
        {
          id: 'press', label: '追问她：押字是谁画的？为什么没有官印？', kw: ['押', '印', '官印', '白契', '谁画', '追问', '质问', '假'],
          by: { agui: '"三娘子，那押字……老爷画押最后一笔是往上挑的，我给老爷磨过墨。"' },
          eff: {}, flags: { pressedYan: 1, suspectForgery: 1 }, then: [['E02', 1]],
          report: '严七娘的手在袖子里顿了一下："我一个跑腿的，哪懂这些。三娘子要问，问乔礼去。"她说话时没看你。',
          rumor: '你注意到她指甲缝里那道黑线是墨。',
        },
      ],
      ignore: { eff: {}, then: [['E02', 1]], report: '你没给准话。严七娘坐了一阵，自己走了。' },
      gm: '真相见剧本 GM 笔记：伯父借吕家之手典卖奁田；契是倒填日期的白契；吕家缺的是何氏手里的原契。',
    },
    {
      id: 'E02', type: '回响', title: '乔礼约见', from: '严七娘', form: '口信',
      when: s => false, deadline: 1,
      text: '严七娘又从后门来了，说乔礼想当面讲清楚："二十日午后，城里吕家米铺后门。三娘子只要带着你爹那张旧契去给他看一眼，不必交出来。"',
      approaches: [
        {
          id: 'goWithDeed', label: '带上旧契去见', kw: ['带契', '带上旧契', '带着契', '拿契去'],
          by: { yan: '"看一眼又不少块肉。他对过四至，心里有底，才好替你说话。"' },
          eff: { repute: -8, mother: -10 }, flags: { deedGiven: 1 }, then: [['E05', 2]],
          report: '乔礼客客气气，说要"借去对一对四至"，明天就还。旧契留在了吕家。',
          rumor: '有邻家媳妇看见你从吕家米铺的后巷出来。',
        },
        {
          id: 'goEmpty', label: '去见，但不带契', kw: ['不带', '空手', '先去看看', '只去见'],
          by: { agui: '"三娘子要去，我跟着。契留在家里，娘子那边我守着。"' },
          eff: { repute: -5 }, flags: { metQiao: 1 }, then: [['E10', 1]],
          report: '乔礼见你空着手来，脸上没什么，话却说得很客气，只说"三娘子再想想"。临别他提了一句：东家姓吕。',
          rumor: '有人看见你从吕家米铺的后巷出来。',
        },
        {
          id: 'refuse', label: '不去', kw: ['不去', '回绝', '不见'],
          by: { mother: '"一个没出阁的女儿家，去米铺后门见男人？想都别想。"' },
          eff: {}, flags: { refusedQiao: 1 }, then: [['E06', 1]],
          report: '严七娘听了，叹口气走了。',
          rumor: '',
        },
      ],
      ignore: { eff: {}, then: [['E06', 1]], report: '约好的日子过去了，你没去。' },
    },
    {
      id: 'E03', type: '回响', title: '里正又来了', from: '阿桂', form: '口信',
      when: s => s.turn === 2, deadline: 1,
      text: '阿桂跑来说：里正孙茂又来了，伯父不在，他说要见"家里能说话的人"。娘子让你也到屏风后头听着。里正说县里在排明年的差役，周家田多，怕是要充衙前；又说了一句"田产若有变动，要趁早到县里报"。',
      approaches: [
        {
          id: 'listen', label: '在屏风后听完，什么也不说', kw: ['听', '不说', '屏风'],
          by: { mother: '"你在后头听着就好，别出声。"' },
          eff: { mother: 3 }, flags: { heardLizheng: 1 },
          report: '里正走后，你娘坐了很久，说："衙前……你爹在的时候，就怕这个。"',
          rumor: '阿桂听门房说，里正前几天在吕家米铺吃过酒。',
        },
        {
          id: 'ask', label: '让母亲问清楚：什么叫"田产变动"？', kw: ['问', '变动', '问清楚', '什么意思'],
          by: { mother: '"我来问。你别出面。"' },
          eff: { mother: 5, 'g.yamen': -5 }, flags: { askedChange: 1 },
          report: '里正打了个哈哈："就是哪家田卖了、典了，户等跟着变嘛。娘子放心，我心里有数。"',
          rumor: '阿桂听门房说，里正前几天在吕家米铺吃过酒。',
        },
      ],
      ignore: { eff: {}, report: '你没去前厅。里正坐了一盏茶的工夫就走了。' },
      gm: '里正已经收了吕家的钱，要的就是把这三十亩"变动"出去，顺便替周家把户等压下来，两头讨好。衙前由上等乡户承担、重难常致破产，有依据（史实核查第7条）；"借典卖压低户等"是本局设定。',
    },
    {
      id: 'E04', type: '人群', title: '伯父的脸色', from: '伯父周承祐', form: '饭桌上',
      when: s => s.turn >= 3 && (s.stats.uncle >= 60 || has(s, 'metQiao') || has(s, 'deedGiven')), deadline: 0,
      text: '伯父从西乡回来了。晚饭时他当着你娘的面，慢慢地问：这些天有没有外人来过后门？',
      approaches: [
        {
          id: 'truth', label: '照实说：严七娘来过，带了一张契纸', kw: ['照实', '实话', '说了', '严七娘', '契纸'],
          by: { mother: '"实话实说吧，躲不过的。"' },
          eff: { uncle: 15, mother: 5 }, flags: { confronted: 1 }, then: [['E11', 1]],
          report: '伯父听完，筷子停了半天，只说："女儿家，不要管这些。"那天夜里，前厅的灯亮到很晚。',
          rumor: '阿桂说，第二天一早伯父就出门进城了。',
        },
        {
          id: 'lie', label: '说没有，严七娘是来问绣活的', kw: ['没有', '绣活', '撒谎', '瞒'],
          by: { yan: '"你娘要是问起来，就说我是来问绣活的。"' },
          eff: { uncle: 5 }, flags: { liedUncle: 1 },
          report: '伯父"嗯"了一声，没再问。',
          rumor: '阿桂说，伯父私下里把后门的老苍头叫去问了话。',
        },
      ],
      ignore: { eff: { uncle: 10 }, report: '你低头吃饭，没答。伯父看了你很久。' },
    },
    {
      id: 'E05', type: '回响', title: '西乡那块地换主了', from: '邻家媳妇', form: '传闻',
      when: s => false, deadline: 2,
      text: '邻家媳妇来借针线，顺口说："听说你家西乡那三十亩换主了，县里都印过了。是吕家米铺买的吧？"',
      approaches: [
        {
          id: 'sue', label: '请母亲出面，到县里递状', kw: ['县里', '递状', '告', '打官司', '诉'],
          by: { mother: '"要告，就得有原契和你爹的遗言为凭。原契……原契已经不在我手里了。"' },
          eff: { money: -500, repute: -5 }, flags: { lawsuit: 1 },
          report: '状子递进去了。书手收了五百文的笔墨钱，说要等县里"勘会"。', region: { 县里: { 近况: '周家的状子等着勘会' } },
          rumor: '有人说吕家在县衙里有熟人。',
        },
        {
          id: 'uncle', label: '去找伯父当面对质', kw: ['伯父', '对质', '质问'],
          by: { agui: '"三娘子，伯父那脾气……要不要先跟娘子商量？"' },
          eff: { uncle: 20 }, flags: { confronted: 1 }, then: [['E11', 1]],
          report: '伯父沉着脸说："那地本就是周家的田，不是你的。你爹没留下分书。"',
          rumor: '',
        },
      ],
      ignore: { eff: { dowry: -30 }, report: '这件事再没人提起。三十亩奁田就这样没了。', region: { 西乡: { 近况: '三十亩奁田已归吕家' } } },
      onFire: s => { s.statNotes = s.statNotes || {}; s.statNotes.dowry = '已被典卖（待追回）'; },
    },
    {
      id: 'E06', type: '回响', title: '严七娘先去找了伯父', from: '阿桂', form: '口信',
      when: s => false, deadline: 1,
      text: '阿桂慌慌张张跑来：严七娘在前厅跟伯父说话，说"三娘子私下托我捎信给外头的人"。伯父的脸色很难看。',
      approaches: [
        {
          id: 'face', label: '马上去前厅，当面说清楚', kw: ['去前厅', '当面', '说清楚', '对质'],
          by: { mother: '"我陪你去。有我在，她不敢乱说。"' },
          eff: { repute: -3, uncle: 10, mother: 5 }, flags: { exposedYan: 1 },
          report: '你把那页抄件摊在桌上。严七娘看见它，话就说不下去了。伯父挥手叫她走，自己却没看你。',
          rumor: '邻里有人在传：周家三娘子跟牙婆有来往。',
        },
        {
          id: 'hide', label: '躲着不出面', kw: ['躲', '不出面', '不去'],
          by: { agui: '"三娘子别去，娘子会替你说话的。"' },
          eff: { repute: -8, uncle: 15, mother: -5 },
          report: '严七娘走后，伯父让人传话：三娘这一个月不许出后院。',
          rumor: '邻里有人在传：周家三娘子私下跟外头的男人有来往。',
        },
      ],
      ignore: { eff: { repute: -8, uncle: 15 }, report: '伯父让人传话：三娘这一个月不许出后院。' },
    },
    {
      id: 'E07', type: '回响', title: '母亲翻出了旧契', from: '母亲', form: '夜里，在内房',
      when: s => false, deadline: 1,
      text: '夜里你娘把你叫进内房，从妆奁底层取出一个油纸包。里头是一张契，盖着县里的朱红官印，是你爹当年买西乡那三十亩时的赤契。"这张东西，"她说，"谁来要都不能给。"',
      approaches: [
        {
          id: 'keep', label: '请母亲收好，谁也不说', kw: ['收好', '藏', '不说', '保管'],
          by: { mother: '"我收着。你伯父问起，就说找不到了。"' },
          eff: { mother: 5 }, flags: { deedSafe: 1 },
          report: '油纸包回到了妆奁最底下。',
          rumor: '',
        },
        {
          id: 'copy', label: '照着赤契抄一份，和那页抄件对一对', kw: ['对', '比', '抄', '比对'],
          by: { agui: '"我去拿灯和纸来。"' },
          eff: {}, flags: { compared: 1, suspectForgery: 1 },
          report: '两张一对：赤契上你爹的押，最后一笔往上挑；抄件上那个押，最后一笔是平的。',
          rumor: '',
        },
      ],
      ignore: { eff: {}, flags: { deedSafe: 1 }, report: '你娘把油纸包收了回去。' },
    },
    {
      id: 'E08', type: '人事', title: '月底粜米', from: '伯父周承祐', form: '饭桌上的话',
      when: s => s.turn === 2, deadline: 1,
      text: '伯父托人从西乡捎话回来：今年的租米收了，城里米行压价，他打算月底前先粜掉一半，留一半等开春。家里的日用钱，这个月要省着些。',
      approaches: [
        {
          id: 'askAccount', label: '请母亲去问伯父：粜了多少，得钱多少', kw: ['账', '问伯父', '多少钱', '粜了多少'],
          by: { mother: '"这种事，我一个妇道人家去问，他只会说我多心。"' },
          eff: { uncle: 5, mother: 2 }, flags: { askedAccount: 1 },
          report: '伯父回话说："粜了一半，钱都在我这里，要用就说。"他没说卖了多少石，也没说价。',
          rumor: '阿桂听米行的伙计说，周家的米是卖给吕家米铺的。',
        },
        {
          id: 'save', label: '把自己的月钱省下来', kw: ['省', '节省', '月钱'],
          by: { agui: '"三娘子不用省，我少买两回丝线就是了。"' },
          eff: { money: 100 },
          report: '这一旬你没添置什么，手头多攒下一百文。',
          rumor: '',
        },
      ],
      ignore: { eff: {}, report: '你没过问。' },
    },
    {
      id: 'E09', type: '人事', title: '母亲提起说亲', from: '母亲', form: '做针线时',
      when: s => s.turn === 4, deadline: 2,
      text: '你娘一边理线一边说：城东杜家托人来问过，杜家二郎今年十九，在城里从师读书。"人家问起奁田，我说有三十亩。"她看了你一眼，"这三十亩，可不能出岔子。"',
      approaches: [
        {
          id: 'agree', label: '说凭母亲做主', kw: ['做主', '听娘的', '好', '答应'],
          by: { mother: '"你肯就好。只是这事，得先把地的事理清楚。"' },
          eff: { mother: 5 }, flags: { marriageTalk: 1 }, then: [['E12', 3]],
          report: '你娘松了口气，说过了年再请媒人上门。',
          rumor: '',
        },
        {
          id: 'tell', label: '把奁田的事全告诉母亲', kw: ['告诉', '奁田', '地的事', '全说'],
          by: { agui: '"娘子迟早要知道的。"' },
          eff: { mother: 8 }, flags: { motherKnows: 1, marriageTalk: 1 }, then: [['E07', 1]],
          report: '你娘听完，手里的线绕成了一团。',
          rumor: '',
        },
        {
          id: 'refuse', label: '说还不想嫁', kw: ['不想', '不嫁', '再等'],
          by: {},
          eff: { mother: -5 },
          report: '你娘没说话，过了一阵才说："由不得你一直不想。"',
          rumor: '',
        },
      ],
      ignore: { eff: {}, report: '你没接话，你娘也没再提。' },
    },
    {
      id: 'E10', type: '回响', title: '吕家米铺的东家', from: '阿桂', form: '口信',
      when: s => false, deadline: 2,
      text: '阿桂从城里回来，说她去米行打听了：吕家米铺的东家叫吕德昌，仁和县人，今年收了不少乡下的田；里正孙茂常去他铺子里吃酒。',
      approaches: [
        {
          id: 'tellMother', label: '把打听到的告诉母亲', kw: ['告诉', '母亲', '娘'],
          by: { agui: '"娘子知道了，就有人替三娘子拿主意了。"' },
          eff: { mother: 6 }, flags: { motherKnows: 1, knowsLu: 1 }, then: [['E07', 1]],
          report: '你娘听到"里正"两个字，脸就白了。',
          rumor: '',
        },
        {
          id: 'keep', label: '先记在心里', kw: ['记住', '不说', '先不'],
          by: {},
          eff: {}, flags: { knowsLu: 1 },
          report: '你把这几个名字记下了。',
          rumor: '',
        },
      ],
      ignore: { eff: {}, flags: { knowsLu: 1 }, report: '你记下了这几个名字。' },
    },
    {
      id: 'E11', type: '回响', title: '伯父开口了', from: '伯父周承祐', form: '前厅',
      when: s => false, deadline: 1,
      text: '伯父把你和你娘叫到前厅，关上门："衙前一派下来，押送官物，赔起来是要倾家的。你爹在时就怕这个。那三十亩，我是想先典出去，等风头过了再赎回来。你们一闹，事情就难办了。"',
      approaches: [
        {
          id: 'deal', label: '提条件：典可以，但要立字据写明将来赎回、仍归三娘', kw: ['字据', '赎回', '条件', '写明', '立'],
          by: { mother: '"要典也行，你立个字据，写明赎回来仍是三娘的奁田。"' },
          eff: { uncle: -10, mother: 5 }, flags: { deal: 1 },
          report: '伯父沉吟半晌，说："字据可以立，但得等过了年。"', region: { 周家: { 近况: '伯父答应过了年立字据' } },
          rumor: '阿桂说，伯父出门前把算盘拨了好久。',
        },
        {
          id: 'refuse', label: '不行，那是父亲留给我的', kw: ['不行', '不答应', '父亲留', '我的'],
          by: {},
          eff: { uncle: 15 }, flags: { openConflict: 1 },
          report: '伯父拂袖出了前厅。',
          rumor: '',
        },
      ],
      ignore: { eff: { uncle: 5 }, report: '你没说话。伯父说："那就这么定了。"' },
    },
    {
      id: 'E12', type: '人事', title: '杜家派媒人来了', from: '母亲', form: '口信',
      when: s => false, deadline: 2,
      text: '杜家托的媒人上门了，坐在堂屋里喝茶，说话间问了两回：西乡那三十亩，是不是在三娘子名下？',
      approaches: [
        {
          id: 'honest', label: '让母亲照实说：地还有些纠葛', kw: ['照实', '实说', '纠葛'],
          by: { mother: '"照实说吧，瞒着嫁过去，往后更难。"' },
          eff: { mother: 3, repute: 2 },
          report: '媒人笑着说"不妨事"，茶却没喝完就走了。',
          rumor: '',
        },
        {
          id: 'hide', label: '让母亲说：在，一亩不少', kw: ['在', '不少', '瞒', '说有'],
          by: { mother: '"……也只能先这么说。"' },
          eff: {}, flags: { liedMatchmaker: 1 },
          report: '媒人满意地走了。',
          rumor: '',
        },
      ],
      ignore: { eff: {}, report: '媒人坐了一会儿就走了。' },
    },
  ],

  /** 人群过线时的事件（每局各触发一次） */
  groupEvents: [
    {
      id: 'G01', type: '人群', title: '佃户来了', from: '西乡佃户', form: '一同上门', group: 'tenants', below: 30,
      text: '西乡的佃户来了三四个，站在后门口不肯走，说今年的租压得太紧，求东家宽一宽。',
      approaches: [
        { id: 'plead', label: '请母亲去跟伯父说情', kw: ['说情', '宽', '减'], by: { mother: '"我去说。成不成，不敢保。"' }, eff: { 'g.tenants': 15, uncle: 5 }, report: '伯父答应每户的租减一些，脸上很不痛快。', rumor: '' },
        { id: 'ignore', label: '不管', kw: ['不管', '让他们走'], by: {}, eff: { 'g.tenants': -10 }, report: '佃户们站到天黑，走了。', rumor: '有佃户说，明年不租周家的田了。' },
      ],
      ignore: { eff: { 'g.tenants': -10 }, report: '佃户们站到天黑，走了。' },
    },
    {
      id: 'G02', type: '人群', title: '邻里的闲话', from: '阿桂', form: '口信', group: 'neighbors', below: 40,
      text: '阿桂从井边回来，眼圈红红的：邻家的妇人在井台上说你的闲话，说周家三娘子跟牙婆来往，怕是不安分。',
      approaches: [
        { id: 'gift', label: '让母亲给邻家送些节礼，堵堵嘴', kw: ['送礼', '节礼', '堵'], by: { mother: '"送些米面过去，人家嘴就软了。"' }, eff: { money: -200, 'g.neighbors': 12, repute: 5 }, report: '节礼送过去了。', rumor: '' },
        { id: 'ignore', label: '不理会', kw: ['不理', '算了'], by: {}, eff: { repute: -3 }, report: '闲话没停。', rumor: '' },
      ],
      ignore: { eff: { repute: -3 }, report: '闲话没停。' },
    },
  ],

  /** 问人时，案头上没有对应建议的话，用这些家常话（人物的声口） */
  smallTalk: {
    mother: ['"你爹在的时候，家里的事都是他拿主意。"', '"天凉了，夜里把被子盖好。"'],
    agui: ['"三娘子，后门那个老苍头，嘴不严的。"', '"我听灶间的人说，今年米贱。"'],
    uncle: ['"女儿家，管好针线就行。"'],
    yan: ['"三娘子是明白人。"'],
    qiao: ['"小人只是替人跑腿。"'],
  },
  presence: s => ({
    uncle: s.turn >= 3,
    yan: !s.flags.exposedYan && s.turn <= 4,
    qiao: !!(s.flags.metQiao || s.flags.deedGiven),
  }),
};
