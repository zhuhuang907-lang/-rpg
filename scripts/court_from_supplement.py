"""把 zcode 整理的宰执逐年数据接进游戏（R-244、任务三十三、三十四）：scripts/court_supplement/{song,tanghou}.json → web/tenure/{song,tanghou}-zaifu.json（任职年表格式）。
不进 web/court/：那里有一份就整棵朝廷树照它搭，宋、唐后期只有宰执两类位子，会把整套官制挤掉。走任职年表：官制树照旧，到了年份把真人坐上对得上的宰相、执政位子。
用法：python3 -I scripts/court_from_supplement.py"""
import json, os, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda p: json.load(open(os.path.join(R, p), encoding='utf8'))
def conv(src, out, title, pol_default):
    d = J('scripts/court_supplement/' + src + '.json'); figs = []
    for p in d['people']:
        posts = [[q['from'], q['to'], re.sub(r'（[^）]*）', '', q['office'])] for q in p.get('posts', []) if q.get('from') is not None]
        if not posts: continue
        pol = (p.get('posts') or [{}])[0].get('polity') or pol_default
        figs.append({'name': p['name'], 'pol': pol, 'born': p.get('born'), 'died': p.get('died'), 'posts': posts, 'how': [[q['from'], q['to'], q.get('how') or '推定'] for q in p['posts'] if q.get('from') is not None], 'src': p.get('src') or ''})
    doc = {'id': out, 'title': title, 'range': d['range'], 'polity': '' if src == 'song' else pol_default, 'source': d.get('source') or d.get('note') or '', 'figures': figs}
    json.dump(doc, open(os.path.join(R, 'web/tenure', out + '.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(out, len(figs), '人', sum(len(f['posts']) for f in figs), '条任职')
conv('song', 'song-zaifu', '两宋宰执逐年（宋史·宰辅表）', '北宋')
conv('tanghou', 'tanghou-zaifu', '唐后期宰相逐年（资治通鉴）', '唐')
