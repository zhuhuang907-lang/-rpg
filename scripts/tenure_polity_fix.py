"""任职年表里五代各家的人，政权照资治通鉴的上下文重核（试玩查出：930 年后唐朝里出了楚的拓跋恒、李铎，吴越的钱元球，吴的景通）。
做法：表上记成中原五朝（后梁、后唐、后晋、后汉、后周）、907—960 有任职的人，到通鉴里找提到他全名的句子，
看同句里出现哪一国的标志（国号、国主名）；十国某一国的标志过半、且至少两句，就改记那一国，src 后注「政权照通鉴上下文改」。
用法：python3 -I scripts/tenure_polity_fix.py [--write]"""
import sys, re, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from tongjian_years import entries
ROOT = pathlib.Path(__file__).resolve().parent.parent
CENTRAL = {'后梁', '后唐', '后晋', '后汉', '后周', '梁', '晋', '汉', '周'}   # 「唐」不动：907 年以前唐朝在册的官（韦庄入蜀前做过校书郎），改了会从唐末的朝里消失
MARK = {   # 十国标志：国号（带下一个字防误认）、国主名
    '楚': [r'楚(?:王|主|人|兵|将|相|国|之)', '马殷', r'(?:^|[，。 ])殷(?:始|以|遣|命|闻|立)', '马希声', '马希范', '马希广', '马希萼', '马希崇', '希范', '希声', '天策'],
    '吴越': ['吴越', r'吴王镠', '钱镠', '钱元瓘', '钱弘佐', '钱弘倧', '钱弘俶', '元瓘', '弘佐'],
    '南汉': ['南汉', r'汉主[岩䶮龑玢晟鋹]', '刘岩', '刘䶮', '刘龑', '刘玢', '刘晟', '刘鋹', '大长和', r'广州'],
    '吴': [r'吴(?:王(?!镠)|主|人|兵|将|相|国|之|徐)', '杨行密', '杨渥', '杨隆演', '杨溥', '徐温', '徐知诰', '徐知训', '广陵', '江都'],
    '闽': [r'闽(?:王|主|人|兵|将|国|之)', '王审知', '王延翰', '王延钧', '王继鹏', '王延羲', '王延政', '福州'],
    '前蜀': [r'蜀(?:主|王|人|兵|将|国|之)', '王建', '王衍', '王宗', '成都'],
    '荆南': ['荆南', '高季兴', '高从诲', '高保融', '江陵'],
}
ROYAL = {'吴越': ['钱元', '钱弘', '钱镠', '钱传', '钱俶'], '楚': ['马希', '马殷'], '荆南': ['高从', '高保', '高季兴', '高继冲'], '南汉': ['刘弘', '刘䶮', '刘龑', '刘鋹', '刘玢', '刘晟'], '闽': ['王延', '王审知', '王继鹏', '王继业'], '前蜀': ['王宗', '王衍']}
LIFE = {'前蜀': (907, 925), '后蜀': (926, 965), '吴': (902, 937), '吴越': (907, 978), '楚': (907, 951), '闽': (909, 945), '南汉': (917, 971), '荆南': (907, 963)}   # 后蜀从孟知祥据蜀算
CMARK = [r'(?<![吴越楚闽蜀汉])帝(?:以|命|谓|遣|诏)', '诏', '洛阳', '大梁', '汴', '枢密', '明宗', '庄宗', '晋王', '契丹', '朝廷']
def pol_marks(sent):
    hit = {k for k, L in MARK.items() if any(re.search(m, sent) for m in L)}
    return hit
def _move(d, x, k, note):
    """改政权：任职在那一国存世年间的挪过去，那一国亡后的留在原政权（张格 924—927 前蜀宰相，930 唐太子宾客）"""
    lo, hi = LIFE[k]; inn = [q for q in x['posts'] if q[0] <= hi and q[1] >= lo]; out = [q for q in x['posts'] if not (q[0] <= hi and q[1] >= lo)]
    if not out: x['pol'] = k; x['src'] = (x.get('src') or '') + note; return
    x['posts'] = out; y = dict(x); y['posts'] = inn; y['pol'] = k; y['src'] = (x.get('src') or '') + note; d['figures'].append(y)
