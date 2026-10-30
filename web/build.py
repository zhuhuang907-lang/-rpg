# 把真实农历月表嵌进网页，生成两份同样的页面：
#   web/index.html                 —— 发布到 claude.ai（用浏览者自己的 Claude）
#   rpg-kernel/public/index.html   —— 桌面版游戏的主页面（用玩家自己的 DeepSeek Key，存档在本机）
import json, pathlib
here = pathlib.Path(__file__).parent
cal = json.load(open(here.parent / 'rpg-kernel/data/calendar.json', encoding='utf8'))['years']
compact = json.dumps([[y, lens, leap] for y, _jd, lens, leap in cal], separators=(',', ':'))
# 内置史料：web/history/*.json（史事、君主年号、真人生卒官职）
hist = []
for f in sorted((here / 'history').glob('*.json')):
    try:
        h = json.load(open(f, encoding='utf8'))
        hist.append({k: h.get(k) for k in ('id', 'title', 'range', 'polities', 'rulers', 'events', 'figures')})
    except Exception as e:
        print('skip', f.name, e)
hist_js = json.dumps(hist, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
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
src_all = (here / 'game.src.html').read_text(encoding='utf8') + face_js + hist_js + inst_js + arcs_js + geo_js + terr_js + atlas_js + atlas_core + atlas_e1820 + atlas_e1911 + atlas_coast + vocab
digest = hashlib.sha1(src_all.encode('utf8')).hexdigest()[:12]
api = int(re.search(r'const API_VER = (\d+)', (here.parent / 'rpg-kernel/server.js').read_text(encoding='utf8')).group(1))
vfile = here.parent / 'rpg-kernel/public/version.json'
try: old = json.load(open(vfile, encoding='utf8'))
except Exception: old = {}
build = old.get('build') if old.get('hash') == digest else datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')
gver = (re.search(r"const VERSIONS = \{ game: '([^']+)'", (here / 'game.src.html').read_text(encoding='utf8')) or [None, ''])[1]   # 三个版本显示同一个版本号
vfile.write_text(json.dumps({'build': build, 'hash': digest, 'api': api, 'game': gver}), encoding='utf8')
body = (here / 'game.src.html').read_text(encoding='utf8').replace('__BUILD__', build).replace('__CAL__', compact).replace('__HIST__', hist_js).replace('__VOCAB__', vocab.replace('</', '<\\/')).replace('__INSTLIB__', inst_js).replace('__ARCS__', arcs_js).replace('__GEO__', geo_js).replace('__TERRAIN__', terr_js).replace('__ATLAS_CORE__', atlas_core).replace('__ATLAS_E1820__', atlas_e1820).replace('__ATLAS_E1911__', atlas_e1911).replace('__ATLAS_COAST__', atlas_coast).replace('__ATLAS_JS__', atlas_js).replace('/*__FACE__*/', face_js)
(here / 'index.html').write_text(body, encoding='utf8')
# 桌面版由本机服务直接发出，需要自己的文档外壳
page = ('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="renderer" content="webkit"><meta name="force-rendering" content="webkit">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + body + '</body></html>')
(here.parent / 'rpg-kernel/public/index.html').write_text(page, encoding='utf8')
# 网页版：同一个页面，没有本机游戏程序时自动变成网页版（浏览器直接连 DeepSeek，只要填 Key）。在线打开、存到电脑上双击打开都行
(here / 'play.html').write_text(page, encoding='utf8')
print('ok', len(body), 'history eras:', len(hist), 'inst:', len(inst), 'arcs:', len(arcs))
# 构建完先查页面脚本的语法：有错就让构建失败（一个字写错整页打不开，不能等到测试才发现）
import tempfile, sys
_k = 0
while True:   # 每一段 <script> 都查（最前面那段老浏览器提示也算）
    _i = body.find('<script>', _k)
    if _i < 0: break
    _j = body.find('</script>', _i); _k = _j
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf8') as _f: _f.write(body[_i + 8:_j]); _tmp = _f.name
    _r = subprocess.run(['node', '--check', _tmp], capture_output=True, text=True, encoding='utf8')
    pathlib.Path(_tmp).unlink(missing_ok=True)
    if _r.returncode != 0:
        print('页面脚本有语法错误：\n' + (_r.stderr or '')[:800]); sys.exit(1)
