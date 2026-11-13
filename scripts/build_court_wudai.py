"""五代十国朝廷数据（任务六，R-227）：位子照该国官制搭、人分两档（明载、推定），每条带出处。
第三档（史书没留名的位子）不在这里编人，由游戏照 recruit 补（任务七）。
先做两个样板：荆南（小国，藩镇幕府）、后唐（大国，唐制）——后唐下一步补。"""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
XW = '新五代史·卷69·南平世家'
MUFU = '新唐书·百官志四下（节度使属官：副使、行军司马、判官、掌书记、推官、巡官）'
JINGNAN = {
  'name': '荆南', 'grade': '薄', 'gradeWhy': '正史只有南平世家一篇，十国春秋不在原文库；明载的不过二十来人',
  'model': '藩镇幕府',
  'seats': [
    {'id': 'jn-jds', 'dept': '使府', 'office': '荆南节度使', 'rank': '', 'quota': 1, 'from': 907, 'to': 963, 'src': XW},
    {'id': 'jn-fs', 'dept': '使府', 'office': '节度副使', 'rank': '', 'quota': 1, 'from': 907, 'to': 963, 'src': MUFU + '；' + XW + '（保融为节度副使）'},
    {'id': 'jn-xjsm', 'dept': '使府', 'office': '行军司马', 'rank': '', 'quota': 1, 'from': 907, 'to': 963, 'src': MUFU + '；' + XW + '（从诲为行军司马）'},
    {'id': 'jn-pg', 'dept': '使府', 'office': '节度判官', 'rank': '', 'quota': 1, 'from': 907, 'to': 963, 'src': MUFU + '；' + XW + '（判官孙光宪）'},
    {'id': 'jn-zsj', 'dept': '使府', 'office': '掌书记', 'rank': '', 'quota': 1, 'from': 907, 'to': 963, 'src': MUFU},
    {'id': 'jn-tg', 'dept': '使府', 'office': '推官', 'rank': '', 'quota': 1, 'from': 907, 'to': 963, 'src': MUFU},
    {'id': 'jn-xg', 'dept': '使府', 'office': '巡官', 'rank': '', 'quota': 1, 'from': 907, 'to': 963, 'src': MUFU},
    {'id': 'jn-mbzh', 'dept': '牙军', 'office': '马步军都指挥使', 'rank': '', 'quota': 1, 'from': 907, 'to': 963, 'src': XW + '（从诲为马步军都指挥使）'},
    {'id': 'jn-zhs', 'dept': '牙军', 'office': '指挥使', 'rank': '', 'quota': 4, 'from': 907, 'to': 963, 'src': XW + '（指挥使魏璘；梁以兵五千为牙兵）'},
    {'id': 'jn-dyy', 'dept': '牙军', 'office': '都押衙', 'rank': '', 'quota': 1, 'from': 907, 'to': 963, 'src': MUFU + '；' + XW + '（押衙刘知谦）'},
    {'id': 'jn-yy', 'dept': '牙军', 'office': '押衙', 'rank': '', 'quota': 3, 'from': 907, 'to': 963, 'src': XW + '（押衙刘知谦）'},
    {'id': 'jn-kj', 'dept': '使府', 'office': '客将', 'rank': '', 'quota': 2, 'from': 907, 'to': 963, 'src': XW + '（客将刘扶）'},
    {'id': 'jn-jiang', 'dept': '牙军', 'office': '将', 'rank': '', 'quota': 4, 'from': 907, 'to': 963, 'src': XW + '（倪可福、鲍唐为将帅；将李端、梁延嗣；大将李景威）'},
    {'id': 'jn-gz', 'dept': '属州', 'office': '归州刺史', 'rank': '', 'quota': 1, 'from': 927, 'to': 963, 'src': XW + '（以荆、归、峡三州臣于吴）'},
    {'id': 'jn-xz', 'dept': '属州', 'office': '峡州刺史', 'rank': '', 'quota': 1, 'from': 927, 'to': 963, 'src': XW + '（保融兼峡州刺史）'},
  ],
  'recruit': [
    {'from': '宗室', 'share': 0.3, 'families': ['高'], 'native': ['陕州硖石'], 'src': XW + '（季兴、从诲、保融、保勗、继冲、从义、保绅相继执政掌兵）'},
    {'from': '起家旧部', 'share': 0.3, 'families': ['倪', '鲍', '李', '魏'], 'native': ['汴州', '江陵'], 'src': XW + '（梁以兵五千为牙兵；倪可福、鲍唐为将帅）'},
    {'from': '文士', 'share': 0.2, 'families': ['梁', '孙', '王', '司空'], 'native': ['蜀', '江陵'], 'src': XW + '（人士归之，梁震、司空薰、王保义等为宾客；判官孙光宪）'},
    {'from': '当地大族', 'share': 0.2, 'families': ['刘', '梁', '李'], 'native': ['江陵', '峡州', '归州'], 'src': XW + '（季兴招缉绥抚，人士归之；客将刘扶、押衙刘知谦、将梁延嗣）'},
  ],
}
P = lambda name, posts, **k: dict({'name': name, 'tier': 1, 'clan': '', 'native': '', 'born': None, 'died': None, 'posts': posts, 'ties': [], 'fate': '', 'src': XW}, **k)
po = lambda seat, office, a, b, how='明载', src=XW: {'polity': '荆南', 'seat': seat, 'office': office, 'from': a, 'to': b, 'how': how, 'src': src}
PEOPLE = [
  P('高季兴', [po('jn-jds', '荆南节度使', 907, 928)], clan='高', native='陕州硖石', born=858, died=928, fate='天成三年卒，谥武信', ties=[{'name': '高从诲', 'rel': '父', 'src': XW}]),
  P('高从诲', [po('jn-mbzh', '马步军都指挥使', 925, 928, '推定', XW + '（季兴时留为马步军都指挥使、行军司马；年份照季兴归荆南后、卒前推）'), po('jn-xjsm', '行军司马', 925, 928, '推定', XW), po('jn-jds', '荆南节度使', 928, 948)], tier=1, clan='高', native='陕州硖石', born=891, died=948, fate='干祐元年卒，谥文献'),
  P('高保融', [po('jn-fs', '节度副使', 940, 948, '推定', XW + '（从诲时为节度副使兼峡州刺史；起年照年过二十推）'), po('jn-xz', '峡州刺史', 940, 948, '推定', XW), po('jn-jds', '荆南节度使', 948, 960)], clan='高', native='陕州硖石', born=920, died=960, fate='建隆元年以疾卒，谥贞懿'),
  P('高保勗', [po('jn-jds', '荆南节度使', 960, 962)], clan='高', native='陕州硖石', born=924, died=962, fate='建隆三年卒，赠侍中'),
  P('高继冲', [po('jn-jds', '荆南节度使', 962, 963)], clan='高', native='陕州硖石', fate='纳土归宋，拜武宁军节度使'),
  P('倪可福', [po('jn-jiang', '将', 907, 928, '推定', XW + '（季兴始至，以倪可福、鲍唐为将帅；止年照季兴卒推）')], clan='倪'),
  P('鲍唐', [po('jn-jiang', '将', 907, 928, '推定', XW + '（同上）')], clan='鲍'),
  P('刘知谦', [po('jn-yy', '押衙', 929, 929)], clan='刘', fate='奉表归唐'),
  P('李端', [po('jn-jiang', '将', 942, 942)], clan='李'),
  P('魏璘', [po('jn-zhs', '指挥使', 956, 956)], clan='魏'),
  P('刘扶', [po('jn-kj', '客将', 956, 956)], clan='刘'),
  P('梁延嗣', [po('jn-jiang', '将', 962, 962)], clan='梁'),
  P('李景威', [po('jn-jiang', '将', 963, 963)], clan='李', fate='宋师假道，谏不用，扼吭而死'),
  P('孙光宪', [po('jn-zsj', '掌书记', 926, 962, '推定', 'CBDB（926—963 节度使掌书记）；' + XW), po('jn-pg', '节度判官', 963, 963)], clan='孙', native='贵平', fate='归宋，拜黄州刺史'),
]
out = {'range': [907, 979], 'source': '每条位子、人物都注出处；人分两档（明载、推定），没留名的位子由游戏照 recruit 补（任务七）', 'polities': [JINGNAN], 'people': PEOPLE}
(ROOT / 'web' / 'court').mkdir(exist_ok=True)
json.dump(out, open(ROOT / 'web' / 'court' / 'wudai.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('荆南位子', len(JINGNAN['seats']), '人', len(PEOPLE), '其中推定条目', sum(1 for p in PEOPLE for x in p['posts'] if x['how'] == '推定'))
