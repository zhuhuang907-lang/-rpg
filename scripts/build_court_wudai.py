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
# 卒年：哈佛库任职表、内置史料里有的，延长任期不许过卒年（张颢 908 年被杀，通鉴只写「颢」，程序认不出）
_DIED = {}
for _f in list((ROOT / 'web' / 'tenure').glob('*.json')) + list((ROOT / 'web' / 'history').glob('*.json')):
    try:
        for _x in json.load(open(_f, encoding='utf8')).get('figures') or []:
            if _x.get('died') and _x.get('name'): _DIED.setdefault(_x['name'], _x['died'])
    except Exception: pass
def _gapcut(L):
    """不管史书写没写离任年：中间连着五年没提他全名的，任期截到最后一次被提到的次年（追述旧事不算在任）"""
    for d in L:
        seen = sorted(set(d.get('seen') or []))
        if not seen or d.get('endHow') != '明载' or d['to'] - d['from'] <= 6: continue   # 只管「史书写了离任、却隔了很多年」的（多半是追述旧事），别的不动
        y = d['from']
        while y < d['to']:
            if not any(z in seen for z in range(y + 1, y + 6)): d['to'] = y + 1 if y + 1 <= d['to'] else d['to']; d['endHow'] = '推定'; break
            y += 1
def _extend(L, quota, y1):
    """离任年不知道的（推定）：一直在任到接任的人上来、位子满了为止，最多十年，不过该朝亡年（任务六，2026-11-14 改：原来一律算四年，王处回这类长任的被截短）"""
    for d in sorted(L, key=lambda d: d['from']):
        if d.get('endHow') != '推定': continue
        cap = min(y1, d['from'] + 10, _DIED.get(d['name'], 9999), d.get('lastSeen', 9999) + 1)   # 不过通鉴最后一次提到他全名的次年（张颢）
        if d['to'] > cap: d['to'] = max(d['from'], cap)
        seen = set(d.get('seen') or [])
        while d['to'] < cap:
            y = d['to'] + 1
            if seen and not any(z in seen for z in range(y - 2, y + 1)): break   # 连着三年通鉴没提他全名，不再往下推（张颢 908 年被杀，919 年才又被追述）
            on = [e for e in L if e is not d and e['seat'] == d['seat'] and e['from'] <= y <= e['to']]
            if len(on) + 1 > quota.get(d['seat'], 1): break
            if any(e['name'] == d['name'] and e is not d and e['from'] <= y for e in L if e['from'] > d['from']): break   # 这人改任别官了
            d['to'] = y
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
_gapcut(_ht); _extend(_ht, _quota, 936)
_hp = {}
for d in _ht:
    seat = next(q for q in HOUTANG['seats'] if q['id'] == d['seat'])
    d['to'] = min(d['to'], seat['to']); d['from'] = max(d['from'], seat['from'])
    _hp.setdefault(d['name'], []).append({'polity': '后唐', 'seat': d['seat'], 'office': seat['office'].replace('（宰相）', ''), 'from': d['from'], 'to': d['to'],
        'how': '明载' if d['how'] == '明载' and d['endHow'] == '明载' else '推定',
        'src': '资治通鉴·' + d['vol'] + '「' + d['quote'][:40] + '」' + ('' if d['endHow'] == '明载' else '；离任年照下一任或任期惯例推')})
