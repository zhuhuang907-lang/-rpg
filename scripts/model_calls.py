"""任务十一：列出游戏源码里每一处模型调用（callClaude…），在哪个函数、那一行提示词开头说了什么，按用途粗分四类：
听懂玩家、写文字、演对方、其余（查资料、整表、核查……这一类是要逐步换成表和规矩的）。
用法：python3 -I scripts/model_calls.py > 中书省/附件/模型调用清单.md"""
import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
s = (ROOT / 'web' / 'game.src.html').read_text(encoding='utf8')
lines = s.split('\n')
fn_at = []
for i, l in enumerate(lines):
    m = re.match(r'\s*(?:async\s+)?function\s+([\w$]+)', l)
    if m: fn_at.append((i, m.group(1)))
def fn_of(i):
    name = ''
    for j, n in fn_at:
        if j > i: break
        name = n
    return name
RULES = [
    ('听懂玩家', r'玩家(这一步|说的|写的|的话)|理解玩家|意图|要做什么|输入框|解析|识别'),
    ('写文字', r'正文|写一段|场面|叙事|旁白|文笔|润色|改写|叙述|小说|奏章|奏疏|书信|檄文|诗'),
    ('演对方', r'扮演|你是[^，。]{0,12}(本人|这个人)|答话|回话|对话|应对|召见|问对|谈判|交涉|回信'),
]
FN = [('听懂玩家', r'(?i)intent|parse|said|lookup|plan[A-Z]|readAct|understand|classify|route'),
      ('写文字', r'(?i)^send$|narr|draft|rewrite|write|story|scene|letter|memo|book|poem|reply|prose|turnDS|gmTurn|opening'),
      ('演对方', r'(?i)talk|parley|chat|npc|meet|audience|negot|ask[A-Z]|envoy|dialog')]
def kind(fn, prompt):
    for k, rx in FN:
        if re.search(rx, fn): return k
    t = fn + ' ' + prompt
    for k, rx in RULES:
        if re.search(rx, t): return k
    return '其余'
WAY = {'其余': '换成开发时整理的表（任职年表、朝廷数据、世情库、世事库）或程序规则；查证类只留做体检'}
rows = []
for i, l in enumerate(lines):
    for m in re.finditer(r'callClaude\w*\(', l):
        if re.search(r'function\s+callClaude\w*\(', l[max(0, m.start() - 16):m.end()]): continue
        tail = l[m.end():m.end() + 200]
        if not tail.strip() or tail.strip().startswith(')'): tail = ' '.join(lines[i + 1:i + 3])[:200]
        p = re.sub(r'\$\{[^}]*\}', '…', tail)
        p = re.sub(r'[`\'"]', '', p).strip()[:60]
        fn = fn_of(i)
        rows.append((i + 1, fn, kind(fn, tail), p))
from collections import Counter
c = Counter(r[2] for r in rows)
print('# 模型调用清单（任务十一，R-225 第 4 条、R-230）\n')
print(f'程序生成（`scripts/model_calls.py`），共 **{len(rows)}** 处，和进度核对的「模型调用点」同一个数法。分类是照函数名和提示词开头粗分的，打算一栏只对「其余」写；逐行细定、换掉一处划掉一处，见各里程碑。\n')
print('| 类别 | 处数 |\n|---|---|')
for k in ('听懂玩家', '写文字', '演对方', '其余'): print(f'| {k} | {c.get(k, 0)} |')
print('\n| 行 | 函数 | 类别 | 提示词开头 | 打算 |\n|---|---|---|---|---|')
for ln, fn, k, p in rows:
    print(f'| {ln} | {fn} | {k} | {p.replace("|", "／")} | {WAY.get(k, "留着")} |')
