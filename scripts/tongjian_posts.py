"""从资治通鉴逐年摘任免（「以甲为某官」「拜甲为某官」），定政权、定人名，写成任职年表（web/tenure/）。
人名照哈佛库（CBDB）人名表、内置史料人名对；对不上的照常见姓氏取末二字（复姓三字）。每条带出处（资治通鉴·卷几）。
用法：python3 -I scripts/tongjian_posts.py <起年> <止年> <cbdb人名表.json> <输出.json>"""
import sys, re, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from tongjian_years import entries
Y0, Y1, NAMES, OUT = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4]
ROOT = pathlib.Path(__file__).resolve().parent.parent
D = json.load(open(NAMES, encoding='utf8'))
for f in (ROOT / 'web' / 'history').glob('*.json'):
    for x in json.load(open(f, encoding='utf8')).get('figures') or []: D.setdefault(x['name'], []).append([x.get('born'), x.get('born'), x.get('died'), None])
SUR1 = set('王李张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段雷钱汤尹黎易常武乔贺赖龚文庞樊兰殷施陶洪翟安颜倪严牛温芦季俞章鲁葛伍韦申尤毕聂丛焦向柳邢路岳齐沿梅莫庄辛管祝左涂谷祁时舒耿牟卜詹关苗凌费纪靳盛童欧甄项曲成游阳裴席卫查屈鲍位覃霍翁隋植甘景薄单包司柏宁柯阮桂闵解强柴华车冉房边辜吉饶刁瞿戚丘古米池滕晋苻姚吕慕乞赫沮秃宇独长尔贺斛高綦封羊荀伏蔺桓郗庾谯卞阴窦隗皇伏')
SUR2 = ('司马', '诸葛', '慕容', '拓跋', '宇文', '独孤', '长孙', '尔朱', '欧阳', '皇甫', '夏侯', '公孙', '令狐', '上官', '沮渠', '秃发', '乞伏', '赫连', '贺拔', '斛律', '尉迟', '万俟', '纥干', '贺若', '段干', '呼延', '胡母', '钟离', '东方', '淳于', '綦毋', '侯莫', '叱罗', '可朱')
OFF = re.compile(r'官|使|尉|令|守|史|丞|卿|侍|郎|尚书|将军|王|公|侯|帅|督|大夫|学士|府|州|牧|尹|参|判|节度|团练|宾客|少师|少傅|少保|太师|太傅|太保|司徒|司空|司马|中书|门下|仆射|录|监|祭酒|校尉|都护|长史|太宰|丞相|相国|大将军')
def near(name, y):
    return any(v and abs(v - y) <= 90 for r in D.get(name, []) for v in r[:3])
DY = {26: '魏', 53: '蜀汉', 42: '吴', 23: '西晋', 27: '东晋', 69: '前赵', 70: '成汉', 87: '代', 51: '前凉', 64: '后赵', 39: '前燕', 65: '前秦', 45: '后秦', 63: '后燕', 76: '西燕', 72: '西秦', 73: '后凉', 74: '南凉', 50: '南燕', 56: '西凉', 62: '北凉', 60: '北燕', 71: '夏', 28: '宋', 32: '南齐', 44: '梁', 24: '陈', 68: '西梁', 37: '西梁', 5: '隋', 6: '唐', 75: '前蜀', 9: '吴', 36: '吴', 11: '吴越', 38: '楚', 12: '闽', 13: '南汉', 55: '荆南', 8: '后蜀', 10: '南唐', 16: '辽', 66: '北汉'}
NORTH_E, NORTH_W, WUDAI = {30, 41, 35}, {40, 31}, {34, 47, 48, 52, 49, 7}
def dy_pol(name, y):
    for r in D.get(name, []):
        dy = r[3] if len(r) > 3 else None
        if dy is None or not any(v and abs(v - y) <= 90 for v in r[:3]): continue
        if dy == 30 or dy in NORTH_E or dy in NORTH_W:
            if y < 535: return '北魏'
            if dy in NORTH_W: return '西魏' if y < 557 else '北周'
            return '东魏' if y < 550 else '北齐'
        if dy == 82: return '西晋' if y < 317 else '东晋'
        if dy in WUDAI: return zheng(y) if y >= 907 else '唐'
        if dy == 47 and y < 923: return '晋'
        if dy in DY: return DY[dy]
    return None