PEOPLE += [{'name': n, 'tier': 1, 'clan': '', 'native': '', 'born': None, 'died': None, 'posts': ps, 'ties': [], 'fate': '', 'src': '资治通鉴'} for n, ps in _hp.items()]
# ---------- 后梁、后晋、后汉、后周：中枢大官照资治通鉴逐句核过才收（scripts/wudai_verify.py）；位子照唐制，大官不补虚构 ----------
from wudai_verify import verify as _wd_verify
_WD = _wd_verify()
def _court(pol, pre, y0, y1, grade, why, recruit, extra=None):
    smz = '崇政院使' if pol == '后梁' else '枢密使'
    ss = '租庸使' if pol == '后梁' else '三司使'
    seats = [
        {'id': pre + '-xz', 'dept': '中书门下', 'office': '同中书门下平章事（宰相）', 'rank': '', 'quota': 4, 'from': y0, 'to': y1, 'src': TZ + '；资治通鉴（' + pol + '纪）', 'noFill': True},
        {'id': pre + '-smz', 'dept': '崇政院' if pol == '后梁' else '枢密院', 'office': smz, 'rank': '', 'quota': 2, 'from': y0, 'to': y1, 'src': '资治通鉴（' + pol + '纪）', 'noFill': True},
        {'id': pre + '-ss', 'dept': '租庸司' if pol == '后梁' else '三司', 'office': ss, 'rank': '', 'quota': 1, 'from': y0, 'to': y1, 'src': '资治通鉴（' + pol + '纪）', 'noFill': True},
        {'id': pre + '-sw', 'dept': '侍卫亲军', 'office': '侍卫亲军马步军都指挥使', 'rank': '', 'quota': 1, 'from': y0, 'to': y1, 'src': '资治通鉴（' + pol + '纪）', 'noFill': True},
        {'id': pre + '-hl', 'dept': '翰林院', 'office': '翰林学士', 'rank': '', 'quota': 4, 'from': y0, 'to': y1, 'src': TZ},
        {'id': pre + '-zssr', 'dept': '中书门下', 'office': '中书舍人', 'rank': '', 'quota': 4, 'from': y0, 'to': y1, 'src': TZ},
        {'id': pre + '-jsz', 'dept': '中书门下', 'office': '给事中', 'rank': '', 'quota': 4, 'from': y0, 'to': y1, 'src': TZ},
        {'id': pre + '-jydf', 'dept': '中书门下', 'office': '谏议大夫', 'rank': '', 'quota': 2, 'from': y0, 'to': y1, 'src': TZ},
        {'id': pre + '-jcys', 'dept': '御史台', 'office': '监察御史', 'rank': '', 'quota': 4, 'from': y0, 'to': y1, 'src': TZ},
    ] + (extra or [])
    P = {'name': pol, 'grade': grade, 'gradeWhy': why, 'model': '唐制', 'seats': seats, 'recruit': recruit}
    L = _WD.get(pol, [])
    quota = {q['id']: q['quota'] for q in seats}
    for _ in range(3):
        for d in sorted(L, key=lambda d: d['from']):
            for y in range(d['from'], d['to'] + 1):
                on = [e for e in L if e['seat'] == d['seat'] and e['from'] <= y <= e['to']]
                if len(on) > quota.get(d['seat'], 1):
                    old = sorted([e for e in on if e['endHow'] == '推定' and e['from'] < y], key=lambda e: e['from'])
                    for e in old[:len(on) - quota.get(d['seat'], 1)]: e['to'] = max(e['from'], y - 1)
    _gapcut(L); _extend(L, quota, y1)
    ppl = {}
    for d in L:
        st = next((q for q in seats if q['id'] == d['seat']), None)
        if not st: continue
        a, b = max(d['from'], st['from']), min(d['to'], st['to'])
        offc = d['key'] if d.get('key') in ('左丞相', '右丞相', '司徒', '仆射', '中书令', '兵部尚书', '兵部侍郎', '礼部侍郎', '大丞相') else st['office'].replace('（宰相）', '')   # 楚、南汉、吴这类不叫同平章事的照原文官名
        ppl.setdefault(d['name'], []).append({'polity': pol, 'seat': d['seat'], 'office': offc, 'from': a, 'to': b,
            'how': '明载' if d['how'] == '明载' and d['endHow'] == '明载' else '推定',
            'src': '资治通鉴·' + d['vol'] + '「' + d['quote'][:40] + '」' + ('' if d['endHow'] == '明载' else '；离任年照下一任或任期惯例推')})
    return P, ppl
