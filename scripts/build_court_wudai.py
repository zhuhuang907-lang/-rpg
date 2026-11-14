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
# ---------- 后唐（大国样板，唐制）：中枢大官照资治通鉴逐句核过才收（scripts/houtang_verify.py），大官位子不补虚构人 ----------
import sys as _sys
_sys.path.insert(0, str(ROOT / 'scripts'))
from houtang_verify import verify as _ht_verify
TZ = '新唐书·百官志（后唐沿唐制）'
HOUTANG = {
  'name': '后唐', 'grade': '厚', 'gradeWhy': '旧五代史、新五代史、资治通鉴、五代会要都有详细记载，中枢任免可逐年排出',
  'model': '唐制',
  'seats': [
    {'id': 'ht-xz', 'dept': '中书门下', 'office': '同中书门下平章事（宰相）', 'rank': '', 'quota': 4, 'from': 923, 'to': 936, 'src': TZ + '；资治通鉴·卷272（以豆卢革、卢程并同平章事）', 'noFill': True},
    {'id': 'ht-smz', 'dept': '枢密院', 'office': '枢密使', 'rank': '', 'quota': 2, 'from': 923, 'to': 936, 'src': '资治通鉴·卷272（郭崇韬、张居翰为枢密使）', 'noFill': True},
    {'id': 'ht-zy', 'dept': '租庸司', 'office': '租庸使', 'rank': '', 'quota': 1, 'from': 923, 'to': 926, 'src': '资治通鉴·卷272—273（张宪、孔谦为租庸使）', 'noFill': True},
    {'id': 'ht-ss', 'dept': '三司', 'office': '三司使', 'rank': '', 'quota': 1, 'from': 930, 'to': 936, 'src': '资治通鉴·卷277（张延朗充三司使）、卷278（孙岳为三司使）', 'noFill': True},
    {'id': 'ht-yd', 'dept': '御史台', 'office': '御史大夫', 'rank': '', 'quota': 1, 'from': 923, 'to': 936, 'src': TZ + '；资治通鉴·卷275（御史大夫李琪）', 'noFill': True},
    {'id': 'ht-zc', 'dept': '御史台', 'office': '御史中丞', 'rank': '', 'quota': 1, 'from': 923, 'to': 936, 'src': '资治通鉴·卷272（以李德休为御史中丞）', 'noFill': True},
    {'id': 'ht-jcys', 'dept': '御史台', 'office': '监察御史', 'rank': '', 'quota': 4, 'from': 923, 'to': 936, 'src': TZ},
    {'id': 'ht-hl', 'dept': '翰林院', 'office': '翰林学士', 'rank': '', 'quota': 4, 'from': 923, 'to': 936, 'src': '资治通鉴·卷272（卢质、冯道为翰林学士）'},
    {'id': 'ht-zssr', 'dept': '中书门下', 'office': '中书舍人', 'rank': '', 'quota': 4, 'from': 923, 'to': 936, 'src': TZ},
    {'id': 'ht-jsz', 'dept': '中书门下', 'office': '给事中', 'rank': '', 'quota': 4, 'from': 923, 'to': 936, 'src': TZ},
    {'id': 'ht-jydf', 'dept': '中书门下', 'office': '谏议大夫', 'rank': '', 'quota': 2, 'from': 923, 'to': 936, 'src': TZ},
    {'id': 'ht-shiwei', 'dept': '侍卫亲军', 'office': '侍卫亲军马步军都指挥使', 'rank': '', 'quota': 1, 'from': 923, 'to': 936, 'src': '资治通鉴·卷277（侍卫都指挥使安从进）', 'noFill': True},
  ],
  'recruit': [
    {'from': '起家旧部', 'share': 0.35, 'families': ['安', '康', '石', '药', '朱', '冯', '李'], 'native': ['代北', '太原', '应州'], 'src': '按本表明载人物出身统计：安重诲、康义诚、石敬瑭、药彦稠、朱弘昭、冯赟等出河东、代北军中（资治通鉴卷272—280）'},
    {'from': '当地大族', 'share': 0.3, 'families': ['卢', '崔', '郑', '韦', '豆卢', '李'], 'native': ['范阳', '博陵', '荥阳', '京兆'], 'src': '按本表明载人物统计：豆卢革、卢程、卢质、卢文纪、崔协、郑珏等唐朝旧族入相（资治通鉴卷272—280）'},
    {'from': '文士', 'share': 0.2, 'families': ['冯', '赵', '刘', '马', '李'], 'native': ['瀛州', '幽州', '涿州'], 'src': '按本表明载人物统计：冯道、赵凤、刘昫、马胤孙等以学士入相（资治通鉴卷272—280）'},
    {'from': '降将', 'share': 0.15, 'families': ['孔', '张', '段', '袁'], 'native': ['汴州', '洛阳'], 'src': '按本表明载人物统计：孔谦、孔循、张延朗等原仕梁（资治通鉴卷272—277）'},
  ],
}
_ht = _ht_verify()
# 同一位子某年超员额：把较早那位「推定」的离任年收到新人上任前一年
_quota = {q['id']: q['quota'] for q in HOUTANG['seats']}
for _ in range(3):
    for d in sorted(_ht, key=lambda d: d['from']):
        for y in range(d['from'], d['to'] + 1):
            on = [e for e in _ht if e['seat'] == d['seat'] and e['from'] <= y <= e['to']]
            if len(on) > _quota[d['seat']]:
                old = sorted([e for e in on if e['endHow'] == '推定' and e['from'] < y], key=lambda e: e['from'])
                for e in old[:len(on) - _quota[d['seat']]]: e['to'] = max(e['from'], y - 1)
_hp = {}
for d in _ht:
    seat = next(q for q in HOUTANG['seats'] if q['id'] == d['seat'])
    d['to'] = min(d['to'], seat['to']); d['from'] = max(d['from'], seat['from'])
    _hp.setdefault(d['name'], []).append({'polity': '后唐', 'seat': d['seat'], 'office': seat['office'].replace('（宰相）', ''), 'from': d['from'], 'to': d['to'],
        'how': '明载' if d['how'] == '明载' and d['endHow'] == '明载' else '推定',
        'src': '资治通鉴·' + d['vol'] + '「' + d['quote'][:40] + '」' + ('' if d['endHow'] == '明载' else '；离任年照下一任或任期惯例推')})
PEOPLE += [{'name': n, 'tier': 1, 'clan': '', 'native': '', 'born': None, 'died': None, 'posts': ps, 'ties': [], 'fate': '', 'src': '资治通鉴'} for n, ps in _hp.items()]
out = {'range': [907, 979], 'source': '每条位子、人物都注出处；人分两档（明载、推定），没留名的位子由游戏照 recruit 补（任务七）', 'polities': [JINGNAN, HOUTANG], 'people': PEOPLE}
(ROOT / 'web' / 'court').mkdir(exist_ok=True)
json.dump(out, open(ROOT / 'web' / 'court' / 'wudai.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('荆南位子', len(JINGNAN['seats']), '后唐位子', len(HOUTANG['seats']), '人', len(PEOPLE), '其中推定条目', sum(1 for p in PEOPLE for x in p['posts'] if x['how'] == '推定'))
