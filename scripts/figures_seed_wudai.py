"""五代十国名臣预制包第一稿（R-244，任务三十六第一步，宰相代办）：把现有朝廷数据（web/court/wudai.json）和列传履历（web/tenure/wudai-liezhuan.json）
并成预制格式。出没地点年表照官职推：节度使照军号治所，刺史照州名，留守、尹照京府，朝官照该政权当年都城——how 一律记「推定」并写依据；
能力分、性格不编（留给任务三十六照史书评语补）。用法：python3 -I scripts/figures_seed_wudai.py"""
import json, re, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda p: json.load(open(os.path.join(R, p), encoding='utf8'))
# 方镇军号 → 治所（唐末五代通行，见新唐书方镇表、新五代史职方考）
JUN = {'天雄': '魏州', '昭义': '潞州', '成德': '镇州', '义武': '定州', '卢龙': '幽州', '河东': '太原', '宣武': '汴州', '天平': '郓州', '平卢': '青州', '武宁': '徐州',
  '忠武': '许州', '护国': '河中府', '泰宁': '兖州', '归德': '宋州', '凤翔': '凤翔府', '淮南': '扬州', '荆南': '江陵', '武安': '潭州', '威武': '福州', '清海': '广州',
  '横海': '沧州', '彰义': '泾州', '保义': '陕州', '匡国': '同州', '山南东道': '襄州', '武昌': '鄂州', '西川': '成都', '东川': '梓州', '镇国': '华州', '河阳': '孟州',
  '定难': '夏州', '朔方': '灵州', '义成': '滑州', '镇海': '杭州', '镇东': '越州', '宁国': '宣州', '奉化': '江州', '清淮': '寿州', '归义': '沙州', '静难': '邠州', '保大': '鄜州',
  '彰武': '延州', '雄武': '秦州', '安远': '安州', '武定': '洋州', '山南西道': '兴元府', '大同': '云州', '振武': '朔州', '彰国': '应州', '威塞': '新州', '建雄': '晋州', '永清': '贝州',
  '保静': '安州', '静海': '交州', '宁江': '夔州', '武泰': '黔州', '昭武': '利州', '静江': '桂州', '武平': '朗州', '镇南': '洪州', '永兴': '京兆府', '晋昌': '京兆府'}
CAP = {'后梁': [(907, 908, '汴州'), (909, 912, '洛阳'), (913, 923, '汴州')], '后唐': [(923, 936, '洛阳')], '后晋': [(936, 937, '洛阳'), (938, 947, '汴州')], '后汉': [(947, 950, '汴州')], '后周': [(951, 960, '汴州')],
  '北宋': [(960, 979, '汴州')], '吴': [(902, 937, '扬州')], '南唐': [(937, 975, '金陵')], '吴越': [(893, 978, '杭州')], '前蜀': [(891, 925, '成都')], '后蜀': [(926, 965, '成都')], '闽': [(893, 945, '福州')],
  '楚': [(896, 951, '潭州')], '南汉': [(905, 971, '广州')], '荆南': [(907, 963, '江陵')], '北汉': [(951, 979, '太原')], '晋': [(883, 923, '太原')], '岐': [(887, 924, '凤翔府')], '燕': [(895, 913, '幽州')], '赵': [(882, 921, '镇州')]}
POLMAP = {'梁': '后梁', '唐': '后唐', '晋': '晋', '汉': '后汉', '周': '后周', '蜀': '前蜀', '宋': '北宋'}
def cap(pol, y):
    for a, b, p in CAP.get(pol, []):
        if a <= y <= b: return p
    return None
