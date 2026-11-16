"""宋宰相官名照年代（任务三十三第一步，R-241）：照《宋史·宰辅表》卷211—214 原文，给 1082 年以后的宰相任职找拜相那句里的官名。
960—1081 同中书门下平章事；1082 元丰改制 尚书左仆射兼门下侍郎、尚书右仆射兼中书侍郎；1112 政和改 太宰兼门下侍郎、少宰兼中书侍郎；
1126 复左右仆射；1129 建炎三年 尚书左、右仆射同中书门下平章事；1172 乾道八年 左、右丞相。原文找不到左右的，how 记「推定」、照初拜多为右的惯例写右。
用法：python3 -I scripts/song_titles.py （读 corpus/songshi.jsonl.gz，改 scripts/court_supplement/song.json）"""
import gzip, json, re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = os.path.join(ROOT, 'scripts/court_supplement/song.json')
rows = []  # (year, text)
for l in gzip.open(os.path.join(ROOT, 'corpus/songshi.jsonl.gz'), 'rt'):
    d = json.loads(l)
    if d['volume'] in ('卷211', '卷212', '卷213', '卷214'):
        for seg in re.split(r'\|-', d['text']):
            m = re.search(r'\b(1[01]\d\d|9[6-9]\d)\b', seg)
            if m: rows.append((int(m.group(1)), seg))
def side_of(name, y):
    for yy, seg in rows:
        if abs(yy - y) > 1: continue
        for cl in re.split(r'[；。]|\|\|', seg):
            if name not in cl: continue
            tail = cl[cl.index(name):]
            for k in ('左丞相', '右丞相', '太宰', '少宰', '左仆射', '右仆射'):
                if k in tail and re.search(r'(拜|为|加|守|依前|以|除|迁|进|罢|授)[^。]{0,16}' + k, tail): return k, (yy, cl.strip()[:60])
    return None, None
def title(k, y):
    if y >= 1172: return {'左丞相': '左丞相', '右丞相': '右丞相'}.get(k) or ('左丞相' if k and '左' in k else '右丞相')
    if y >= 1129: return '尚书左仆射、同中书门下平章事' if k and '左' in k else '尚书右仆射、同中书门下平章事'
    if 1112 <= y < 1126 or k in ('太宰', '少宰'): return '太宰兼门下侍郎' if k in ('太宰', '左仆射') else '少宰兼中书侍郎'
    return '尚书左仆射兼门下侍郎' if k and '左' in k else '尚书右仆射兼中书侍郎'
D = json.load(open(F)); n = ok = 0; miss = []
# 表格切行时两人名字粘连（「吕颐」「浩杜充」本是吕颐浩、杜充；「王黼京」是王黼与蔡京同格）——并回本人
byn = {x['name']: x for x in D['people']}
def merge(bad, good, keep=True):
    b = byn.get(bad); g = byn.get(good)
    if not b: return
    if g and keep: g['posts'] += [p for p in b['posts'] if p['seat'] not in ('song-zaixiang',) or not any(q['seat'] == p['seat'] and q['from'] <= p['from'] <= q['to'] for q in g['posts'])]
    elif not g and keep: b['name'] = good; byn[good] = b; return
    D['people'].remove(b)
merge('吕颐', '吕颐浩'); merge('浩杜充', '杜充')
if '王黼京' in byn and '王黼' in byn:
    for p in byn['王黼']['posts']:
        if p['seat'] == 'song-zaixiang': p['to'] = max(p['to'], 1124)
    D['people'].remove(byn['王黼京'])
for x in D['people']: x['posts'].sort(key=lambda p: (p['seat'], p['from']))
SPECIAL = {('蔡京', 1112): '太师、总治三省事', ('蔡京', 1118): '太师、总治三省事', ('蔡京', 1125): '太师、领三省事', ('文彦博', 1086): '平章军国重事', ('韩侂胄', 1205): '平章军国事'}
for x in D['people']:
    for p in x['posts']:
        if p['seat'] != 'song-zaixiang' or p['from'] < 1082: continue
        n += 1
        if (x['name'], p['from']) in SPECIAL: p['office'] = SPECIAL[(x['name'], p['from'])]; p['how'] = '明载'; ok += 1; continue
        k, ev = side_of(x['name'], p['from'])
        p['office'] = title(k, p['from'])
        if k: ok += 1; p['src'] = '宋史·宰辅表（' + str(ev[0]) + '年：' + ev[1] + '）'
        else: p['how'] = '推定'; miss.append(f"{x['name']}{p['from']}")
for P in D['polities']:
    for s in P['seats']:
        if s['id'] == 'song-zaixiang': s['office'] = '宰相（960—1081 同中书门下平章事；1082 左右仆射兼门下、中书侍郎；1112 太宰、少宰；1129 左右仆射同平章事；1172 左右丞相）'
json.dump(D, open(F, 'w'), ensure_ascii=False, indent=1)
print(f'1082 年后宰相任职 {n} 条，原文找到左右 {ok} 条；推定 {len(miss)}：' + '、'.join(miss[:40]))
