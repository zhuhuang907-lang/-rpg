# 用法：python3 -I scripts/score_tenure.py <旧表.json> <新表.json>  （拿 zcode 任务八两轮抽查当标尺，看改生成程序后原本对的保住多少、原本错的改对多少）
"""拿 zcode 两轮抽查当标尺：「对」的行（人＋政权确认无误）在新表里还对不对；「错」的行说明里写了正确政权的，新表改对没有。"""
import json, re, subprocess, sys
import pathlib
rep = subprocess.run(['git', '-C', str(pathlib.Path(__file__).resolve().parent.parent), 'show', 'origin/zcode/task-8:中书省/附件/任职年表抽查.md'], capture_output=True, text=True).stdout
POLS = ['后秦', '西秦', '南燕', '北燕', '后燕', '西燕', '南凉', '北凉', '西凉', '后凉', '前燕', '前秦', '前凉', '前赵', '后赵', '成汉', '东魏', '西魏', '北齐', '北周', '北魏', '南齐', '东晋', '西晋', '蜀汉', '后梁', '后唐', '后晋', '后汉', '后周', '南唐', '吴越', '北汉', '南汉', '前蜀', '后蜀', '刘宋', '宋', '梁', '陈', '隋', '唐', '魏', '吴', '汉', '晋', '辽', '闽', '楚', '岐', '齐']
good, fixable = [], []
for line in rep.split('\n'):
    c = [x.strip() for x in line.strip().strip('|').split('|')]
    if len(c) < 7 or not c[0].isdigit(): continue
    y, nm, pol, off, src, verdict, note = int(c[0]), c[1], c[2], c[3], c[4], c[5], c[6]
    if verdict == '对': good.append((y, nm, pol))
    elif verdict == '错':
        m = re.search(r'(?:应为|应记|应是|属|是)(' + '|'.join(POLS) + ')', note)
        if m: fixable.append((y, nm, m.group(1)))
def load(fn):
    F = json.load(open(fn))['figures']; D = {}
    for f in F:
        for p in f['posts']: D.setdefault(f['name'], []).append((p[0], p[1], f['pol']))
    return D
norm = lambda p: {'刘宋': '宋'}.get(p, p)
for fn in sys.argv[1:]:
    D = load(fn)
    def ok(y, nm, pol):
        return any(a - 1 <= y <= b + 1 and norm(q) == norm(pol) for a, b, q in D.get(nm, []))
    g = sum(ok(*r) for r in good); fx = sum(ok(*r) for r in fixable)
    print(fn.split('/')[-1], '原本对的保住', g, '/', len(good), '｜原本错、改对了', fx, '/', len(fixable))
if len(sys.argv) == 3:
    A, B = load(sys.argv[1]), load(sys.argv[2])
    for r in good:
        y, nm, pol = r
        a = any(x - 1 <= y <= z + 1 and norm(q) == norm(pol) for x, z, q in A.get(nm, []))
        b = any(x - 1 <= y <= z + 1 and norm(q) == norm(pol) for x, z, q in B.get(nm, []))
        if a and not b: print('丢了：', y, nm, pol, '新表：', [t for t in B.get(nm, []) if t[0] - 6 <= y <= t[1] + 6])