def place_of(office, pol, y):
    t = re.sub(r'[（(][^）)]*[）)]', '', office)   # 括号里是经历注语，不拿来认地方
    hits = []
    for k, v in JUN.items():
        m = re.search(k + r'(军|节度|、)', t)
        if m: hits.append((m.start(), v, f'{k}军治{v}（方镇治所）'))
    for m in re.finditer(r'(\w)州(刺史|防御使|团练使|节度使|司马|长史|判官|留后)', t): hits.append((m.start(), m.group(1) + '州', '任职州名'))
    for m in re.finditer(r'守(\w)州', t): hits.append((m.start(), m.group(1) + '州', '任职州名'))
    if hits: hits.sort(); return hits[0][1], hits[0][2]   # 照原文里先出现的那个
    if re.search(r'邺都|兴唐|天雄', t): return '魏州', '邺都（魏州）'
    if re.search(r'太原尹|北京留守', t): return '太原', '北京太原府'
    if re.search(r'西京留守|河南尹', t): return '洛阳', '西京河南府'
    if re.search(r'东京留守|开封尹', t): return '汴州', '东京开封府'
    if re.search(r'平章事|枢密|三司|租庸|翰林|中书|门下|尚书|侍中|御史|丞相|仆射|司徒|司空|学士|舍人|给事中|都点检|侍卫亲军|内枢|六军|判度支|宣徽|统军', t):
        c = cap(pol, y)
        if c: return c, f'{pol}都城（朝官在京）'
    return None, ''
def tag_of(offs, tier):
    t = '；'.join(offs)
    if re.search(r'皇帝|吴越王|吴王|蜀主|燕帝|赵王|岐王|称帝|国主', t): return '君主'
    if re.search(r'平章事|丞相|枢密使|中书令|侍中|三司使|租庸使', t): return '名臣'
    if re.search(r'节度使', t): return '藩帅'
    if re.search(r'将|指挥使|都点检|招讨|都部署|统军|都虞候', t): return '名将'
    if re.search(r'学士|掌书记|判官|舍人', t): return '文士'
    if re.search(r'伶', t): return '文士'
    if re.search(r'酋长', t): return '外族首领'
    return '名臣'
P = {}
for p in J('web/court/wudai.json')['people']:
    x = P.setdefault(p['name'], {'name': p['name'], 'tier': p.get('tier') or 2, 'born': p.get('born'), 'died': p.get('died'), 'clan': p.get('clan') or '', 'native': p.get('native') or '', 'posts': [], 'ties': [], 'fate': p.get('fate') or '', 'note': '', 'src': p.get('src') or ''})
    for q in p['posts']: x['posts'].append({'polity': q.get('polity') or '', 'office': q['office'], 'from': q['from'], 'to': q['to'], 'how': q.get('how') or '推定', 'src': q.get('src') or p.get('src') or '', '_r': 0})
    x['ties'] += [{'name': t.get('name'), 'rel': t.get('rel'), 'src': t.get('src') or ''} for t in p.get('ties') or [] if t.get('name')]
for f in J('web/tenure/wudai-liezhuan.json')['figures']:
    pol = POLMAP.get(f.get('pol'), f.get('pol') or '')
    x = P.setdefault(f['name'], {'name': f['name'], 'tier': 2, 'born': f.get('born'), 'died': f.get('died'), 'clan': '', 'native': f.get('native') or '', 'posts': [], 'ties': [], 'fate': '', 'note': f.get('note') or '', 'src': f.get('src') or f.get('juan') or ''})
    if x['born'] is None: x['born'] = f.get('born')
    if f.get('died') is not None and x['died'] != f.get('died'): x['died'] = f.get('died')   # 卒年两表不一：照正史列传（罗隐：朝廷数据 926、列传 909）
    if not x['note']: x['note'] = f.get('note') or ''
    hw = {(a, b): h for a, b, h in f.get('how') or []}
    for a, b, o in f.get('posts') or []:
        if not any(q['from'] == a and q['office'].split('（')[0] == o.split('（')[0] for q in x['posts']):
            x['posts'].append({'polity': pol, 'office': o, 'from': a, 'to': b, 'how': hw.get((a, b), '推定'), 'src': f.get('src') or f.get('juan') or '', '_r': 1})
