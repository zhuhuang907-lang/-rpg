#!/usr/bin/env python3
"""总计划进度核对（R-230）：每小时巡查跑一次，把数抄进 中书省/总计划/进度表.md。
只读、不联网、不调模型。用法：python3 scripts/plan_metrics.py [--json]
缺的文件照零算，不报错（数据多在预备分支，发布分支上可能还没有）。"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
PERIODS = [('wudai', '五代十国'), ('sanguo', '汉末三国'), ('jin16', '两晋十六国'), ('nanbei', '南北朝'), ('tangmo', '唐末')]
WUDAI = ['后梁', '后唐', '后晋', '后汉', '后周', '吴', '南唐', '吴越', '前蜀', '后蜀', '楚', '闽', '南汉', '荆南', '北汉',
         '岐', '燕', '赵', '定难军', '归义军', '契丹']
THICK = ['后梁', '后唐', '后晋', '后汉', '后周', '南唐', '吴越', '前蜀', '后蜀']


def read(path):
    try:
        with open(path, encoding='utf-8') as f:
            return f.read()
    except OSError:
        return ''


def load(path):
    try:
        return json.loads(read(path))
    except ValueError:
        return None


def source():
    s = read(P('web', 'game.src.html'))
    return {'模型调用点': len(re.findall(r'callClaude\w*\(', s)) - len(re.findall(r'function callClaude\w*\(', s)),
            '源码行数': s.count('\n'), '函数个数': len(re.findall(r'\n(?:async )?function ', s))}


def ledger():
    st = re.findall(r'^- 状态：(.*)$', read(P('REQUIREMENTS.md')), re.M)
    seen = [x for x in st if '已验证' in x and '未验证' not in x]
    return {'台账条数': len(st), '项目主人验过': len(seen), '写着未验证': sum('未验证' in x for x in st)}


def court():
    d = load(P('web', 'court', 'wudai.json')) or {}
    pols = {p.get('name'): p for p in d.get('polities', [])}
    people = d.get('people', [])
    out = {'五代十国政权（共21）': sum(n in pols for n in WUDAI), '缺的政权': [n for n in WUDAI if n not in pols],
           '人数': len(people), '关系条数': sum(len(p.get('ties') or []) for p in people), '各国': {}}
    for n, p in pols.items():
        posts = [x for q in people for x in q.get('posts', []) if x.get('polity') == n]
        yrs = [y for x in posts for y in (x.get('from'), x.get('to')) if isinstance(y, int)]
        best = 0
        if yrs:
            for y in range(min(yrs), max(yrs) + 1):
                best = max(best, len({q['name'] for q in people for x in q.get('posts', [])
                                      if x.get('polity') == n and x.get('from', 0) <= y <= x.get('to', 0)}))
        out['各国'][n] = {'位子': len(p.get('seats', [])), '任职条数': len(posts), '最多一年在任': best,
                        '厚的够六十人': (best >= 60) if n in THICK else None}
    return out


def roles():
    """时代世情库（R-232）：只数条数和有没有出处，不设固定的几条线。"""
    out = {}
    for key, name in PERIODS:
        d = load(P('web', 'roles', key + '.json')) or {}
        ways = d.get('ways', [])
        good = [w for w in ways if w.get('name') and w.get('what') and w.get('src') and len(w.get('happens') or []) >= 8
                and all(x.get('src') for k in ('become', 'doing') for x in (w.get(k) or []))]
        out[name] = {'活法条数': len(ways), '合格条数': len(good), '类别数': len({w.get('kind') for w in ways if w.get('kind')}),
                     '够八十条': len(good) >= 80}
    return out


def plays():
    fs = sorted(os.path.basename(f) for f in glob.glob(P('中书省', '附件', '实玩', '*.md')))
    return {'真模型实玩记录': len(fs), '文件': fs}


def gates():
    """进度表里写「过」的格子，同一行必须有凭据（检查输出、实玩记录文件名或项目主人原话）。"""
    bad = []
    for ln in read(P('中书省', '总计划', '进度表.md')).splitlines():
        c = [x.strip() for x in ln.strip().strip('|').split('|')]
        if len(c) >= 4 and c[2] == '过' and len(c[3]) < 6:
            bad.append(c[0] + '｜' + c[1])
    return {'写了过却没凭据的格子': bad}


def main():
    r = {'源码': source(), '台账': ledger(), '朝廷数据': court(), '时代世情库': roles(), '实玩': plays(), '门槛': gates()}
    if '--json' in sys.argv:
        print(json.dumps(r, ensure_ascii=False, indent=1)); return
    for k, v in r.items():
        print('【' + k + '】')
        for a, b in v.items():
            if isinstance(b, dict) and all(isinstance(y, dict) for y in b.values()):
                for x, y in b.items():
                    print('  ' + str(x) + '：' + json.dumps(y, ensure_ascii=False))
            else:
                print('  ' + a + '：' + json.dumps(b, ensure_ascii=False))
    if r['门槛']['写了过却没凭据的格子']:
        sys.exit(1)


if __name__ == '__main__':
    main()
