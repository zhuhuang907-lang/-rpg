#!/usr/bin/env python3
"""政事堂总管：在你电脑上调度 Claude、DeepSeek、GLM 巡检、议事、写奏章。第一期只读——不改源码、不提交游戏代码。

用法（在仓库根目录运行）：
  python court/总管.py 自检                 看三位大臣谁在朝（不花钱）
  python court/总管.py 巡检                 日常巡检：程序先查硬毛病，三方议事，写奏章
  python court/总管.py 巡检 --深            深度议事：多查历史资料、架构、长期问题
  python court/总管.py 议 "题目"            开朝议事：就一件事三方完整讨论
  python court/总管.py 考据 "题目"          历史考据：专查史料
  python court/总管.py 会审 <分支>          代码会审：审 glm/… 或 ds/… 分支的改动
  python court/总管.py 奏章                 看待批的奏章
  python court/总管.py 批 <奏章号> 准|驳|重议 "批语"
  python court/总管.py 上报                 把案卷、奏章、运行日志推到 court/records 分支，给 Claude 看
"""
import argparse
import pathlib
import shutil
import subprocess
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from court_lib import scan  # noqa: E402
from court_lib.util import 项目目录, 写文件, 记日志, 现在, 案号, 读文本  # noqa: E402
from court_lib.config import 读配置  # noqa: E402

奏章目录 = 项目目录 / '政事堂' / '奏章'


def _巡检案(深):
    found = scan.全部()
    log, _ = scan.近来改动()
    lines = [f'## 程序巡检查出的问题（{len(found)} 条，按轻重排）']
    for i, f in enumerate(found, 1):
        lines.append(f'{i}. 〔{f["类"]}·{"轻中重"[f["轻重"]-1]}〕{f["题"]}；证据：{"、".join(f["证据"]) or "—"}；需求：{"、".join(f["需求"][:5]) or "—"}')
    lines += ['', '## 最近的提交', log or '（无）', '',
              '## 请议',
              '1. 上面每一条是不是真问题（用工具核实，程序可能误报）？',
              '2. 程序没查出、但你们巡查发现的问题（需求台账里玩家要求过却没落实的、默认开局是否仍是史书真人主角、按钮有没有真点测试……）。',
              '3. 哪几件值得请项目主人拍板，各自怎么改、改哪些文件、怎么测。']
    if 深:
        lines += ['4. 本次是深度议事：另查一段年代的史料完整性（原文库对照内置史料）、架构与性能的长期问题、外部依赖（接口、库）有没有要跟进的变化。']
    return {'案号': 案号(), '类型': '深度议事' if 深 else '日常巡检', '题目': '深度议事' if 深 else '日常巡检', '案情': '\n'.join(lines)}


def _议(题, 类型='开朝议事', 附=''):
    return {'案号': 案号(), '类型': 类型, '题目': 题, '案情': f'## 议题\n{题}\n\n{附}'.strip()}


def _会审案(分支):
    base = 'origin/claude/gallant-davinci-l8pni0'
    subprocess.run(['git', 'fetch', '-q', 'origin'], cwd=项目目录)
    stat = subprocess.run(['git', 'diff', '--stat', f'{base}...origin/{分支}'], cwd=项目目录, capture_output=True, text=True, encoding='utf-8').stdout
    diff = subprocess.run(['git', 'diff', f'{base}...origin/{分支}'], cwd=项目目录, capture_output=True, text=True, encoding='utf-8').stdout
    附 = f'## 分支 {分支} 相对主开发分支的改动\n```\n{stat}\n```\n\n## 改动内容（过长已截断，可用工具读文件看全）\n```diff\n{diff[:20000]}\n```\n\n请照 skills/交叉审查/SKILL.md 的清单审：做到没有、守没守规矩、测试够不够。'
    return _议(f'代码会审：{分支}', '代码会审', 附)


def 列奏章():
    d = 奏章目录 / '待批'
    fs = sorted(d.glob('*.md')) if d.exists() else []
    if not fs:
        print('没有待批的奏章。')
    for f in fs:
        head = 读文本(f).splitlines()[0]
        print(f'· {f.stem}　{head.replace("# 奏章 ", "")}')


