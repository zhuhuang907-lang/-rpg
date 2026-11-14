"""公用：项目路径、时间、写文件护栏、运行日志。"""
import json
import os
import pathlib
import datetime

总管目录 = pathlib.Path(__file__).resolve().parent.parent
项目目录 = 总管目录.parent

# 第一期只许写这几处（第十二章第九条：权限由程序把关，不靠模型自觉）
可写目录 = [
    项目目录 / '政事堂' / '案卷',
    项目目录 / '政事堂' / '奏章',
    项目目录 / '政事堂' / '运行日志',
]


class 越权(Exception):
    pass


def 现在():
    return datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def 案号():
    return '案-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S')


def 可写(路径):
    p = pathlib.Path(路径).resolve()
    return any(p == d.resolve() or d.resolve() in p.parents for d in 可写目录)


def 写文件(路径, 内容):
    p = pathlib.Path(路径)
    if not 可写(p):
        raise 越权(f'总管不许写这里：{p}（第一期只许写 政事堂/案卷、政事堂/奏章、政事堂/运行日志）')
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(内容, encoding='utf-8')
    return p


def 记日志(记录):
    """每次运行留一行（第十二章第十条）。只追加，不删。自测时（COURT_TEST=1）不记。"""
    if os.environ.get('COURT_TEST') == '1':
        return
    p = 项目目录 / '政事堂' / '运行日志' / (datetime.date.today().strftime('%Y-%m') + '.jsonl')
    if not 可写(p):
        raise 越权(str(p))
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, 'a', encoding='utf-8') as f:
        f.write(json.dumps({'时间': 现在(), **记录}, ensure_ascii=False) + '\n')


def 读文本(路径, 上限=None):
    t = pathlib.Path(路径).read_text(encoding='utf-8', errors='replace')
    return t if 上限 is None else t[:上限]