_R = lambda frm, share, fam, nat, src: {'from': frm, 'share': share, 'families': fam, 'native': nat, 'src': src}
_X = '按本表明载人物出身统计（资治通鉴）'
_S = [
  _court('后梁', 'hl', 907, 923, '中', '旧五代史梁书、新五代史梁本纪与梁臣传、资治通鉴梁纪；中枢可排，地方薄',
         [_R('起家旧部', 0.4, ['朱', '敬', '李', '葛', '杨'], ['宋州', '汴州'], _X + '：敬翔、李振等出宣武幕府'), _R('当地大族', 0.3, ['张', '杨', '薛', '赵', '郑', '萧'], ['京兆', '河东', '荥阳'], _X + '：张文蔚、杨涉、薛贻矩、赵光逢、郑珏、萧顷为唐旧族入相'),
          _R('文士', 0.2, ['李', '于', '杜'], ['洛阳', '汴州'], _X + '：李琪、于兢、杜晓以文学进'), _R('降将', 0.1, ['王', '刘'], ['魏州', '河中'], _X)]),
  _court('后晋', 'hj', 936, 947, '中', '旧五代史晋书、新五代史晋本纪与晋臣传、资治通鉴晋纪',
         [_R('起家旧部', 0.4, ['石', '刘', '杨', '景', '李'], ['太原', '代北'], _X + '：杨光远、刘处让等出河东军中'), _R('文士', 0.3, ['桑', '和', '赵', '李', '冯'], ['洛阳', '汶阳', '华州'], _X + '：桑维翰、和凝、赵莹、李崧以幕僚学士入相'),
          _R('当地大族', 0.15, ['卢', '崔', '王'], ['范阳', '博陵', '太原'], _X), _R('降将', 0.15, ['杜', '张', '安'], ['河北', '魏州'], _X)]),
  _court('后汉', 'hh', 947, 951, '中', '旧五代史汉书、新五代史汉本纪与汉臣传、资治通鉴汉纪',
         [_R('起家旧部', 0.5, ['刘', '郭', '杨', '史', '王'], ['太原', '邢州', '魏州'], _X + '：杨邠、郭威、王章、史弘肇出河东刘知远幕府军中'), _R('文士', 0.3, ['苏', '李', '窦'], ['长安', '河东'], _X + '：苏逢吉、苏禹珪以河东判官入相'),
          _R('降将', 0.2, ['赵', '张', '高'], ['河北'], _X)]),
  _court('后周', 'hz', 951, 960, '厚', '旧五代史周书、新五代史周本纪与周臣传、资治通鉴周纪；中枢逐年可排',
         [_R('起家旧部', 0.4, ['郭', '王', '郑', '张', '赵', '李'], ['邢州', '太原', '涿州'], _X + '：王峻、郑仁诲、张永德等出郭威幕府军中'), _R('文士', 0.35, ['范', '王', '李', '魏', '景'], ['大名', '太原', '洛阳'], _X + '：范质、王溥、李谷、魏仁浦、景范以学士、枢密院吏入相'),
          _R('降将', 0.15, ['刘', '高', '慕容'], ['河东', '太原'], _X), _R('当地大族', 0.1, ['冯', '窦', '卢'], ['瀛州', '幽州', '范阳'], _X)],
         extra=[{'id': 'hz-dq', 'dept': '殿前司', 'office': '殿前都点检', 'rank': '', 'quota': 1, 'from': 954, 'to': 960, 'src': '资治通鉴·卷293（以张永德为殿前都点检）', 'noFill': True}]),
  _court('北汉', 'bh', 951, 979, '薄', '新五代史东汉世家、资治通鉴后周纪里的北汉事；960 年后通鉴不载，只到 960 前后',
         [_R('宗室', 0.3, ['刘'], ['太原'], _X + '：刘承钧等宗室掌兵'), _R('起家旧部', 0.4, ['张', '郑', '王', '李'], ['太原', '代北'], _X + '：张元徽等河东旧将'), _R('文士', 0.3, ['卫', '郑', '赵'], ['太原', '晋州'], _X + '：郑珙、卫融以学士入相')]),
  _court('南汉', 'nh', 917, 971, '中', '新五代史南汉世家、资治通鉴后梁纪至后周纪里的汉事',
         [_R('宗室', 0.25, ['刘'], ['封州', '广州'], _X), _R('文士', 0.35, ['赵', '杨', '李', '钟'], ['京兆', '广州'], _X + '：赵光裔、杨洞潜、李殷衡等唐衣冠与幕僚入相'), _R('宦官', 0.25, ['龚', '陈', '李'], ['广州'], _X + '：龚澄枢等宦官掌枢要'), _R('当地大族', 0.15, ['陈', '黄', '梁'], ['广州', '韶州'], _X)]),
  _court('楚', 'chu', 907, 951, '中', '新五代史楚世家、资治通鉴后梁纪至后汉纪里的楚事；927 年建楚国始设丞相',
         [_R('起家旧部', 0.45, ['马', '许', '姚', '李'], ['许州', '潭州'], _X + '：许德勋、姚彦章等出马殷旧部'), _R('文士', 0.3, ['拓跋', '廖', '李', '高'], ['潭州', '衡州'], _X + '：拓跋恒等文士'), _R('当地大族', 0.25, ['周', '廖', '彭'], ['潭州', '辰州', '溪州'], _X)]),
  _court('吴', 'wu', 902, 937, '中', '新五代史吴世家、资治通鉴唐纪末至后晋纪里的吴事；919 年建吴国始置百官，以前是淮南使府',
         [_R('起家旧部', 0.45, ['徐', '张', '朱', '王', '李'], ['庐州', '海州', '淮南'], _X + '：张颢、徐温等出杨行密淮南牙军'), _R('文士', 0.3, ['严', '骆', '宋', '王'], ['同州', '洪州', '庐陵'], _X + '：严可求、骆知祥、宋齐丘以幕僚理政'),
          _R('当地大族', 0.25, ['周', '刘', '陶'], ['扬州', '润州', '江州'], _X)]),
  _court('前蜀', 'qs', 907, 925, '中', '新五代史前蜀世家、资治通鉴后梁纪后唐纪里的蜀事；十国春秋不在原文库',
         [_R('起家旧部', 0.4, ['王', '唐', '宋'], ['许州', '舞阳'], _X + '：王宗佶、唐道袭等出王建忠武军旧部（假子多改姓王）'), _R('文士', 0.35, ['韦', '张', '庾', '周', '潘'], ['京兆', '河间', '蜀'], _X + '：韦庄、张格等唐衣冠避乱入蜀为相'),
          _R('当地大族', 0.25, ['杜', '何', '毋'], ['成都', '蜀州'], _X)]),
  _court('后蜀', 'hs', 934, 965, '中', '新五代史后蜀世家、资治通鉴后唐纪至后周纪里的蜀事；十国春秋不在原文库',
         [_R('起家旧部', 0.35, ['赵', '王', '李', '张'], ['太原', '邢州'], _X + '：赵季良、王处回、李廷珪等随孟知祥自河东入蜀'), _R('文士', 0.35, ['毋', '徐', '范', '欧阳'], ['龙门', '成都'], _X + '：毋昭裔、徐光溥、范仁恕以文学入相'),
          _R('当地大族', 0.3, ['杜', '何', '冯'], ['成都', '眉州', '阆州'], _X)]),
]
_extra_pols = [p for p, _ in _S]
for _, ppl in _S:
    for n, ps in ppl.items():
        old = next((p for p in PEOPLE if p['name'] == n), None)
        if old: old['posts'] += ps
        else: PEOPLE.append({'name': n, 'tier': 1, 'clan': '', 'native': '', 'born': None, 'died': None, 'posts': ps, 'ties': [], 'fate': '', 'src': '资治通鉴'})
out = {'range': [907, 979], 'source': '每条位子、人物都注出处；人分两档（明载、推定），没留名的位子由游戏照 recruit 补（任务七）', 'polities': [JINGNAN, HOUTANG] + _extra_pols, 'people': PEOPLE}
(ROOT / 'web' / 'court').mkdir(exist_ok=True)
json.dump(out, open(ROOT / 'web' / 'court' / 'wudai.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('荆南位子', len(JINGNAN['seats']), '后唐位子', len(HOUTANG['seats']), '人', len(PEOPLE), '其中推定条目', sum(1 for p in PEOPLE for x in p['posts'] if x['how'] == '推定'))
