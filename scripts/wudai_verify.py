"""五代中原四朝（后梁、后晋、后汉、后周）中枢人物：候选名单逐个到资治通鉴（逐条定年）里找「人名紧挨着官名」的那一句，
找到才收，出处写卷数和原句；找不到的不收（任务六续，R-227）。写法同 houtang_verify.py：
- 「（以）某（、某）为某官」算明载；只是「某官某人」称呼的算推定（那一年已在任）。
- 离任：之后第一句写这人罢、免、贬、杀、卒、出为别官的年份；没有就到四年后（推定），不过该朝亡年。"""
import sys, re, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from tongjian_years import entries
ROOT = pathlib.Path(__file__).resolve().parent.parent
XZ = ['同平章事']
STATES = {
    '后梁': ('hl', 907, 923, [
        ('张文蔚', 'xz', XZ), ('杨涉', 'xz', XZ), ('薛贻矩', 'xz', XZ), ('于兢', 'xz', XZ), ('张策', 'xz', XZ), ('赵光逢', 'xz', XZ), ('杜晓', 'xz', XZ),
        ('郑珏', 'xz', XZ), ('郑玨', 'xz', XZ), ('萧顷', 'xz', XZ), ('李琪', 'xz', XZ), ('敬翔', 'smz', ['崇政院使', '崇政使']), ('李振', 'smz', ['崇政院使', '崇政使']),
        ('赵岩', 'ss', ['租庸使']), ('张汉杰', 'smz', ['崇政院使'])]),
    '后晋': ('hj', 936, 947, [
        ('桑维翰', 'xz', XZ), ('赵莹', 'xz', XZ), ('李崧', 'xz', XZ), ('冯道', 'xz', XZ), ('和凝', 'xz', XZ), ('冯玉', 'xz', XZ), ('李彦韬', 'smz', ['枢密使']),
        ('桑维翰', 'smz', ['枢密使']), ('李崧', 'smz', ['枢密使']), ('刘处让', 'smz', ['枢密使']), ('冯玉', 'smz', ['枢密使']),
        ('刘审交', 'ss', ['三司使']), ('董遇', 'ss', ['三司使']), ('景延广', 'sw', ['侍卫']), ('杨光远', 'sw', ['侍卫'])]),
    '后汉': ('hh', 947, 951, [
        ('苏逢吉', 'xz', XZ), ('苏禹珪', 'xz', XZ), ('窦贞固', 'xz', XZ), ('李涛', 'xz', XZ), ('杨邠', 'smz', ['枢密使']), ('郭威', 'smz', ['枢密使']),
        ('王章', 'ss', ['三司使']), ('史弘肇', 'sw', ['侍卫'])]),
    '前蜀': ('qs', 907, 925, [
        ('王宗佶', 'xz', XZ + ['中书令']), ('张格', 'xz', XZ), ('韦庄', 'xz', XZ), ('王锴', 'xz', XZ), ('庾传素', 'xz', XZ), ('周庠', 'xz', XZ), ('宋光嗣', 'smz', ['枢密使']), ('潘炕', 'smz', ['枢密使']),
        ('唐道袭', 'smz', ['枢密使']), ('王宗弼', 'sw', ['马步都指挥使', '六军使'])]),
    '后蜀': ('hs', 934, 965, [
        ('赵季良', 'xz', XZ), ('毋昭裔', 'xz', XZ), ('李昊', 'xz', XZ), ('张业', 'xz', XZ), ('欧阳迥', 'xz', XZ), ('徐光溥', 'xz', XZ), ('范仁恕', 'xz', XZ),
        ('王处回', 'smz', ['枢密使']), ('伊审徵', 'smz', ['枢密使']), ('李廷珪', 'sw', ['都指挥使']), ('赵廷隐', 'sw', ['都指挥使'])]),
    '后周': ('hz', 951, 960, [
        ('王峻', 'xz', XZ), ('范质', 'xz', XZ), ('李谷', 'xz', XZ), ('冯道', 'xz', XZ), ('王溥', 'xz', XZ), ('魏仁浦', 'xz', XZ), ('景范', 'xz', XZ),
        ('王峻', 'smz', ['枢密使']), ('郑仁诲', 'smz', ['枢密使']), ('魏仁浦', 'smz', ['枢密使']), ('吴廷祚', 'smz', ['枢密使']),
        ('张美', 'ss', ['三司使']), ('李重进', 'sw', ['侍卫']), ('张永德', 'dq', ['殿前都点检', '殿前']), ('赵匡胤', 'dq', ['殿前都点检', '殿前都指挥使'])]),
}
def ENDP(nm): return re.compile(re.escape(nm) + r'[^，。]{0,6}(?:罢|免|贬|伏诛|被杀|遇害|卒|薨|赐死|自杀|出为|致仕)|(?:杀|诛|斩)' + re.escape(nm))
def verify():
    allE = [(y, v, t) for y, v, n, t in entries(ROOT / 'corpus') if 905 <= y <= 960]
    out = {}
    for pol, (pre, y0, y1, cands) in STATES.items():
        E = [e for e in allE if y0 <= e[0] <= y1]
        got_all = []
        for nm, seat, keys in cands:
            got = None
            for y, v, t in E:
                for sent in re.split(r'[。；]', t):
                    if nm not in sent: continue
                    for k in keys:
                        m1 = re.search(re.escape(nm) + r'[^，。]{0,14}?为[^，。]{0,10}' + re.escape(k), sent)
                        m2 = re.search(re.escape(k) + r'[、，]?' + re.escape(nm), sent)
                        if m1 and not re.search('贬|罢|免', sent[:sent.find(nm)]): got = (y, v, sent.strip()[:70], k, '明载'); break
                        if m2 or m1: got = got or (y, v, sent.strip()[:70], k, '推定')
                    if got and got[4] == '明载': break
                if got and got[4] == '明载': break
            if not got: print('找不到：', pol, nm, keys, file=sys.stderr); continue
            y, v, sent, k, how = got
            end = y if ENDP(nm).search(sent) else None   # 找到的这句本身就是卒、罢（「同平章事张文蔚卒」）：那一年就是任满
            for y2, v2, t2 in ([] if end else E):
                if y2 <= y: continue
                if any(ENDP(nm).search(s2) for s2 in re.split(r'[。；]', t2)): end = y2; break
            got_all.append({'name': '郑珏' if nm == '郑玨' else nm, 'seat': pre + '-' + seat, 'from': y, 'to': min(end or y + 4, y1), 'endHow': '明载' if end else '推定', 'vol': v, 'quote': sent, 'key': k, 'how': how})
        for d in got_all:
            later = [e['from'] for e in got_all if e['name'] == d['name'] and e is not d and e['from'] > d['from']]
            if later and min(later) < d['to']: d['to'] = min(later); d['endHow'] = '明载'
        out[pol] = got_all
    return out
if __name__ == '__main__':
    import json
    for pol, L in verify().items():
        for d in L: print(pol, d['from'], d['to'], d['how'], d['name'], d['seat'], d['vol'], d['quote'][:36])
