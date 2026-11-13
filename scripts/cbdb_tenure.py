"""从哈佛中国历代人物传记资料库（CBDB，非商业用途）整理一段年代的任职年表，写成内置史料格式（web/history/*.json）。
用法：python3 -I scripts/cbdb_tenure.py <cbdb.sqlite3> <起年> <止年> <id> <标题> <输出.json> <政权> [朝代码,逗号分隔]
输出放 web/tenure/，游戏排朝堂、官员名册时照这张表先坐位子（任务六，R-225）
原库不进仓库（开发时下载、只读）。手工整理的内置史料里已有的人不重复收（手工的为准）。"""
import sqlite3, json, sys, pathlib
from opencc import OpenCC
db, y0, y1, hid, title, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5], sys.argv[6]
pol = sys.argv[7]
dys = set(int(x) for x in sys.argv[8].split(',')) if len(sys.argv) > 8 else None
cc = OpenCC('t2s'); S = lambda t: cc.convert(t or '')
c = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
here = pathlib.Path(__file__).resolve().parent.parent / 'web' / 'history'
known = set()
for f in here.glob('*.json'):
    if f.stem == hid: continue
    h = json.load(open(f, encoding='utf8'))
    if h.get('range') and h['range'][0] <= y1 and h['range'][1] >= y0:
        known |= {x['name'] for x in h.get('figures') or []}
rows = c.execute("""select p.c_personid, p.c_posting_id, p.c_firstyear, p.c_lastyear, p.c_dy, o.c_office_chn,
  (select group_concat(a.c_name_chn, '、') from POSTED_TO_ADDR_DATA pa join ADDR_CODES a on a.c_addr_id = pa.c_addr_id where pa.c_posting_id = p.c_posting_id and pa.c_office_id = p.c_office_id)
  from POSTED_TO_OFFICE_DATA p join OFFICE_CODES o on o.c_office_id = p.c_office_id
  where p.c_firstyear between ? and ? order by p.c_personid, p.c_firstyear, p.c_sequence""", (y0 - 15, y1)).fetchall()
by = {}
for pid, post, fy, ly, dy, off, addr in rows:
    if dys and dy not in dys and dy not in (0, None): continue
    if not off or off in ('[未詳]', '未詳'): continue
    by.setdefault(pid, []).append([fy, ly, S(off), S(addr or '')])
figs = []
for pid, P in by.items():
    m = c.execute("select c_name_chn, c_birthyear, c_deathyear, c_index_addr_id, c_fl_latest_year from BIOG_MAIN where c_personid = ?", (pid,)).fetchone()
    if not m or not m[0]: continue
    name = S(m[0]); born = m[1] or None; died = m[2] or None
    if name in known or len(name) < 2 or len(name) > 5 or '某' in name or '氏' == name[-1]: continue
    nat = c.execute("select c_name_chn from ADDR_CODES where c_addr_id = ?", (m[3],)).fetchone() if m[3] else None
    posts = []
    for i, (fy, ly, off, addr) in enumerate(P):
        nxt = next((q[0] for q in P[i + 1:] if q[0] > fy), None)
        end = ly if ly and ly >= fy else (nxt if nxt else fy + 3)
        if died: end = min(end, died)
        if end < y0 or fy > y1: continue
        place = addr.split('、')[0] if addr else ''
        t = place if place and (place.endswith(off) or (len(off) >= 2 and off in place)) else (place + off) if place and place not in off and len(place) <= 6 else off
        posts.append([fy, max(fy, end), t])
    if not posts: continue
    if died and died < y0: continue
    figs.append({'name': name, 'born': born, 'died': died, 'native': S(nat[0]) if nat else '', 'posts': posts, 'src': 'CBDB'})
figs.sort(key=lambda f: (f['posts'][0][0], f['name']))
res = {'id': hid, 'title': title, 'range': [y0, y1], 'polity': pol, 'source': '哈佛中国历代人物传记资料库（CBDB），非商业用途；简体由程序转换', 'figures': figs}
json.dump(res, open(out, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(len(figs), '人', sum(len(f['posts']) for f in figs), '条任职', 'skip known', len(known))