def 批(号, 决, 语):
    映 = {'准': '已准', '驳': '已驳', '重议': '重议'}
    if 决 not in 映:
        sys.exit('批示只能是：准、驳、重议')
    src = 奏章目录 / '待批' / f'{号}.md'
    if not src.exists():
        sys.exit(f'找不到待批的奏章：{号}')
    t = 读文本(src).replace('> 状态：**待御批**', f'> 状态：**{映[决]}**（{现在()}）')
    t = t.replace('- 批示：\n- 批语：', f'- 批示：{决}\n- 批语：{语 or "（无）"}\n- 批于：{现在()}')
    写文件(奏章目录 / 映[决] / f'{号}.md', t)
    src.unlink()
    记日志({'御批': 号, '批示': 决, '批语': 语})
    print(f'已批：{号} → {决}。' + ('下一步：对 Claude 说「照御批办 ' + 号 + '」，它会在中书省发命令、派 GLM/DS 去做、交叉检查、跑完整测试，做完告诉你。' if 决 == '准' else ''))


def 上报():
    """只把政事堂的案卷、奏章、运行日志推到 court/records 分支（不碰游戏代码、不碰发布分支）。"""
    分支 = 'court/records'
    src = 项目目录 / '政事堂'
    with tempfile.TemporaryDirectory() as tmp:
        wt = pathlib.Path(tmp) / 'wt'
        run = lambda *a, cwd=项目目录: subprocess.run(['git', *a], cwd=cwd, capture_output=True, text=True, encoding='utf-8')
        run('fetch', '-q', 'origin')
        has = run('ls-remote', '--exit-code', '--heads', 'origin', 分支).returncode == 0
        r = run('worktree', 'add', '-f', '-B', 分支, str(wt), f'origin/{分支}' if has else 'origin/claude/gallant-davinci-l8pni0')
        if r.returncode:
            sys.exit('建不了工作区：' + r.stderr)
        try:
            for sub in ('案卷', '奏章', '运行日志'):
                if (src / sub).exists():
                    shutil.copytree(src / sub, wt / '政事堂' / sub, dirs_exist_ok=True)
            run('add', '政事堂/案卷', '政事堂/奏章', '政事堂/运行日志', cwd=wt)
            if not run('status', '--porcelain', cwd=wt).stdout.strip():
                print('没有新的案卷要上报。')
                return
            c = run('commit', '-m', f'政事堂上报 {现在()}', cwd=wt)
            if c.returncode:
                sys.exit('提交被拦下：\n' + c.stdout + c.stderr)
            p = run('push', 'origin', f'{分支}:{分支}', cwd=wt)
            print('已上报到 court/records 分支。' if not p.returncode else '推送失败：' + p.stderr)
        finally:
            run('worktree', 'remove', '--force', str(wt))


def 自检():
    from court_lib.agents import 召见, 账房, 缺席
    cfg = 读配置()
    for 官 in ('皇帝', '中书令', '门下侍中'):
        try:
            m = 召见(官, cfg[官], cfg['限额'], 账房(0))
            print(f'· {官}（{cfg[官]["提供方"]}）：在朝{"（型号未填，开议时自动取）" if not cfg[官].get("型号") else "，型号 " + cfg[官]["型号"]}')
        except 缺席 as e:
            print(f'· {官}（{cfg[官]["提供方"]}）：缺席——{e}')
    print(f'· 程序巡检：查出 {len(scan.全部())} 条（不花钱）')


def main():
    ap = argparse.ArgumentParser(description='政事堂总管')
    sp = ap.add_subparsers(dest='cmd', required=True)
    sp.add_parser('自检')
    x = sp.add_parser('巡检'); x.add_argument('--深', action='store_true')
    for n in ('议', '考据'):
        y = sp.add_parser(n); y.add_argument('题')
    z = sp.add_parser('会审'); z.add_argument('分支')
    sp.add_parser('奏章')
    b = sp.add_parser('批'); b.add_argument('号'); b.add_argument('决'); b.add_argument('语', nargs='?', default='')
    sp.add_parser('上报')
    a = ap.parse_args()
    if a.cmd == '自检':
        return 自检()
    if a.cmd == '奏章':
        return 列奏章()
    if a.cmd == '批':
        return 批(a.号, a.决, a.语)
    if a.cmd == '上报':
        return 上报()
    from court_lib.council import 议事
    if a.cmd == '巡检':
        案 = _巡检案(a.深)
    elif a.cmd == '议':
        案 = _议(a.题)
    elif a.cmd == '考据':
        案 = _议(a.题, '历史考据', '这是历史考据：每条结论都要给史料来源（原文库书名卷名，或网页出处与日期）、时间范围、可信程度；来源互相冲突的照实并列，不擅自选一个当定论；说明是否影响游戏现有设定（内置史料 web/history、制度库 web/inst）。')
    else:
        案 = _会审案(a.分支)
    议事(案).开议()


if __name__ == '__main__':
    main()
