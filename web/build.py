# 把真实农历月表嵌进网页，生成两份同样的页面：
#   web/index.html                 —— 发布到 claude.ai（用浏览者自己的 Claude）
#   rpg-kernel/public/index.html   —— 桌面版游戏的主页面（用玩家自己的 DeepSeek Key，存档在本机）
import json, pathlib
here = pathlib.Path(__file__).parent
cal = json.load(open(here.parent / 'rpg-kernel/data/calendar.json', encoding='utf8'))['years']
compact = json.dumps([[y, lens, leap] for y, _jd, lens, leap in cal], separators=(',', ':'))
body = (here / 'game.src.html').read_text(encoding='utf8').replace('__CAL__', compact)
(here / 'index.html').write_text(body, encoding='utf8')
# 桌面版由本机服务直接发出，需要自己的文档外壳
page = ('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + body + '</body></html>')
(here.parent / 'rpg-kernel/public/index.html').write_text(page, encoding='utf8')
print('ok', len(body))