def pick_name(x, y):
    x = re.sub(r'^(?:故|前|其|又|复|并|仍|遂|乃|更|皆)', '', x)
    for L in (4, 3, 2):
        if len(x) >= L and near(x[-L:], y): return x[-L:]
    if len(x) >= 3 and x[-3:-1] in SUR2: return x[-3:]
    if len(x) >= 2 and x[-2] in SUR1 and not OFF.search(x[-2:]): return x[-2:]
    return None
ZHENG = [(184, 220, '汉'), (220, 265, '魏'), (265, 317, '西晋'), (317, 420, '东晋'), (420, 479, '宋'), (479, 502, '南齐'), (502, 557, '梁'), (557, 589, '陈'), (589, 618, '隋'), (618, 907, '唐'), (907, 923, '后梁'), (923, 936, '后唐'), (936, 947, '后晋'), (947, 951, '后汉'), (951, 961, '后周')]
def zheng(y): return next((p for a, b, p in ZHENG if a <= y < b), '')
EXPLICIT = re.compile(r'后秦|西秦|南燕|北燕|后燕|西燕|南凉|北凉|西凉|后凉|东魏|西魏|北齐|北周|北汉|南汉|南唐|吴越|荆南|南平|契丹|秃发|沮渠|河西王|李暠')
def pol_of(clause, y):
    c = clause
    def has(*ks): return any(k in c for k in ks)
    if has('后秦'): return '后秦'
    if has('西秦'): return '西秦'
    if has('南燕'): return '南燕'
    if has('北燕'): return '北燕'
    if has('后燕'): return '后燕'
    if has('西燕'): return '西燕'
    if has('南凉', '秃发'): return '南凉'
    if has('北凉', '沮渠', '河西王'): return '北凉'
    if has('西凉', '李暠', '凉公暠', '李歆'): return '西凉'
    if has('后凉'): return '后凉'
    if has('东魏'): return '东魏'
    if has('西魏'): return '西魏'
    if has('北齐'): return '北齐'
    if has('北周'): return '北周'
    if y >= 951 and has('北汉'): return '北汉'
    if y >= 917 and has('南汉'): return '南汉'
    if y >= 937 and has('南唐'): return '南唐'
    if 907 <= y <= 978 and has('吴越'): return '吴越'
    if 907 <= y <= 963 and has('荆南', '南平'): return '荆南'
    if y >= 907 and has('契丹', '辽主'): return '辽'
    m = re.search(r'(汉|魏|吴|蜀|晋|赵|燕|秦|凉|夏|成|代|宋|齐|梁|陈|周|隋|唐|闽|楚|岐)(?:主|王|帝|人|兵|将|国|之|大|丞|太|以|遣|使|复|又|乃)', c)
    t = m.group(1) if m else ''
    z = zheng(y)
    if not t: return z
    if 189 <= y < 221:
        return {'吴': '吴', '蜀': '蜀汉', '魏': '魏'}.get(t, '汉')
    if 221 <= y < 280: return {'汉': '蜀汉', '蜀': '蜀汉', '吴': '吴', '魏': '魏', '晋': '西晋'}.get(t, z)
    if 304 <= y < 440:
        if t == '汉': return '成汉' if y >= 338 else '前赵'
        if t == '成': return '成汉'
        if t == '赵': return '前赵' if y < 329 and ('曜' in c) else '后赵' if y < 352 else z
        if t == '燕': return '前燕' if y <= 370 else '后燕' if y < 409 else '北燕'
        if t == '秦': return '前秦' if y <= 394 else '后秦'
        if t == '凉': return '前凉' if y <= 376 else '后凉' if 386 <= y <= 403 else '北凉'
        if t == '夏': return '夏'
        if t == '代': return '代'
        if t == '魏': return '北魏'
        if t == '晋': return z
        return z
    if 386 <= y < 589:
        if t == '魏': return '北魏' if y < 535 else '西魏'
        if t == '齐': return '南齐' if y < 502 else '北齐'
        if t == '周': return '北周'
        if t == '梁': return '梁' if y < 557 else '西梁'
        if t in ('宋', '陈'): return t
        return z
    if 589 <= y < 907: return z
    if 907 <= y < 961:
        mp = {'晋': '晋' if y < 923 else '后晋', '岐': '岐', '吴': '吴' if y < 937 else '南唐', '蜀': '前蜀' if y < 926 else '后蜀', '唐': '南唐' if y >= 937 else '后唐', '汉': '南汉' if y < 947 else '后汉' if y < 951 else '北汉', '闽': '闽', '楚': '楚', '燕': '燕', '梁': '后梁', '周': '后周'}
        return mp.get(t, z)
    return z
