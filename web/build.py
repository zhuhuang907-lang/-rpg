# 把真实农历月表嵌进网页，生成可发布的 index.html
import json, pathlib
here = pathlib.Path(__file__).parent
cal = json.load(open(here.parent / 'rpg-kernel/data/calendar.json', encoding='utf8'))['years']
compact = json.dumps([[y, lens, leap] for y, _jd, lens, leap in cal], separators=(',', ':'))
src = (here / 'game.src.html').read_text(encoding='utf8')
(here / 'index.html').write_text(src.replace('__CAL__', compact), encoding='utf8')
print('ok', len(src), len(compact))
