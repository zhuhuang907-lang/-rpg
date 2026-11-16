# -*- coding: utf-8 -*-
"""拉取外部中古史全文库 cn-history-220-979（公元 220—979）。

正文 76 MB，不进本仓库；默认拉到本仓库同级目录，其它档克隆本仓库后跑一次即可。
用法：
    python scripts/fetch_history_corpus.py                 # 首次 clone / 之后 pull
    python scripts/fetch_history_corpus.py --dir D:\\corpus # 指定目录
"""
import argparse
import subprocess
import sys
from pathlib import Path

URL = 'https://github.com/zhuhuang907-lang/cn-history-220-979.git'
DEFAULT_NAME = 'cn-history-220-979'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', default='')
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    target = Path(args.dir).expanduser().resolve() if args.dir else (repo_root.parent / DEFAULT_NAME)

    if (target / '.git').is_dir():
        print(f'已存在，拉取更新：{target}')
        subprocess.run(['git', '-C', str(target), 'pull', '--ff-only'], check=False)
    else:
        print(f'克隆到：{target}')
        subprocess.run(['git', 'clone', '--depth', '1', URL, str(target)], check=False)

    if not (target / 'texts').is_dir():
        print('克隆失败或目录不对，请检查网络后重试。', file=sys.stderr)
        return 1

    books = sorted(p.name for p in (target / 'texts').iterdir() if p.is_dir())
    print(f'书 {len(books)} 部：' + '、'.join(books[:12]) + ('…' if len(books) > 12 else ''))
    print('建索引：python ' + str(target / 'scripts' / 'build_index.py'))
    print('检索：  python ' + str(target / 'scripts' / 'search.py') + ' 玄武门')
    return 0


if __name__ == '__main__':
    sys.exit(main())