PAT = re.compile(r'(?:以|拜)([^，。；：「」、为]{2,14}?)为([^，。；：「」（]{2,16})')
DIE = re.compile(r'([^，。；：「」、]{2,4}?)(?:卒|薨|死|遇害|被杀|伏诛|自杀|赐死|弃市)')
rows, deaths = [], {}
for y, v, n, t in entries(ROOT / 'corpus'):
    if y < Y0 - 5 or y > Y1: continue
    for sent in re.split(r'[。；]', t):
        for m in PAT.finditer(sent):
            xs, off = m.group(1), m.group(2)
            off = re.split(r'[、]', off)[0]
            if not OFF.search(off) or len(off) > 14: continue
            off = re.sub(r'(?:以|而|于|，).*$', '', off)
            clause = sent[:m.start()][-30:]
            for x in xs.split('、'):
                nm = pick_name(x, y)
                if not nm or OFF.fullmatch(nm): continue
                strong = pol_of(clause + x, y); wide = pol_of(t[:t.find(sent)][-200:] + clause + x, y) if sent in t else strong; dp = dy_pol(nm, y)
                if strong != zheng(y) and EXPLICIT.search(clause + x): pol, how = strong, 2     # 明写复合国号的最可信
                elif dp: pol, how = dp, 2 if dp != zheng(y) else 0                              # 其次照哈佛库的朝代
                elif strong != zheng(y): pol, how = strong, 1                                    # 再次照句里的单字国号
                else: pol, how = strong, 0                                                       # 都没有：照通鉴纪年的正统，后面再照同人十年内别处的写法改
                rows.append([y, nm, off, pol, v, how])
        for m in DIE.finditer(sent):
            nm = pick_name(m.group(1), y)
            if nm and near(nm, y): deaths.setdefault(nm, y)
# 南北朝（420—589）照正史分南北：这人在魏书、北齐书、周书里出现得多，就是北朝的人（通鉴照南朝纪年，北朝的人常不写国号）
import gzip
def book(b): return ' '.join(json.loads(l)['text'] for l in gzip.open(ROOT / 'corpus' / f'{b}.jsonl.gz', 'rt', encoding='utf8'))
NB = {b: book(b) for b in ('weishu', 'beiqishu', 'zhoushu', 'songshu', 'nanqishu', 'liangshu', 'chenshu')}
def ns_pol(nm, y):
    c = {b: NB[b].count(nm) for b in NB}; north = c['weishu'] + c['beiqishu'] + c['zhoushu']; south = c['songshu'] + c['nanqishu'] + c['liangshu'] + c['chenshu']
    if north < 3 or north < south * 2: return None
    if y < 535: return '北魏'
    east = c['beiqishu'] >= c['zhoushu']
    if y < 550: return '东魏' if east else '西魏'
    return '北齐' if east else ('北周' if y >= 557 else '西魏')
for r in rows:
    if 420 <= r[0] < 589 and r[5] < 2 and r[3] in ('宋', '南齐', '梁', '陈'):
        p = ns_pol(r[1], r[0])
        if p: r[3], r[5] = p, 2
