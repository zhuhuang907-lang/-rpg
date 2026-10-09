'use strict';
/**
 * 身份：宋神宗赵顼（皇帝 · 京师 · 熙宁元年秋起，一回合＝一季）
 * 史实人物只写已核的职任；年岁按虚岁。未核实职任的人（如曾公亮）不放进可召对的名单。
 */

module.exports = {
  id: 'shenzong',
  name: '赵顼',
  idm: 'emperor',
  deliverClass: 'court',
  title: '皇帝（宋神宗）',
  age: 21,
  origin: '生于濮安懿王宫邸（庆历八年四月）',
  place: '东京开封府 · 禁中',
  region: '京师',
  start: { y: 1068, m: 9, leap: false, d: 1 },
  unit: 'season',
  executorDefault: '中书',
  executors: ['中书', '枢密院', '三司', '翰林学士院', '内侍省'],

  stats: [
    { key: 'treasury', label: '国用', value: 35, scale: ['匮乏', '拮据', '勉强', '宽裕'], why: '治平以来入不敷出（二手），只用词不给数' },
    { key: 'neizang', label: '内藏', value: 55, scale: ['空虚', '有限', '尚可', '充盈'] },
    { key: 'people', label: '民心', value: 55, scale: ['怨', '不安', '平常', '安'] },
    { key: 'admin', label: '吏治', value: 45, scale: ['败坏', '因循', '尚可', '整肃'] },
    { key: 'prestige', label: '威望', value: 40, scale: ['轻', '未立', '渐立', '重'] },
    { key: 'border', label: '边备', value: 45, scale: ['废弛', '空虚', '尚可', '严整'] },
  ],
  groups: [
    { key: 'council', label: '两府宰执', value: 60 },
    { key: 'censors', label: '台谏', value: 55 },
    { key: 'elders', label: '外任元老', value: 60 },
    { key: 'army', label: '禁军', value: 55 },
    { key: 'hebei', label: '河北灾民', value: 30 },
    { key: 'merchants', label: '坊郭商贾', value: 55 },
  ],
  regions: [
    { name: '河北', cols: { 光景: '今岁灾伤', 近况: '流移渐多；韩琦判相州' } },
    { name: '陕西', cols: { 光景: '去冬种谔取绥州，赐名绥德城', 近况: '西夏新主年幼，母族专权' } },
    { name: '两浙', cols: { 光景: '东南财赋所出', 近况: '上供如常' } },
    { name: '开封府', cols: { 光景: '京师', 近况: '冬至将行南郊大礼' } },
  ],

  people: [
    {
      id: 'wang', name: '王安石', age: 48, origin: '抚州临川', role: '翰林学士', present: true, historical: true,
      stance: '理财为先，变法度', temper: '言辞峻切，不肯迁就',
      sample: '"善理财者，民不加赋而国用足。"', want: '得君行道，主持财计',
      betray: '不会背弃官家；但谁挡新法，他会请求罢谁',
    },
    {
      id: 'sima', name: '司马光', age: 50, origin: '陕州夏县', role: '翰林学士', present: true, historical: true,
      stance: '节用守成，反对聚敛', temper: '恳切，好引祖宗故事',
      sample: '"救灾节用，宜自贵近始。"', want: '朝廷宽民力，罢开边',
      betray: '道不合则求去，不结党相攻',
    },
    {
      id: 'wen', name: '文彦博', age: 63, origin: '汾州介休', role: '枢密使', present: true, historical: true,
      stance: '持重，重边备与祖宗法度', temper: '老成，话说得圆',
      sample: '"事有缓急，不可轻动。"', want: '朝局安稳，枢府之权不被侵夺',
      betray: '不轻易表态，事急时站在多数一边',
    },
    {
      id: 'neishi', name: '冯安' /* 虚构人物 */, age: 46, origin: '开封', role: '内侍', present: true,
      stance: '只替官家传话', temper: '低声，谨慎', sample: '"官家，五更了。"',
      want: '平安当差', betray: '不会；但外臣塞给他的话，他会原样递上来',
    },
  ],

  opening: [
    {
      status: { date: 'short', name: false, time: '五更' }, meet: ['neishi'],
      text: `漏壶里的水一滴一滴落着，隔着帐子听得很清楚。

殿里的炭盆已经熄了大半，凉意从地砖上升起来。你醒了一阵，没有动。昨夜看的那几份奏状，还在脑子里打转，字句一时想不全。

帐外有人跪下的声音，很轻。

"官家，五更了。"

是冯安。`,
      actions: [
        { label: '起身', bridge: '你掀开帐子。冯安捧着衣服候在一旁，几个小黄门端着铜盆进来。' },
        { label: '问：昨夜有急递吗？', bridge: '"有，"冯安低声说，"河北来的，已经送到前头了。"' },
        { label: '再躺片刻', bridge: '你闭着眼又听了一会儿漏声。冯安没有再催，过了一阵，你自己坐了起来。' },
      ],
    },
    {
      status: { date: 'full', name: true }, meet: ['wang', 'sima'],
      text: `盥洗时，冯安在一旁低声报今天的事：早上两府奏事；午后去迩英阁听讲读，翰林学士王安石、司马光都在班上。

"河北转运司昨夜又有急递，"他说，"说是灾伤的州县，流民往南走的越来越多。"

他停了停，又补了一句："冬至的南郊大礼，礼院在问赏赐的数目，三司说今年的钱不够。"

铜盆里的水已经凉了。窗外的天还是黑的。`,
      actions: [
        { label: '先去前殿，听两府奏事', bridge: '你换好衣服，往前殿去。' },
        { label: '问冯安：三司说差多少？', bridge: '冯安摇头："奴婢不知道数目。三司使说要当面奏。"' },
        { label: '先把河北的急递拿来看', bridge: '冯安把急递取了来。你一边走一边看。' },
      ],
    },
    {
      status: { date: 'full', name: true, place: '前殿' }, meet: ['wen'],
      text: `前殿里点着灯。宰执们分班站着，枢密使文彦博站在右边前列。

最上面那份是河北转运司的奏状，封皮已经拆开，压在镇纸下面：

"河朔今岁灾伤，州县仓廪不继，流移之民渐多。乞朝廷拨赐钱粮，宽减今岁秋税，并择重臣镇抚。"

底下还压着三司的一份，说今年国用不足，南郊赏赐恐怕难以如数支给。

文彦博出班，躬身道："河北之事，臣等请圣裁。"

殿里没人说话，都在等你开口。`,
    },
  ],

  events: [
    {
      id: 'K01', type: '史事', title: '河朔灾伤', from: '河北路转运司', form: '奏状',
      when: s => s.turn === 1, deadline: 1, mainline: 'M03',
      text: '河朔今岁灾伤，州县仓廪不继，流移之民渐多。乞朝廷拨赐钱粮，宽减今岁秋税，并择重臣镇抚。',
      approaches: [
        {
          id: 'neizang', label: '出内藏钱帛赈济河北', kw: ['内藏', '赈济', '拨钱', '钱帛', '赈'],
          by: { sima: '"内藏之财，本为水旱非常之备。今河朔流民塞道，此正当用之时。"' },
          eff: { neizang: -15, people: 6, 'g.hebei': 20, prestige: 4 },
          report: '中书回奏：内藏钱帛已发往河北，诸州依次赈给。', region: { 河北: { 近况: '内藏钱帛已发，诸州赈给' } },
          rumor: '有人说，钱到了州里，先被扣去一成作"脚钱"。',
        },
        {
          id: 'tax', label: '宽减灾伤州县今岁秋税', kw: ['减税', '宽减', '秋税', '蠲'],
          by: { sima: '"宽一分税，民受一分之赐。"', wen: '"宽税可也，但上供之额须另筹。"' },
          eff: { treasury: -8, people: 5, 'g.hebei': 12 },
          report: '三司奏：已依旨放免灾伤州县秋税若干分。', region: { 河北: { 近况: '灾伤州县秋税已放免' } },
          rumor: '转运司私下抱怨：税免了，上供的数目却没人敢减。',
        },
        {
          id: 'minister', label: '择重臣镇抚河北', kw: ['重臣', '镇抚', '韩琦', '派人'],
          by: { wen: '"河北重地，非元老不能镇。韩琦三朝旧臣，现判相州，可移镇大名。"' },
          eff: { 'g.elders': 8, admin: 3, 'g.hebei': 6 }, flags: { hanqiDaming: 1 },
          report: '诏韩琦移判大名府。', region: { 河北: { 近况: '韩琦移判大名府镇抚' } },
          rumor: '',
        },
        {
          id: 'licai', label: '令州县劝诱富户出粟，官府量给酬奖', kw: ['富户', '劝分', '出粟', '劝诱'],
          by: { wang: '"天下之财，不患不足，患在无术以通之。令富室出粟，官为之偿以名秩，不费公帑而民得食。"' },
          eff: { 'g.hebei': 8, 'g.merchants': -5, admin: -2 },
          report: '诏河北州县劝诱富民出粟赈济，以数之多寡给与酬奖。', region: { 河北: { 近况: '劝诱富民出粟' } },
          rumor: '有州县催逼富户，富户把粮藏了起来。',
        },
      ],
      ignore: { eff: { 'g.hebei': -15, people: -6, prestige: -4 }, report: '河北的奏状留中未下。', region: { 河北: { 近况: '奏状留中，流民南下' } } },
      gm: '河朔灾伤与韩琦移镇大名有依据（M03，二手）；赈济办法为可行选项，史书具体措施未逐条核对。',
    },
    {
      id: 'K02', type: '史事', title: '南郊赐赉', from: '中书', form: '札子', mainline: 'M04',
      when: s => s.turn === 2, deadline: 0,
      text: '今岁河朔灾伤，国用不足。臣等乞今冬南郊大礼，两府臣僚所当赐金帛，一切辞免，以佐经费。伏候圣旨。',
      approaches: [
        {
          id: 'allow', label: '准两府所请，免赐金帛', kw: ['准', '免赐', '依所请', '准奏'],
          by: { sima: '"救灾节用，宜自贵近始，可听也。"' },
          eff: { treasury: 4, 'g.council': -3, people: 2 },
          report: '诏可。两府南郊赐赉并免。',
          rumor: '有近臣私下说：这点钱省下来，济得什么事。',
        },
        {
          id: 'deny', label: '不允，照常赏赐（史事）', kw: ['不允', '照常', '照赐', '不准'],
          by: { wang: '"国用所以不足，以未得善理财之人耳。善理财者，民不加赋而国用足。区区赐赉，不足以裕国，徒伤大体。"' },
          eff: { treasury: -3, 'g.council': 4 }, flags: { trustWang: 1 },
          report: '诏不允。王安石草诏，引常衮故事，两府遂不敢复辞。',
          rumor: '司马光退朝时，脸色很沉。',
        },
        {
          id: 'debate', label: '召王安石、司马光当面辩论', kw: ['辩', '两人', '召对', '当面'],
          by: { wen: '"二人各有所见，可令面陈。"' },
          eff: { prestige: 2 }, flags: { heardDebate: 1, trustWang: 1 },
          report: '迩英阁上，二人争论良久。司马光说："天下安有此理？天地所生财货百物，不在民则在官。"王安石不退让。',
          rumor: '',
        },
      ],
      ignore: { eff: { 'g.council': -2 }, report: '札子留中。礼院照旧例准备赏赐。' },
      gm: '此议在熙宁元年（二手：中新网引《宋史·司马光传》），月份不详，只说"今冬"。',
    },
    {
      id: 'K03', type: '人事', title: '王安石请条陈', from: '翰林学士王安石', form: '迩英阁留对',
      when: s => s.turn === 1, deadline: 2,
      text: '讲读毕，王安石独自留下，说：陛下前日问为治所先，臣对以择术。愿得闲暇，条陈本朝所以致太平、所以积弊之由，以备采择。',
      approaches: [
        {
          id: 'yes', label: '准他条陈，随时进呈', kw: ['准', '条陈', '写来', '进呈'],
          by: { wang: '"臣当竭愚以对。"' },
          eff: { 'g.council': -2 }, flags: { trustWang: 1, wangPlan: 1 },
          report: '王安石退下。',
          rumor: '有人说，翰林学士院里，王安石连夜在写东西。',
        },
        {
          id: 'later', label: '说此事从长计议', kw: ['从长', '缓', '再说', '以后'],
          by: { wen: '"新君初政，宜先安静。"' },
          eff: {}, report: '王安石躬身退下。', rumor: '',
        },
      ],
      ignore: { eff: {}, report: '王安石退下。' },
      gm: '王安石熙宁元年四月入对、对以"择术为先"（二手）。此卡为后续条例司等决策的铺垫，不对应某一具体奏章。',
    },
    {
      id: 'K04', type: '回响', title: '绥德城的粮草', from: '陕西路转运司', form: '奏状',
      when: s => s.turn === 3, deadline: 1,
      text: '绥德城新复，戍兵日增，粮草皆自内郡转输，道远费重。乞或增兵屯田，或量减戍守，伏候朝旨。',
      approaches: [
        {
          id: 'hold', label: '坚守绥德，增兵屯田', kw: ['守', '屯田', '增兵'],
          by: { wen: '"绥州既取，弃之示弱。可令边臣屯田自给。"' },
          eff: { border: 5, treasury: -5, 'g.army': 3 },
          report: '诏陕西边臣于绥德城募兵屯田。', rumor: '', region: { 陕西: { 近况: '绥德城募兵屯田' } },
        },
        {
          id: 'cut', label: '减戍守，省转输', kw: ['减', '省', '弃', '撤'],
          by: { sima: '"取绥州本非良策。转输之费，皆出关中之民。"' },
          eff: { border: -5, treasury: 3, people: 2 },
          report: '诏绥德城量减戍兵。', rumor: '边将上书说兵少难守。', region: { 陕西: { 近况: '绥德城减戍' } },
        },
      ],
      ignore: { eff: { treasury: -3 }, report: '奏状下枢密院，久无回音。' },
      gm: '种谔取绥州、赐名绥德城有依据（M00b，二手）；转输之费的奏状为本局设定，未对应具体史文。',
    },
    {
      id: 'K05', type: '人事', title: '三司请对', from: '三司使', form: '请对',
      when: s => s.turn === 2, deadline: 1,
      text: '三司使请对，奏：今岁所入，除上供、军费、俸禄之外，所余无几；南郊大礼之费，尚须另筹。',
      approaches: [
        {
          id: 'save', label: '令三司裁减冗费，条具以闻', kw: ['裁减', '冗费', '节省', '条具'],
          by: { sima: '"国用不足，在于用度太奢、赏赐不节、宗室繁多、官职冗滥、军旅不精。"' },
          eff: { treasury: 5, 'g.council': -2, admin: 2 },
          report: '三司回奏：已条具可减之费若干项。',
          rumor: '各司都说自己那一项减不得。',
        },
        {
          id: 'person', label: '另择善理财之人', kw: ['理财', '择人', '换人'],
          by: { wang: '"今所以未治者，以未得善理财之人耳。"' },
          eff: { 'g.council': -3 }, flags: { trustWang: 1, wantLicai: 1 },
          report: '诏中书举可任财计之臣。', rumor: '',
        },
      ],
      ignore: { eff: { treasury: -3 }, report: '三司使退下。' },
      gm: '三司使姓名未查实，正文只称"三司使"。司马光所列"用度太奢……军旅不精"为其屡言之意，原文出处未逐字核对，不当作引文。',
    },
  ],

  groupEvents: [
    {
      id: 'GE1', type: '人群', title: '河北流民入京东', from: '京东路转运司', form: '奏状', group: 'hebei', below: 20,
      text: '河北流民渡河而南，入京东诸州者日以千计，州县乞朝廷处分。',
      approaches: [
        { id: 'settle', label: '令京东州县安置，给田种', kw: ['安置', '给田', '收留'], by: { sima: '"流民亦吾民也。"' }, eff: { treasury: -5, 'g.hebei': 15, people: 3 }, report: '诏京东州县安置流民。', rumor: '' },
        { id: 'return', label: '劝谕还乡，沿路给口粮', kw: ['还乡', '口粮', '遣回'], by: { wen: '"流民聚则生变，宜遣归。"' }, eff: { treasury: -3, 'g.hebei': 5 }, report: '诏给口粮，劝谕还乡。', rumor: '有流民说，家里的屋已经塌了，回去也是饿死。' },
      ],
      ignore: { eff: { people: -8, 'g.hebei': -5 }, report: '奏状留中。' },
    },
    {
      id: 'GE2', type: '人群', title: '台谏论列', from: '御史台', form: '弹章', group: 'censors', below: 30,
      text: '御史连章论列，说朝廷近来所行多不合祖宗法度，请罢主事之臣。',
      approaches: [
        { id: 'accept', label: '降诏嘉纳，暂缓其事', kw: ['嘉纳', '暂缓', '缓'], by: { sima: '"台谏，天子耳目，不可塞也。"' }, eff: { 'g.censors': 15, prestige: -2 }, report: '诏答台谏。', rumor: '' },
        { id: 'reject', label: '黜责言者', kw: ['黜', '贬', '罢言者'], by: { wang: '"异论相搅，则治道不成。"' }, eff: { 'g.censors': -10, prestige: 3, 'g.council': 3 }, report: '御史出外。', rumor: '朝中人人噤声。' },
      ],
      ignore: { eff: { 'g.censors': -5 }, report: '弹章留中。' },
    },
  ],

  smallTalk: {
    wang: ['"陛下当以尧舜为法。"'],
    sima: ['"祖宗之法，不可轻改。"'],
    wen: ['"此事臣不敢专，当与两府同议。"'],
    neishi: ['"奴婢只管传话。"'],
  },
  presence: () => ({}),
};
