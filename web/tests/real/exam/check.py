# 真玩考卷对账：读每回存下的 st<回>.json，查账和正文对不对得上（python3 -I check.py 目录）
import json, sys, glob, os, re
d0 = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('EXAM_DIR', '/tmp/rpg-exam')
bad = []
prev = None
for f in sorted(glob.glob(os.path.join(d0, 'st*.json')), key=lambda x: int(re.sub(r'\D', '', os.path.basename(x)) or 0)):
    try: d = json.load(open(f))
    except Exception: continue
    t = d.get('turn')
    for h in d.get('hc') or []: bad.append(f'第{t}回 体检：{h}')
    camps = [c for c in (d.get('camps') or []) if re.search('待发|行军|围城', c.get('state') or '')]
    seen = {}
    for c in camps:
        if c['force'] in seen: bad.append(f"第{t}回 {c['force']}同时有两条行军单")
        seen[c['force']] = c
    for fz in d.get('forces') or []:
        c = seen.get(fz.get('name'))
        if c and c.get('state') == '行军' and fz.get('status') not in ('行军', None, ''): bad.append(f"第{t}回 {fz['name']}在途，账上状态却是「{fz.get('status')}」")
    org = {p[0]: p[1] for n, ps in d.get('org') or [] for p in ps}
    for title, who in org.items():
        if who and (d.get('people') or {}).get(who, {}).get('dead'): bad.append(f'第{t}回 已故的{who}还挂在{title}上')
    if prev:
        ck = lambda x: (x['clock']['y'], x['clock']['m'], x['clock']['d'], x['clock'].get('h') or 0)
        if ck(d) < ck(prev): bad.append(f'第{t}回 日子倒退：{prev.get("when")} → {d.get("when")}')
    prev = d
print('\n'.join(bad) if bad else '对账全过')
sys.exit(1 if bad else 0)