# 同一人十年内别处明写了是哪一国的，没写的照那一国（史书只在头一回写国号）
from collections import defaultdict, Counter
pr = defaultdict(list)
for r in rows: pr[r[1]].append(r)
for nm, R in pr.items():
    for r in R:
        if r[5] == 2: continue
        votes = Counter(q[3] for q in R if q is not r and q[5] >= 1 and abs(q[0] - r[0]) <= 10 and q[3] != zheng(r[0]))
        if r[5] == 0 and votes: r[3] = votes.most_common(1)[0][0]
        elif r[5] == 1 and votes and votes.most_common(1)[0][1] >= 2 and votes.most_common(1)[0][0] != r[3]: r[3] = votes.most_common(1)[0][0]
# 国号还没立就写成那一国的（陈霸先 545 年还是梁臣）：照前朝改
LIFE = {'魏': (213, 265, '汉'), '蜀汉': (214, 263, '汉'), '吴': (194, 280, '汉'), '西晋': (265, 317, '魏'), '东晋': (317, 420, '西晋'), '宋': (420, 479, '东晋'), '南齐': (479, 502, '宋'), '梁': (502, 557, '南齐'), '陈': (557, 589, '梁'),
        '东魏': (534, 550, '北魏'), '西魏': (535, 557, '北魏'), '北齐': (550, 577, '东魏'), '北周': (557, 581, '西魏'), '隋': (581, 618, '北周'), '唐': (618, 907, '隋'), '后梁': (907, 923, '唐'), '后唐': (923, 936, '晋'), '后晋': (936, 947, '后唐'), '后汉': (947, 951, '后晋'), '后周': (951, 960, '后汉'),
        '前秦': (350, 394, '后赵'), '后秦': (384, 417, '前秦'), '后燕': (384, 409, '前秦'), '南唐': (937, 975, '吴'), '北汉': (951, 979, '后汉'), '辽': (907, 1125, '辽')}
for r in rows:
    for _ in range(4):
        L = LIFE.get(r[3])
        if not L or L[0] <= r[0] <= L[1] or L[2] == r[3]: break
        r[3] = L[2] if r[0] < L[0] else r[3]
        if r[0] > L[1]: break
by = {}
for y, nm, off, pol, v, how in rows:
    if y < Y0: continue
    by.setdefault((nm, pol), []).append([y, off, v])
figs = []
for (nm, pol), P in by.items():
    P.sort(); posts = []
    for i, (y, off, v) in enumerate(P):
        nxt = next((q[0] for q in P[i + 1:] if q[0] > y), None); end = min(nxt, y + 6) if nxt else y + 4   # 通鉴不记离任：到下一回任命为止，最多六年
        dd = deaths.get(nm); dd = dd if dd and P[-1][0] <= dd <= P[-1][0] + 40 else None   # 同名的另一人卒年不算
        if dd and dd >= y: end = min(end, dd)
        if posts and posts[-1][2] == off: posts[-1][1] = max(posts[-1][1], end); continue
        posts.append([y, max(y, min(end, Y1)), off, '资治通鉴·' + v])
    figs.append({'name': nm, 'pol': pol, 'died': deaths.get(nm) if deaths.get(nm) and P[-1][0] <= deaths[nm] <= P[-1][0] + 40 else None, 'posts': posts, 'src': '资治通鉴'})
figs.sort(key=lambda f: (f['posts'][0][0], f['name']))
json.dump({'id': f'tongjian-{Y0}-{Y1}', 'title': f'资治通鉴任免年表（{Y0}—{Y1}）', 'range': [Y0, Y1], 'source': '资治通鉴（本仓库原文库），程序逐年摘「以某为某官」，每条注卷数；人名照哈佛库（CBDB）人名表核对', 'figures': figs}, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(len(figs), '人', sum(len(f['posts']) for f in figs), '条', Counter(f['pol'] for f in figs).most_common(40))
