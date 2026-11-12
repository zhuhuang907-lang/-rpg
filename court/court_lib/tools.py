"""给三方用的只读工具。只能读项目里允许的文件；存 Key 的配置、存档、缓存、.git 一律不给（第十二章第九条）。"""
import json
import pathlib
import re
import subprocess
from .util import 项目目录
from . import scan

R = 项目目录.resolve()
禁读 = re.compile(r'(^|/)(\.git|node_modules|saves|cache)(/|$)|adapter-config\.json$|search\.json$|\.qa-pass$|\.env$|config\.json$')


def _安全路径(rel):
    p = (R / str(rel or '.')).resolve()
    if p != R and R not in p.parents:
        raise ValueError('只能读项目里的文件')
    relp = p.relative_to(R).as_posix() if p != R else '.'
    if 禁读.search(relp):
        raise ValueError(f'这个文件不许读：{relp}')
    return p, relp


def read_file(path, start=1, end=200):
    p, relp = _安全路径(path)
    lines = p.read_text(encoding='utf-8', errors='replace').splitlines()
    start = max(1, int(start or 1)); end = min(len(lines), int(end or start + 199), start + 399)
    body = '\n'.join(f'{i}\t{lines[i-1]}' for i in range(start, end + 1))
    return f'{relp} 第{start}-{end}行（共{len(lines)}行）\n{body[:14000]}'


def grep(pattern, path='.'):
    _, relp = _安全路径(path)
    r = subprocess.run(['git', 'grep', '-n', '-I', '-E', '--max-count=20', pattern, '--', relp],
                       cwd=R, capture_output=True, text=True, encoding='utf-8', timeout=60)
    lines = [l for l in r.stdout.splitlines() if not 禁读.search(l.split(':', 1)[0])]
    return '\n'.join(l[:300] for l in lines[:60]) or '（没搜到）'


def list_dir(path='.'):
    p, relp = _安全路径(path)
    items = sorted(x.name + ('/' if x.is_dir() else '') for x in p.iterdir() if not 禁读.search((relp + '/' + x.name).lstrip('./')))
    return f'{relp}：\n' + '\n'.join(items[:200])


def search_corpus(query, books):
    ids = [b for b in (books or []) if re.fullmatch(r'[a-z0-9_]{2,40}', str(b))][:6]
    if not ids:
        return '要给书的 id（见 corpus/books.tsv），例如 ["suishu","zizhitongjian"]'
    js = "require('./core/histlib').search(process.argv[1],JSON.parse(process.argv[2]),5).then(r=>process.stdout.write(JSON.stringify(r))).catch(e=>process.stdout.write(JSON.stringify({err:String(e.message||e)})))"
    r = subprocess.run(['node', '-e', js, str(query)[:200], json.dumps(ids)], cwd=R / 'rpg-kernel',
                       capture_output=True, text=True, encoding='utf-8', timeout=120)
    try:
        hits = json.loads(r.stdout or '[]')
    except Exception:
        return '原文库没查成：' + (r.stderr or r.stdout)[:300]
    if isinstance(hits, dict):
        return '原文库没查成：' + hits.get('err', '')
    return '\n\n'.join(f'《{h.get("name")}》{h.get("volume")}：{h.get("text", "")[:400]}' for h in hits) or '（原文库没查到）'


def ledger_entry(rid):
    for e in scan.台账条目():
        if rid in e['编号']:
            return e['原文'][:6000]
    return f'台账里没有 {rid}'


def recent_commits(n=20):
    log, _ = scan.近来改动()
    return log


工具表 = {
    'read_file': (read_file, '读项目里的一个文本文件的某几行（一次最多 400 行）。', {'path': {'type': 'string', 'description': '相对仓库根目录的路径'}, 'start': {'type': 'integer'}, 'end': {'type': 'integer'}}, ['path']),
    'grep': (grep, '在项目里按正则搜代码或文档，返回「文件:行号:内容」。', {'pattern': {'type': 'string'}, 'path': {'type': 'string', 'description': '限定目录或文件，默认整个仓库'}}, ['pattern']),
    'list_dir': (list_dir, '列出一个目录下的文件。', {'path': {'type': 'string'}}, ['path']),
    'search_corpus': (search_corpus, '查游戏自带的史书原文库（正史、实录、通鉴、政书……），返回书名卷名和原文。', {'query': {'type': 'string', 'description': '检索词，可多个用空格隔开'}, 'books': {'type': 'array', 'items': {'type': 'string'}, 'description': '书的 id，见 corpus/books.tsv'}}, ['query', 'books']),
    'ledger_entry': (ledger_entry, '取需求台账里一条需求的原文（玩家原话、验收、状态）。', {'rid': {'type': 'string', 'description': '如 R-158'}}, ['rid']),
    'recent_commits': (recent_commits, '最近的提交记录。', {'n': {'type': 'integer'}}, []),
}


def 执行(name, args):
    f = 工具表.get(name)
    if not f:
        return f'没有这个工具：{name}', True
    try:
        return str(f[0](**(args or {}))), False
    except Exception as e:
        return f'工具出错：{e}', True


def anthropic格式():
    return [{'name': n, 'description': d, 'input_schema': {'type': 'object', 'properties': p, 'required': req}} for n, (_, d, p, req) in 工具表.items()]


def openai格式():
    return [{'type': 'function', 'function': {'name': n, 'description': d, 'parameters': {'type': 'object', 'properties': p, 'required': req}}} for n, (_, d, p, req) in 工具表.items()]
