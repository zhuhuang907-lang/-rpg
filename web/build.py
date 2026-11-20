# 把真实农历月表嵌进网页，生成两份同样的页面：
#   web/index.html                 —— 发布到 claude.ai（用浏览者自己的 Claude）
#   rpg-kernel/public/index.html   —— 桌面版游戏的主页面（用玩家自己的 DeepSeek Key，存档在本机）
import json, pathlib, os, sys
# 完整测试（qa.sh）跑着的时候不许重新构建：测到一半页面被换掉，结果就作废了（qa.sh 自己开头那次构建在上锁之前）
try:
    _pid = int(open('/tmp/rpg-qa.lock').read().strip() or 0)
    if _pid and _pid != os.getppid():
        os.kill(_pid, 0)
        print('完整测试（qa.sh，进程 %d）正在跑，不许重新构建；等它跑完或先停掉它' % _pid); sys.exit(2)
except (FileNotFoundError, ValueError, ProcessLookupError, PermissionError):
    pass
here = pathlib.Path(__file__).parent
cal = json.load(open(here.parent / 'rpg-kernel/data/calendar.json', encoding='utf8'))['years']
compact = json.dumps([[y, lens, leap] for y, _jd, lens, leap in cal], separators=(',', ':'))
# 内置史料：web/history/*.json（史事、君主年号、真人生卒官职）
hist = []
for f in sorted((here / 'history').glob('*.json')):
    if f.name in ('polities.json', 'acts-wudai.json'): continue   # 政权总表、史事执行条目单独嵌（下面 pollist、acts）
    try:
        h = json.load(open(f, encoding='utf8'))
        hist.append({k: h.get(k) for k in ('id', 'title', 'range', 'polities', 'rulers', 'events', 'figures', 'rulersOnly')})
    except Exception as e:
        print('skip', f.name, e)
