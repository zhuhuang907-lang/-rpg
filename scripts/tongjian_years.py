"""资治通鉴逐条定年：每卷开头「起〈岁阳岁阴〉，尽〈岁阳岁阴〉，凡N年」，卷内条目编号从 1 重新数起就是换年。
输出 [(公元年, 卷, 条号, 正文)]。公元前年份用负数（前 403 年 = -403，无公元 0 年）。"""
import gzip, json, re, pathlib
YANG = '阏逢 旃蒙 柔兆 强圉 著雍 屠维 上章 重光 玄黓 昭阳'.split()
YANG_ALT = {'焉逢': 0, '端蒙': 1, '游兆': 2, '强梧': 3, '徒维': 5, '商横': 6, '昭阳': 9, '横艾': 8}
YIN = '困敦 赤奋若 摄提格 单阏 执徐 大荒落 敦牂 协洽 涒滩 作噩 阉茂 大渊献'.split()
YIN_ALT = {'作鄂': 9, '淹茂': 10, '太渊献': 11, '大渊献': 11, '滩': 8}
def gz_index(s):
    A = list(enumerate(YANG)) + [(v, k) for k, v in YANG_ALT.items()]
    B = list(enumerate(YIN)) + [(v, k) for k, v in YIN_ALT.items()]
    for i, a in A:
        if s.startswith(a):
            rest = s[len(a):]
            for j, b in sorted(B, key=lambda x: -len(x[1])):
                if rest.startswith(b):
                    return next(k for k in range(60) if k % 10 == i and k % 12 == j)
    return None
def gz_of_year(y):   # 公元 4 年 = 甲子（0）
    yy = y if y > 0 else y + 1
    return (yy - 4) % 60
def step(y, d):
    r = y + d
    if y < 0 <= r or (y < 0 and r == 0): r += 1 if r >= 0 else 0
    return r if r != 0 else 1
def entries(corpus_dir, log=None):
    """季节倒回去（秋之后又见春）就是换年；有卷首干支的卷，照干支校正起年。前 104 年（太初改历）以前岁首是冬十月"""
    L = [json.loads(l) for l in gzip.open(pathlib.Path(corpus_dir) / 'zizhitongjian.jsonl.gz', 'rt', encoding='utf8')]
    vols = {}
    for p in L: vols.setdefault(p['volume'], []).append(p['text'])
    out, cur, last = [], -403, -1
    for v in sorted(vols, key=lambda x: int(re.sub(r'\D', '', x))):
        txt = ' '.join(vols[v]); m = re.search(r'起([^，,。]{2,6})[，,]\s*尽([^，,。]{2,6})[，,]\s*凡', txt[:300])
        g0 = gz_index(m.group(1)) if m else None; g1 = gz_index(m.group(2)) if m else None
        if g0 is not None and out:
            cur = next(step(cur, d) for d in range(0, 61) if gz_of_year(step(cur, d)) == g0); last = -1
        body = txt[m.end():] if m else txt
        segs = re.split(r'(?:(?<=[\s。」])|^)(?=(?:\d{1,3}\u3000)?(?:[春夏秋冬])，)', body)
        for seg in segs:
            seg = seg.strip()
            if not seg: continue
            sm = re.match(r'(?:(\d{1,3})\u3000)?([春夏秋冬])，', seg)
            if sm:
                order = ('冬春夏秋' if cur < -104 else '春夏秋冬').index(sm.group(2))
                if order <= last and not (order == last and order != 0): cur = step(cur, 1)
                elif order < last: cur = step(cur, 1)
                last = order
            out.append((cur, v, 0, re.sub(r'(?:^|\s)\d{1,3}\u3000', ' ', seg).strip()))
        if g1 is not None and gz_of_year(cur) != g1 and log is not None: log.append((v, cur, g1))
    return out
if __name__ == '__main__':
    import sys
    LG = []; E = entries(sys.argv[1] if len(sys.argv) > 1 else 'corpus', LG); print('卷末对不上干支的卷', len(LG), LG[:8])
    for key in ['赤壁', '淝水', '尔朱荣', '侯景', '朱全忠', '石敬瑭', '赵匡胤']:
        hit = next(((y, v) for y, v, n, t in E if key in t), None); print(key, hit)
    print(len(E), E[-1][:3])
