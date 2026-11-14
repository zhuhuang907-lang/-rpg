"""后唐（923—936）中枢人物：候选名单（人、位子、官名关键词）逐个到资治通鉴（逐条定年）里找「人名紧挨着官名」的那一句，
找到才收，出处写通鉴卷数和原句；找不到的不收（任务六后唐，R-227）。
- 原句是「以某为某官」的，算明载（上任年）；只是「某官某人」称呼的，算推定（那一年已在任）。
- 离任：之后第一句写这人罢、免、贬、杀、卒、出为别官的年份；没有就到四年后（推定），不过 936。"""
import sys, re, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from tongjian_years import entries
ROOT = pathlib.Path(__file__).resolve().parent.parent
CAND = [
    ('豆卢革', 'ht-xz', ['同平章事', '门下侍郎']), ('卢程', 'ht-xz', ['同平章事', '中书侍郎']), ('韦说', 'ht-xz', ['同平章事']), ('郭崇韬', 'ht-xz', ['侍中']),
    ('任圜', 'ht-xz', ['同平章事']), ('郑珏', 'ht-xz', ['同平章事']), ('郑玨', 'ht-xz', ['同平章事']), ('冯道', 'ht-xz', ['同平章事']), ('崔协', 'ht-xz', ['同平章事']), ('赵凤', 'ht-xz', ['同平章事']),
    ('李愚', 'ht-xz', ['同平章事']), ('刘昫', 'ht-xz', ['同平章事']), ('卢文纪', 'ht-xz', ['同平章事']), ('姚顗', 'ht-xz', ['同平章事']), ('马胤孙', 'ht-xz', ['同平章事']),
    ('郭崇韬', 'ht-smz', ['枢密使']), ('张居翰', 'ht-smz', ['枢密使']), ('李绍宏', 'ht-smz', ['枢密使']), ('安重诲', 'ht-smz', ['枢密使']), ('孔循', 'ht-smz', ['枢密使']),
    ('赵延寿', 'ht-smz', ['枢密使']), ('范延光', 'ht-smz', ['枢密使']), ('朱弘昭', 'ht-smz', ['枢密使']), ('冯赟', 'ht-smz', ['枢密使']), ('韩昭胤', 'ht-smz', ['枢密使']),
    ('孔谦', 'ht-zy', ['租庸使']), ('张宪', 'ht-zy', ['租庸使']), ('张延朗', 'ht-ss', ['三司使']), ('孙岳', 'ht-ss', ['三司使']), ('王玫', 'ht-ss', ['三司使']),
    ('李德休', 'ht-zc', ['御史中丞']), ('李琪', 'ht-yd', ['御史大夫']), ('卢质', 'ht-hl', ['翰林学士']), ('冯道', 'ht-hl', ['翰林学士']),
    ('康义诚', 'ht-shiwei', ['侍卫亲军马步都指挥使', '侍卫亲军马步军都指挥使']), ('药彦稠', 'ht-shiwei', ['侍卫都指挥使']), ('安从进', 'ht-shiwei', ['侍卫都指挥使']),
]
ENDP = lambda nm: re.compile(re.escape(nm) + r'[^，。]{0,6}(?:罢|免|贬|伏诛|被杀|遇害|卒|薨|赐死|自杀|出为|致仕)|(?:杀|诛|斩)' + re.escape(nm))
def verify():
    E = [(y, v, t) for y, v, n, t in entries(ROOT / 'corpus') if 923 <= y <= 937]
    out = []
    for nm, seat, keys in CAND:
        got = None
        for y, v, t in E:
            for sent in re.split(r'[。；]', t):
                if nm not in sent: continue
                for k in keys:
                    m1 = re.search(re.escape(nm) + r'[^，。]{0,14}?为[^，。]{0,10}' + re.escape(k), sent)   # （以）某（、某）为某官
                    m2 = re.search(re.escape(k) + r'[、，]?' + re.escape(nm), sent)                        # 某官某人
                    if m1 and not re.search('贬|罢|免|梁', sent[:sent.find(nm)]): got = (y, v, sent.strip()[:70], k, '明载'); break   # 「为某官」是任命句；前头是贬、罢、梁朝的不算
                    if m2 or m1: got = got or (y, v, sent.strip()[:70], k, '推定')
                if got and got[4] == '明载': break
            if got and got[4] == '明载': break
        if not got: print('找不到：', nm, keys, file=sys.stderr); continue
        y, v, sent, k, how = got
        end = None
        for y2, v2, t2 in E:
            if y2 <= y: continue
            for s2 in re.split(r'[。；]', t2):
                if ENDP(nm).search(s2): end = y2; break
            if end: break
        out.append({'name': '郑珏' if nm == '郑玨' else nm, 'seat': seat, 'from': y, 'to': min(end or y + 4, 936), 'endHow': '明载' if end else '推定', 'vol': v, 'quote': sent, 'key': k, 'how': how})
    # 同一人后来坐了别的位子：前一任到后一任上任那年为止（冯道 927 拜相，翰林学士就到 927）
    for d in out:
        later = [e['from'] for e in out if e['name'] == d['name'] and e is not d and e['from'] > d['from']]
        if later and min(later) < d['to']: d['to'] = min(later); d['endHow'] = '明载'
    return out
if __name__ == '__main__':
    import json
    for d in verify(): print(json.dumps(d, ensure_ascii=False))