hist_js = json.dumps(hist, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
# 大小政权总表：web/history/polities.json（任务五，62 国；是列表不是史料包，上面那段读不进，单独嵌：别称、都城、君主年号补内置史料没有的国，R-241）
try: pollist_js = json.dumps(json.load(open(here / 'history' / 'polities.json', encoding='utf8')), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
except Exception as e: print('skip polities', e); pollist_js = '[]'
# 史事执行条目：web/history/acts-wudai.json（任务六十，R-259；756—906 五十八条＋五代条目）：引擎与写戏材料照此走，2026-11-21 接进构建
try: acts_js = json.dumps(json.load(open(here / 'history' / 'acts-wudai.json', encoding='utf8')), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\\\\\\\/')
except Exception as e: print('skip acts-wudai', e); acts_js = '[]'
# 任职年表：web/tenure/*.json（开发时从哈佛库、原文库整理；游戏排朝堂、名册时照表先坐位子，任务六）
tenure = []
for f in sorted((here / 'tenure').glob('*.json')):
    if f.name.endswith('-ties.json'): continue   # 人物关系单独嵌（下面 ties）
    try:
        h = json.load(open(f, encoding='utf8'))
        tenure.append({k: h.get(k) for k in ('id', 'title', 'range', 'polity', 'source', 'figures')})
    except Exception as e:
        print('skip', f.name, e)
tenure_js = json.dumps(tenure, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
# 朝廷数据：web/court/*.json（五代十国起，位子照官制、人分两档、用人来路；任务六、七，R-227）
court = []
for f in sorted((here / 'court').glob('*.json')):
    try: court.append(json.load(open(f, encoding='utf8')))
    except Exception as e: print('skip', f.name, e)
court_js = json.dumps(court, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
# 时代用语与错词表：web/vocab/*.json（任务十五；写戏时程序照错词表查正文，R-233）
eravocab = []
for f in sorted((here / 'vocab').glob('*.json')):
    try:
        h = json.load(open(f, encoding='utf8'))
        eravocab.append({'id': h.get('id'), 'range': h.get('range'), 'absent': [{'w': x.get('w'), 'say': x.get('say')} for x in h.get('absent') or []]})
    except Exception as e: print('skip', f.name, e)
eravocab_js = json.dumps(eravocab, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
# 时代世情库：web/roles/*.json（任务九、十二；游戏照主角此刻的活法取材料给裁定和写戏，不拦玩家，R-231、R-232）
roleslib = []
for f in sorted((here / 'roles').glob('*.json')):
    try:
        h = json.load(open(f, encoding='utf8'))
        roleslib.append({'id': h.get('period') or f.stem, 'range': h.get('range'), 'ways': [{'name': w.get('name'), 'kind': w.get('kind'), 'applies': w.get('applies'), 'what': w.get('what'),
            'doing': [d.get('what') for d in w.get('doing') or [] if d.get('what')][:3], 'happens': (w.get('happens') or [])[:8], 'names': w.get('names') or {},
            'leads': [d.get('to') for d in w.get('leads') or [] if d.get('to')][:3], 'absent': [(d.get('what') or '') + ('→' + d['instead'] if d.get('instead') else '') for d in w.get('absent') or []][:3]} for w in h.get('ways') or [] if w.get('name')]})
    except Exception as e: print('skip', f.name, e)
roles_js = json.dumps(roleslib, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
# 世事库：web/events/*.json（任务十四；这年代这类人可能碰上的事，写戏取材，不拦玩家，R-241 接进游戏）
evlib = []
for f in sorted((here / 'events').glob('*.json')):
    try:
        h = json.load(open(f, encoding='utf8'))
        evlib.append({'id': h.get('period') or f.stem, 'range': h.get('range'), 'events': [{'k': e.get('kind'), 't': e.get('title'), 'who': (e.get('when') or {}).get('who') or [], 'where': (e.get('when') or {}).get('where') or '',
            'p': [[x.get('name'), x.get('cost')] for x in e.get('paths') or []][:3], 'src': e.get('src')} for e in h.get('events') or [] if e.get('title')]})
    except Exception as e: print('skip events', f.name, e)
evlib_js = json.dumps(evlib, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
# 名臣预制包：web/figures/<段>.json（R-244，任务三十六至四十；重要真人带标签、出没地点年表，游戏照年表判断主角够不够得着；officials-*.json 是地方长官表，另读）
figlib = []
for f in sorted((here / 'figures').glob('*.json')) if (here / 'figures').exists() else []:
    if f.stem.startswith('officials-'): continue
    try:
        h = json.load(open(f, encoding='utf8'))
        figlib.append({'era': h.get('era') or f.stem, 'range': h.get('range'), 'people': [{'n': p.get('name'), 'tag': p.get('tag') or '', 't': p.get('tier') or 3, 'b': p.get('born'), 'd': p.get('died'),
            'w': [[x.get('from'), x.get('to'), x.get('place') or '', x.get('why') or ''] for x in p.get('where') or [] if x.get('place')],
            'po': [[x.get('office') or '', x.get('from'), x.get('to'), x.get('polity') or ''] for x in p.get('posts') or []][:12],
            'st': p.get('stats') or {}, 'tr': (p.get('traits') or [])[:3], 'f': p.get('faction') or '', 'br': p.get('brief') or '', 'src': p.get('src') or '', 'al': [a for a in (p.get('alias') or []) if a][:4], 'fa': p.get('fate') or '', **({'dm': p['diedM']} if p.get('diedM') else {}), **({'dd': p['diedD']} if p.get('diedD') else {})} for p in h.get('people') or [] if p.get('name')]})
    except Exception as e: print('skip figures', f.name, e)
offlib = []   # 地方长官表 web/figures/officials-*.json（任务四十一、四十七）：地图上点一处看这年谁在任
for f in sorted((here / 'figures').glob('officials-*.json')) if (here / 'figures').exists() else []:
    try:
        h = json.load(open(f, encoding='utf8'))
        offlib.append({'era': h.get('era') or f.stem, 'range': h.get('range'), 'seats': [{'p': x.get('place') or '', 'o': x.get('office') or '', 'h': [[y.get('name'), y.get('from'), y.get('to'), y.get('how') or ''] for y in x.get('holders') or [] if y.get('name')]} for x in h.get('seats') or []]})
    except Exception as e: print('skip officials', f.name, e)
offlib_js = json.dumps(offlib, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
presetlib = []   # 开局底账 web/preset/*.json（任务四十二）：史料里有的米价、绢价和州郡户口；游戏照此直接填户口、给定价目当锚，查不到的照旧推
for f in sorted((here / 'preset').glob('*.json')) if (here / 'preset').exists() else []:
    try:
        h = json.load(open(f, encoding='utf8'))
        presetlib.append({'era': h.get('era') or f.stem, 'range': h.get('range'),
            'prices': [{k: x.get(k) for k in ('from', 'to', 'region', 'unit', 'rice', 'wage', 'landPrice', 'yield', 'rentRate', 'cloth', 'src')} for x in h.get('prices') or [] if any(x.get(k) is not None for k in ('rice', 'wage', 'landPrice', 'cloth'))],
            'pop': [{k: x.get(k) for k in ('year', 'place', 'households', 'mouths', 'src')} for x in h.get('pop') or [] if x.get('place') and (x.get('households') or x.get('mouths'))]})
    except Exception as e: print('skip preset', f.name, e)
pn = here / 'preset' / 'placenames.json'   # 七段地名对照表（任务四十九）：地图名 ↔ 治所 ↔ 旧称别名
try: placenames = [[x.get('name') or '', x.get('seat') or '', x.get('aka') or [], x.get('from'), x.get('to')] for x in json.load(open(pn, encoding='utf8')).get('places') or [] if x.get('name')] if pn.exists() else []
except Exception as e: placenames = []; print('skip placenames', e)
placenames_js = json.dumps(placenames, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
presetlib_js = json.dumps(presetlib, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
figlib_js = json.dumps(figlib, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
# 人物关系：web/tenure/*-ties.json（任务十；史书里两人之间的关系，写戏时朝中、身边的人照此相待，R-241 接进游戏）
ties = []
for f in sorted((here / 'tenure').glob('*-ties.json')):
    try: ties += [{k: x.get(k) for k in ('a', 'b', 'rel', 'year', 'src')} for x in json.load(open(f, encoding='utf8')) if x.get('a') and x.get('b')]
    except Exception as e: print('skip ties', f.name, e)
ties_js = json.dumps(ties, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
# 现代词 → 古代说法（rpg-kernel/core/eraVocab.js 的 MAP）
import subprocess
vocab = subprocess.run(['node', '-e', "process.stdout.write(JSON.stringify(require('./core/eraVocab.js').MAP.map(x=>[x.m,x.a])))"], cwd=str(here.parent / 'rpg-kernel'), capture_output=True, text=True, encoding='utf8').stdout or '[]'
inst = []
for f in sorted((here / 'inst').glob('*.json')):
    try:
        inst.append(json.load(open(f, encoding='utf8')))
    except Exception as e:
        print('skip inst', f.name, e)
inst_js = json.dumps(inst, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
# 大势主线：web/arcs/*.json（每个年代按年月铺满的真实历史主线，分阶段）
arcs = []
for f in sorted((here / 'arcs').glob('*.json')):
    try:
        arcs.extend(json.load(open(f, encoding='utf8')).get('arcs', []))
    except Exception as e:
        print('skip arcs', f.name, e)
arcs_js = json.dumps(arcs, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
geo_p = here / 'geo.json'
geo_js = geo_p.read_text(encoding='utf8').replace('</', '<\\/') if geo_p.exists() else '{"rows":[],"types":[],"pn":[]}'
terr_p = here / 'terrain.json'
terr_js = terr_p.read_text(encoding='utf8').replace('</', '<\\/') if terr_p.exists() else '{}'
# 地图引擎：路网、行军步调、CHGIS V4 1820/1911 省—府—县层、1820 年海岸（web/atlas/）
atlas_dir = here / 'atlas'
def atlas_rd(n, d='{}'):
    f = atlas_dir / n
    return f.read_text(encoding='utf8').replace('</', '<\\/') if f.exists() else d
atlas_js = atlas_rd('atlas.core.js', '')
atlas_core, atlas_e1820, atlas_e1911, atlas_coast = atlas_rd('core.json'), atlas_rd('era1820.json'), atlas_rd('era1911.json'), atlas_rd('coast1820.json')
import hashlib, re, datetime
face_js = (here / 'face.js').read_text(encoding='utf8') if (here / 'face.js').exists() else ''
src_all = (here / 'game.src.html').read_text(encoding='utf8') + face_js + hist_js + tenure_js + court_js + eravocab_js + roles_js + pollist_js + acts_js + evlib_js + figlib_js + offlib_js + presetlib_js + placenames_js + ties_js + inst_js + arcs_js + geo_js + terr_js + atlas_js + atlas_core + atlas_e1820 + atlas_e1911 + atlas_coast + vocab
digest = hashlib.sha1(src_all.encode('utf8')).hexdigest()[:12]
api = int(re.search(r'const API_VER = (\d+)', (here.parent / 'rpg-kernel/server.js').read_text(encoding='utf8')).group(1))
vfile = here.parent / 'rpg-kernel/public/version.json'
try: old = json.load(open(vfile, encoding='utf8'))
except Exception: old = {}
build = old.get('build') if old.get('hash') == digest else datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')
gver = (re.search(r"const VERSIONS = \{ game: '([^']+)'", (here / 'game.src.html').read_text(encoding='utf8')) or [None, ''])[1]   # 三个版本显示同一个版本号
vfile.write_text(json.dumps({'build': build, 'hash': digest, 'api': api, 'game': gver}), encoding='utf8', newline='\n')
body = (here / 'game.src.html').read_text(encoding='utf8').replace('__BUILD__', build).replace('__CAL__', compact).replace('__HIST__', hist_js).replace('__TENURE__', tenure_js).replace('__COURT__', court_js).replace('__ERAVOCAB__', eravocab_js).replace('__ROLESLIB__', roles_js).replace('__POLLIST__', pollist_js).replace('__ACTS__', acts_js).replace('__EVLIB__', evlib_js).replace('__FIGLIB__', figlib_js).replace('__OFFLIB__', offlib_js).replace('__PRESETLIB__', presetlib_js).replace('__PLACENAMES__', placenames_js).replace('__TIES__', ties_js).replace('__VOCAB__', vocab.replace('</', '<\\/')).replace('__INSTLIB__', inst_js).replace('__ARCS__', arcs_js).replace('__GEO__', geo_js).replace('__TERRAIN__', terr_js).replace('__ATLAS_CORE__', atlas_core).replace('__ATLAS_E1820__', atlas_e1820).replace('__ATLAS_E1911__', atlas_e1911).replace('__ATLAS_COAST__', atlas_coast).replace('__ATLAS_JS__', atlas_js).replace('/*__FACE__*/', face_js)
(here / 'index.html').write_text(body, encoding='utf8', newline='\n')
# 桌面版由本机服务直接发出，需要自己的文档外壳
page = ('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="renderer" content="webkit"><meta name="force-rendering" content="webkit">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + body + '</body></html>')
(here.parent / 'rpg-kernel/public/index.html').write_text(page, encoding='utf8', newline='\n')
# 网页版：同一个页面，没有本机游戏程序时自动变成网页版（浏览器直接连 DeepSeek，只要填 Key）。在线打开、存到电脑上双击打开都行
(here / 'play.html').write_text(page, encoding='utf8', newline='\n')
print('ok', len(body), 'history eras:', len(hist), 'inst:', len(inst), 'arcs:', len(arcs))
# 构建完先查页面脚本的语法：有错就让构建失败（一个字写错整页打不开，不能等到测试才发现）
import tempfile, sys
_k = 0
import re as _re
for _m in _re.finditer(r'<script(\s[^>]*)?>([\s\S]*?)</script>', body):   # 每一段内联脚本都查（带属性的主脚本以前漏查了，一个注释吞掉半行代码整页打不开，构建还说 ok）
    if _m.group(1) and _re.search(r'\bsrc=|type="(application/json|text/plain)"', _m.group(1)): continue
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf8') as _f: _f.write(_m.group(2)); _tmp = _f.name
    _r = subprocess.run(['node', '--check', _tmp], capture_output=True, text=True, encoding='utf8')
    pathlib.Path(_tmp).unlink(missing_ok=True)
    if _r.returncode != 0:
        print('页面脚本有语法错误：\n' + (_r.stderr or '')[:800]); sys.exit(1)