def run(write=False):
    E = [(y, t) for y, v, n, t in entries(ROOT / 'corpus') if 900 <= y <= 965]
    sents = []   # 每句带上前两句当上下文（「楚王殷……以李铎为司徒」国号常在前一句）
    for y, t in E:
        L = [z for z in re.split(r'[。；]', t) if z]
        for i, z in enumerate(L): sents.append((y, z, '。'.join(L[max(0, i - 2):i + 1]), '。'.join(L[max(0, i - 1):i + 1])))
    report = []
    for f in ['wudai-cbdb.json', 'tongjian-184-960.json']:
        p = ROOT / 'web' / 'tenure' / f; d = json.load(open(p, encoding='utf8')); n = 0
        for x in list(d['figures']):
            if x.get('pol') not in CENTRAL or not x.get('name') or len(x['name']) < 2: continue
            if not any(q[0] <= 960 and q[1] >= 907 for q in x.get('posts') or []): continue
            k0 = next((k for k, L in ROYAL.items() if any(x['name'].startswith(r) for r in L)), None)
            if k0 and not any(q[0] <= LIFE[k0][1] and q[1] >= LIFE[k0][0] for q in x.get('posts') or []): k0 = None
            if k0:   # 十国宗室（钱元球、马希振）：照姓名定
                report.append((f, x['name'], x['pol'], k0, '宗室', 0, 0)); n += 1
                if write: _move(d, x, k0, '；政权照宗室改')
                continue
            S = [c for y, z, c, c1 in sents if x['name'] in z]; Z = [z for y, z, c, c1 in sents if x['name'] in z]; S1 = [c1 for y, z, c, c1 in sents if x['name'] in z]
            if len(S) < 1: continue
            cnt = {}; cen = 0
            for s, z in zip(S, Z):
                h = pol_marks(s)
                if len(h) == 1: k = h.pop(); cnt[k] = cnt.get(k, 0) + 1
                if any(re.search(m, z) for m in CMARK): cen += 1   # 中原标志只看本句（楚也设枢密院，前一句的「枢密院」不算中原）
            if not cnt: continue
            k, c = max(cnt.items(), key=lambda z: z[1])
            if k == '前蜀':   # 「蜀」分前后：提到他的那几年多在 926 以后（孟知祥据蜀）算后蜀（伊审征）
                Ys = sorted(y for y, z, c0, c1 in sents if x['name'] in z)
                if Ys and Ys[len(Ys) // 2] >= 926: k = '后蜀'
            lo, hi = LIFE[k]
            if not any(q[0] <= hi and q[1] >= lo for q in x.get('posts') or []): continue   # 这条任职全在那一国亡后（张格 925 年降唐以后的唐官），不改
            appoint = any(re.search(r'以[^。]{0,30}' + re.escape(x['name']) + r'[^，。]{0,3}为|' + re.escape(x['name']) + r'为[^，。]{1,10}[、，]', z) for z in Z)
            near = sum(1 for c1 in S1 if pol_marks(c1) == {k})   # 只一句为凭的，国号得在本句或紧前一句（孙超：「闽主」在两句前，说的是别的事）
            if (c >= 2 or (c == 1 and appoint and near)) and c > len(S) / 2 and c > cen:   # 只一句为凭的，那句得是任命句（「以李铎为司徒」），光是提了一嘴不算（黄损、张归霸）
                report.append((f, x['name'], x['pol'], k, c, len(S), cen)); n += 1
                if write: _move(d, x, k, '；政权照通鉴上下文改（' + str(c) + '/' + str(len(S)) + '句）')
        if write: json.dump(d, open(p, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    return report
if __name__ == '__main__':
    R = run('--write' in sys.argv)
    for r in R: print(*r)
    print('共', len(R), '人', file=sys.stderr)
