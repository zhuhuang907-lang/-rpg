"""只读巡检（吏房、工部、刑部的活）：不调模型、不花钱，先由程序把能查的硬毛病查出来，交给三方去议。
每条发现：{'类','题','证据'(列表),'需求'(R 编号列表),'轻重'(1 轻 ~ 3 重)}"""
import json
import re
import subprocess
from .util import 项目目录, 读文本

R = 项目目录


def _git(*args):
    try:
        return subprocess.run(['git', *args], cwd=R, capture_output=True, text=True, encoding='utf-8', timeout=60).stdout
    except Exception:
        return ''


def 台账条目():
    t = 读文本(R / 'REQUIREMENTS.md')
    parts = re.split(r'(?m)^(?=### R-)', t)
    out = []
    for p in parts:
        if not p.startswith('### R-'):
            continue
        head = p.split('\n', 1)[0]
        m = re.match(r'### (R-\d+)(?:[～~-]R-(\d+))?\s*(.*)', head)
        ids = [m.group(1)] if m else []
        if m and m.group(2):
            a, b = int(m.group(1)[2:]), int(m.group(2))
            ids = [f'R-{i}' for i in range(a, b + 1)]
        st = re.search(r'(?m)^- 状态：(.*)$', p)
        auto = re.search(r'(?m)^- 自动验收：(.*)$', p)
        out.append({'编号': ids, '标题': (m.group(3) if m else head)[:60], '状态': st.group(1) if st else '', '自动验收': auto.group(1) if auto else '', '原文': p})
    return out


def 查台账():
    found = []
    tests = set(p.name for p in (R / 'web' / 'tests').rglob('*.js'))
    for e in 台账条目():
        rid = '、'.join(e['编号'][:3]) + ('…' if len(e['编号']) > 3 else '')
        if re.search(r'未做|在做|部分|待做|没做', e['状态']):
            found.append({'类': '需求未完成', '题': f'{rid} {e["标题"]}：状态写着「{e["状态"][:40]}」', '证据': [f'REQUIREMENTS.md 中 {rid} 的状态栏'], '需求': e['编号'], '轻重': 2})
        names = set(re.findall(r'([a-z0-9_]+\.js)', e['自动验收']))
        missing = [n for n in names if n not in tests]
        if missing:
            found.append({'类': '测试缺失', '题': f'{rid} 自动验收写的测试文件找不到：{"、".join(missing)}', '证据': [f'REQUIREMENTS.md {rid} 自动验收栏', 'web/tests 下无此文件'], '需求': e['编号'], '轻重': 2})
    return found


def 查现状与台账():
    st = 读文本(R / 'STATUS.md')
    led = set(i for e in 台账条目() for i in e['编号'])
    men = set(re.findall(r'R-(\d{3})', st))
    lost = sorted(f'R-{n}' for n in men if f'R-{n}' not in led)
    if lost:
        return [{'类': '现状与台账不符', '题': f'STATUS.md 提到但台账里没有的需求：{"、".join(lost[:10])}', '证据': ['STATUS.md', 'REQUIREMENTS.md'], '需求': lost, '轻重': 1}]
    return []


def 查测试接线():
    qa = 读文本(R / 'web' / 'tests' / 'qa.sh')
    files = sorted(p.name for p in (R / 'web' / 'tests' / 'qa').glob('*.js'))
    helpers = {'ai.js', 'citesrv.js', 'glmsrv.js', 'jsmapsrv.js'}
    orphan = [f for f in files if f not in qa and f not in helpers and not re.search(r'srv|mock|ai\d*\.js$', f)]
    used = set(re.findall(r'node ([a-z0-9_]+\.js)', qa))
    gone = [f for f in used if f not in files and not (R / 'web' / 'tests' / f).exists() and not (R / 'rpg-kernel' / f).exists()]
    out = []
    if orphan:
        out.append({'类': '测试没接上', '题': f'这些测试文件没写进完整测试（qa.sh），永远不会跑：{"、".join(orphan[:12])}', '证据': ['web/tests/qa.sh', 'web/tests/qa/'], '需求': [], '轻重': 2})
    if gone:
        out.append({'类': '测试缺失', '题': f'完整测试要跑的文件不存在：{"、".join(gone)}', '证据': ['web/tests/qa.sh'], '需求': [], '轻重': 3})
    return out


def 查三版同步():
    try:
        b = json.loads(读文本(R / 'rpg-kernel' / 'public' / 'version.json'))['build']
    except Exception as e:
        return [{'类': '构建', '题': f'读不到构建号：{e}', '证据': ['rpg-kernel/public/version.json'], '需求': [], '轻重': 2}]
    bad = [f for f in ('web/index.html', 'web/play.html', 'rpg-kernel/public/index.html') if b not in 读文本(R / f)]
    if bad:
        return [{'类': '构建', '题': f'三个版本不是同一次构建：{"、".join(bad)} 不含构建号 {b}', '证据': bad, '需求': [], '轻重': 3}]
    return []


KEY_RE = re.compile(r'sk-[A-Za-z0-9]{24,}|sk-ant-[A-Za-z0-9_-]{20,}|\b[0-9a-f]{32}\.[A-Za-z0-9]{16}\b')
禁入 = ['rpg-kernel/data/adapter-config.json', 'rpg-kernel/data/search.json']


def 查安全():
    out = []
    tracked = _git('ls-files').splitlines()
    for f in 禁入:
        if f in tracked:
            out.append({'类': '安全', '题': f'存 Key 的文件被提交进了仓库：{f}', '证据': [f], '需求': [], '轻重': 3})
    sv = [f for f in tracked if '/saves/' in f or f.endswith('.sav')]
    if sv:
        out.append({'类': '安全', '题': f'玩家存档被提交进了仓库：{"、".join(sv[:5])}', '证据': sv[:5], '需求': [], '轻重': 3})
    hits = []
    for f in tracked:
        if not re.search(r'\.(js|html|json|md|py|sh|txt|yml|yaml)$', f) or f.startswith('corpus/'):
            continue
        p = R / f
        try:
            if p.stat().st_size > 3_000_000:
                continue
            if KEY_RE.search(p.read_text(encoding='utf-8', errors='ignore')):
                hits.append(f)
        except Exception:
            pass
    if hits:
        out.append({'类': '安全', '题': f'这些文件里有像 API Key 的字串：{"、".join(hits[:8])}', '证据': hits[:8], '需求': [], '轻重': 3})
    return out


def 近来改动(自从=None):
    rng = f'{自从}..HEAD' if 自从 else '-n15'
    log = _git('log', '--format=%h %s', rng) if 自从 else _git('log', '--format=%h %s', '-n', '15')
    files = _git('diff', '--stat', f'{自从}..HEAD') if 自从 else ''
    return log.strip(), files.strip()


def 全部():
    out = []
    for f in (查台账, 查现状与台账, 查测试接线, 查三版同步, 查安全):
        try:
            out += f()
        except Exception as e:
            out.append({'类': '巡检出错', '题': f'{f.__name__} 没跑成：{e}', '证据': [], '需求': [], '轻重': 1})
    out.sort(key=lambda x: -x['轻重'])
    return out