# 君主单列（政权总表 web/history/polities.json：五代十国各国君主在位年、都城、出处）：都城即出没地点；已在名单里的并进去、标君主
RUL = {}
for pol in J('web/history/polities.json') if isinstance(J('web/history/polities.json'), list) else J('web/history/polities.json').get('polities', []):
    if not (pol.get('from', 9999) <= 979 and pol.get('to', 0) >= 907): continue
    caps = pol.get('capital') or []
    for r in pol.get('rulers') or []:
        a, b = max(r.get('from') or 907, 907), min(r.get('to') or 979, 979)
        if a > b: continue
        n = re.sub(r'[（(].*$', '', r.get('name') or '').strip()
        if not n: continue
        cs = [c for c in caps if (c.get('from') or 0) <= b and (c.get('to') or 9999) >= a] or caps[:1]
        w = [{'from': max(a, c.get('from') or a), 'to': min(b, c.get('to') or b), 'place': c['name'], 'why': (r.get('title') or '') + '在位', 'how': '明载', 'src': '政权总表都城；' + (r.get('src') or '')} for c in cs if c.get('name')]
        RUL.setdefault(n, {'posts': [], 'where': [], 'title': r.get('title') or '', 'src': r.get('src') or ''})
        RUL[n]['posts'].append({'polity': pol['name'], 'office': (r.get('title') or pol['name'] + '君主'), 'from': a, 'to': b, 'how': '明载', 'src': r.get('src') or ''})
        RUL[n]['where'] += w
out = []
for x in P.values():
    x['posts'].sort(key=lambda q: (q['from'] or 0))
    where = []
    for q in x['posts']:
        if q['from'] is None: continue
        pl, why = place_of(q['office'], q['polity'], q['from'])
        if pl: where.append({'_r': q.get('_r', 1), 'from': q['from'], 'to': q['to'] if q['to'] is not None else q['from'], 'place': pl, 'why': q['office'].split('（')[0][:20], 'how': '推定', 'src': why + '；' + (q['src'] or '')})
    where.sort(key=lambda w: (w['_r'], w['from'])); [w.pop('_r') for w in where]   # 朝廷数据（逐句核过）在前：同一年两处，以它为准
    offs = [q['office'] for q in x['posts']]
    out.append({'name': x['name'], 'tag': tag_of(offs, x['tier']), 'tier': x['tier'], 'born': x['born'], 'died': x['died'], 'clan': x['clan'], 'native': x['native'],
                'posts': [{**{k: v for k, v in q.items() if k != '_r'}, 'place': (place_of(q['office'], q['polity'], q['from'] or 0)[0] or '')} for q in x['posts']], 'where': where,
                'stats': {}, 'statsWhy': {}, 'traits': [], 'ties': x['ties'], 'fate': x['fate'], 'brief': (x['note'] or x['fate'])[:120], 'src': x['src']})
# 生卒补齐：史料包 figures 里有的照它（tang-late、song-north 都含五代人物）
LIFE = {}
for hp in ('web/history/tang-late.json', 'web/history/song-north.json'):
    for f in J(hp).get('figures') or []:
        if f.get('name'): LIFE.setdefault(f['name'], (f.get('born') or None, f.get('died') or None))
by = {p['name']: p for p in out}
for n, r in RUL.items():
    if n in by:
        p = by[n]; p['tag'] = '君主'; p['tier'] = 1; p['where'] = r['where'] + p['where']; p['posts'] += r['posts']
    else:
        out.append({'name': n, 'tag': '君主', 'tier': 1, 'born': None, 'died': None, 'clan': '', 'native': '', 'posts': r['posts'], 'where': r['where'],
                    'stats': {}, 'statsWhy': {}, 'traits': [], 'ties': [], 'fate': '', 'brief': r['title'], 'src': r['src']})
for p in out:
    b, d0 = LIFE.get(p['name'], (None, None))
    if p['born'] is None and b: p['born'] = b
    if p['died'] is None and d0: p['died'] = d0
out.sort(key=lambda p: (p['tier'], p['name']))
doc = {'era': 'wudai', 'range': [907, 979], 'source': '新五代史、旧五代史、资治通鉴（经 web/court/wudai.json、web/tenure/wudai-liezhuan.json）', 'seed': True,
       'note': '第一稿：宰相照现有朝廷数据、列传机械合成；出没地点照官职治所、都城推定；能力分、性格、空年待任务三十六照史书补', 'people': out}
os.makedirs(os.path.join(R, 'web/figures'), exist_ok=True)
json.dump(doc, open(os.path.join(R, 'web/figures/wudai.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(len(out), '人；有出没地点', sum(1 for p in out if p['where']), '人；标签', {t: sum(1 for p in out if p['tag'] == t) for t in set(p['tag'] for p in out)})
