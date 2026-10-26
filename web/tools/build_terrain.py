#!/usr/bin/env python3
"""舆图底图：高程（AWS Terrain Tiles / terrarium）、河流湖泊海岸山脉（Natural Earth 10m）、关隘坐标（维基百科），
古黄河、大运河的走向用复旦/哈佛 CHGIS 地名库（geo.json）里沿线州县的坐标串起来。输出 web/terrain.json，build.py 嵌进页面。
用法：python3 web/tools/build_terrain.py <缓存目录>"""
import sys, os, json, math, io, base64, urllib.request, urllib.parse, time
from PIL import Image
CACHE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/terrain-cache'
os.makedirs(CACHE, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__)); WEB = os.path.dirname(HERE)
LON0, LON1, LAT0, LAT1, RES = 73.0, 135.0, 17.0, 54.0, 0.1
UA = {'User-Agent': 'rpg-map-builder/1.0 (github.com/zhuhuang907-lang/-rpg)'}

def get(url, fn):
    p = os.path.join(CACHE, fn)
    if not os.path.exists(p):
        for i in range(4):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r: open(p, 'wb').write(r.read()); break
            except Exception as e:
                print('retry', url, e); time.sleep(2 ** i)
    return p

# ---------- 高程 ----------
Z = 6; N = 2 ** Z
def tx(lon): return (lon + 180) / 360 * N
def ty(lat): r = math.radians(lat); return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * N
tiles = {}
def tile(x, y):
    if (x, y) not in tiles:
        im = Image.open(get(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png', f't{Z}_{x}_{y}.png')).convert('RGB')
        tiles[(x, y)] = im.load()
    return tiles[(x, y)]
def elev(lon, lat):
    fx, fy = tx(lon), ty(lat); x, y = int(fx), int(fy); px, py = int((fx - x) * 256), int((fy - y) * 256)
    t = tile(x, y); r, g, b = t[min(255, px), min(255, py)]
    return r * 256 + g + b / 256 - 32768
nx, ny = round((LON1 - LON0) / RES), round((LAT1 - LAT0) / RES)
grid = bytearray(nx * ny)
for j in range(ny):
    lat = LAT1 - (j + 0.5) * RES
    for i in range(nx):
        lon = LON0 + (i + 0.5) * RES
        vals = [elev(lon + dx * RES / 3, lat + dy * RES / 3) for dx in (-1, 0, 1) for dy in (-1, 0, 1)]
        e = sum(vals) / len(vals)
        land = sum(1 for v in vals if v > 0) >= 5
        grid[j * nx + i] = 0 if not land else min(255, 1 + round(math.sqrt(max(0, e) / 7000) * 254))
    if j % 40 == 0: print('elev row', j, '/', ny)

# ---------- 线、面的化简 ----------
def dp(pts, tol):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dmax, k = 0, 0
    for i in range(1, len(pts) - 1):
        p = pts[i]; dx, dy = b[0] - a[0], b[1] - a[1]
        d = abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / (math.hypot(dx, dy) or 1e-9) if (dx or dy) else math.hypot(p[0] - a[0], p[1] - a[1])
        if d > dmax: dmax, k = d, i
    return dp(pts[:k + 1], tol)[:-1] + dp(pts[k:], tol) if dmax > tol else [a, b]
def lines(g):
    t, c = g['type'], g['coordinates']
    if t == 'LineString': return [c]
    if t == 'MultiLineString': return c
    if t == 'Polygon': return [c[0]]
    if t == 'MultiPolygon': return [p[0] for p in c]
    return []
inb = lambda p: LON0 <= p[0] <= LON1 and LAT0 <= p[1] <= LAT1
def clip(L):
    out, cur = [], []
    for p in L:
        if inb(p): cur.append(p)
        elif cur: out.append(cur); cur = []
    if cur: out.append(cur)
    return [x for x in out if len(x) >= 2]
q = lambda pts: [[round(p[0], 3), round(p[1], 3)] for p in pts]
NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
def ne(name): return json.load(open(get(NE + name + '.geojson', name + '.geojson')))

# 河名：Natural Earth 是拼音，对成汉字；同名的按位置分
def rname(n, c):
    lon = sum(p[0] for p in c) / len(c); lat = sum(p[1] for p in c) / len(c)
    T = {'Huang': '黄河', 'Chang Jiang': '长江', 'Yangtze': '长江', 'Huai': '淮河', 'Wei': '渭河' if lon < 111 else '卫河', 'Fen': '汾河', 'Gan': '赣江', 'Xiang': '湘江',
         'Zi': '资水', 'Yuan': '沅江', 'Jialing': '嘉陵江', 'Tuo': '沱江', 'Dadu': '大渡河', 'Yalong': '雅砻江', 'Jinsha': '金沙江', 'Tongtian': '通天河',
         'Lancang': '澜沧江', 'Nu': '怒江', 'Yarlung': '雅鲁藏布江', 'Wu': '乌江', 'Xi': '西江', 'Bei': '北江', 'Dong': '东江', 'Liu': '柳江', 'You': '右江',
         'Zuo': '左江', 'Yu': '郁江', 'Xun': '浔江', 'Hongshui': '红水河', 'Nanpan': '南盘江', 'Fuchun': '富春江', 'Ou': '瓯江', 'Jiulong': '九龙江',
         'Ying': '颍河', 'Qin': '沁河', 'Jing': '泾河', 'Wuding': '无定河', 'Dan': '丹江', 'Sanggan': '桑干河', 'Yongding': '永定河', 'Hai': '海河',
         'Zhang': '漳河', 'Luan': '滦河', 'Daling': '大凌河', 'Liao': '辽河', 'Xiliao': '西辽河', 'Xar Moron': '西拉木伦河', 'Songhua': '松花江',
         'Di’er Songhua': '第二松花江', 'Nen': '嫩江', 'Heilong Jiang': '黑龙江', 'Amur': '黑龙江', 'Ussuri': '乌苏里江', 'Yalu': '鸭绿江', 'Tumen': '图们江',
         'Tarim': '塔里木河', 'Yarkant': '叶尔羌河', 'Ile': '伊犁河', 'Ertix': '额尔齐斯河', 'Ertis': '额尔齐斯河', 'Mei': '梅江', 'Shiquan': '狮泉河',
         'Herlen': '克鲁伦河', 'Argun’': '额尔古纳河', 'Hailar': '海拉尔河', 'Muling': '穆棱河', 'Hong': '红河', 'Yi': '沂河' if lon > 117.5 else '伊河',
         'Min': '闽江' if lon > 115 else '岷江', 'Han': None if lon > 125 else '汉江', 'Rong': '融江', 'Konqi': '孔雀河', 'Aksu': '阿克苏河', 'Qarqan': '车尔臣河',
         'Yurungkax': '玉龙喀什河', 'Toxkan': '托什干河', 'Künes': '巩乃斯河', 'Tao’er': '洮儿河', 'Chaor': '绰尔河', 'Huan': '洹河', 'Quan': None, 'Yong': '邕江', 'Da': None,
         'Wujia': None, 'Za': None, 'Mytinge': None, 'Dali': None, 'Ca': None, 'Bogcang': None, 'Za’gya': None, 'Maquan': '马泉河', 'Qumar': '楚玛尔河', 'Erdao': '二道白河'}
    return T.get(n, None) if n else None
rivers = []
for f in ne('ne_10m_rivers_lake_centerlines')['features']:
    p, g = f['properties'], f['geometry']
    if not g: continue
    for L in lines(g):
        for C in clip(L):
            nm = rname(p.get('name'), C)
            if not nm: continue
            # 只要中国及周边（不要印度、缅甸、俄罗斯腹地的河）
            lon = sum(x[0] for x in C) / len(C); lat = sum(x[1] for x in C) / len(C)
            if lat < 21 and lon < 100: continue
            S = dp(C, 0.015)
            rivers.append({'n': nm, 'r': int(p.get('scalerank') or 9), 'p': q(S)})
# 黄河下游现行河道是 1855 年铜瓦厢决口后才有的：把兰考以下这一段单独标出来，按年代换成当时的故道
for r in rivers:
    if r['n'] == '黄河':
        lo = [x for x in r['p'] if x[0] > 114.75 and x[1] > 34.6]
        if len(lo) > 5: r['from'] = 1855; r['part'] = 'low'
coast = []
for f in ne('ne_10m_coastline')['features']:
    for L in lines(f['geometry']):
        for C in clip(L):
            if len(C) >= 2 and any(p[0] > 104 for p in C): coast.append(q(dp(C, 0.02)))
lakes = []
for f in ne('ne_10m_lakes')['features']:
    p = f['properties']; nm = p.get('name_zh') or ''
    if not f['geometry'] or (p.get('scalerank') or 9) > 7: continue
    for L in lines(f['geometry']):
        C = [x for x in L if inb(x)]
        if len(C) >= 4 and 97 < C[0][0]:
            d = {'n': nm.replace('湖泊', '湖'), 'p': q(dp(C, 0.01))}
            if '洪泽' in nm: d['from'] = 1580   # 洪泽湖是明万历以后蓄清刷黄、诸湖连成的
            lakes.append(d)
ranges = []
for f in ne('ne_10m_geography_regions_polys')['features']:
    p, g = {k.lower(): v for k, v in f['properties'].items()}, f['geometry']
    if not g or p.get('featurecla') not in ('Range/mtn', 'Plateau', 'Basin', 'Desert', 'Plain', 'Geoarea', 'Gorge'): continue
    P = [x for L in lines(g) for x in L]; lon = sum(x[0] for x in P) / len(P); lat = sum(x[1] for x in P) / len(P)
    if not (LON0 < lon < LON1 and LAT0 < lat < LAT1) or not p.get('name_zh') or (lon < 92 and lat < 30): continue
    nm = {'帕米爾高原': '葱岭', '大漠': '大漠（戈壁）', '鄂爾多斯沙漠': '毛乌素沙地', '亞洲': None}.get(p['name_zh'], p['name_zh'])
    if nm: ranges.append({'n': nm, 'k': {'Range/mtn': '山', 'Plateau': '原', 'Basin': '盆', 'Desert': '漠', 'Plain': '平', 'Geoarea': '地', 'Gorge': '峡'}[p['featurecla']], 'lon': round(lon, 2), 'lat': round(lat, 2), 'r': int(p.get('scalerank') or 5)})

# ---------- CHGIS 地名库：古黄河、大运河沿线州县的坐标 ----------
G = json.load(open(os.path.join(WEB, 'geo.json')))
U = [{'name': r[0], 'type': G['types'][r[1]], 'from': r[3], 'to': r[4], 'lon': r[5] / 1e4, 'lat': r[6] / 1e4} for r in G['rows']]
def at(name, y, near=None):
    c = [u for u in U if u['name'] == name and u['lat']]
    if not c: c = [u for u in U if u['name'].startswith(name) and u['lat']]
    if not c: raise SystemExit('地名库里没有：' + name)
    yr = lambda u: 0 if u['from'] <= y <= u['to'] else min(abs(u['from'] - y), abs(u['to'] - y))
    # 同名的地方多：沿线上一处附近的那个才对（运河、河道一站接一站，不会跳出三百里）
    dist = lambda u: math.hypot(u['lon'] - near[0], u['lat'] - near[1]) if near else 0
    c.sort(key=lambda u: (dist(u) > 3, dist(u) if near else yr(u), yr(u)))
    u = c[0]
    if near and dist(u) > 3: raise SystemExit(f'{name} 离上一站太远：{u}')
    return [round(u['lon'], 3), round(u['lat'], 3)]
def route(names, y, tail=None, start=None):
    P, prev = [], start
    for n in names: prev = at(n, y, prev); P.append(prev)
    return P + (tail or [])
OLD = [
  # 西汉以前的大河：东北经馆陶、德州、沧州入海（王莽始建国三年即公元11年魏郡决口改道）
  {'n': '黄河故道（西汉）', 'from': -600, 'to': 10, 'p': route(['濮阳县', '馆陶县', '临清县', '德州', '东光县', '沧州', '盐山县'], -100, [[117.8, 38.4]], start=[115.0, 35.7])},
  # 东汉王景治河以后到北宋庆历八年（1048）商胡决口：经濮阳、聊城、平原、惠民，至千乘（今利津一带）入海
  {'n': '黄河故道（东汉至北宋）', 'from': 11, 'to': 1047, 'p': route(['滑县', '濮阳县', '范县', '聊城县', '高唐县', '平原县', '惠民县', '利津县'], 800, [[118.9, 37.75]], start=[114.5, 35.5])},
  # 庆历八年至建炎二年（1048–1128）北流：经大名、冀州至乾宁军（今青县）一带入海
  {'n': '黄河故道（北流）', 'from': 1048, 'to': 1127, 'p': route(['濮阳县', '大名县', '冀州', '献县', '青县', '天津县'], 1100, [[117.6, 38.95]], start=[115.0, 35.7])},
  # 建炎二年杜充决河以后南流夺淮，至咸丰五年（1855）铜瓦厢决口北徙
  {'n': '黄河故道（夺淮）', 'from': 1128, 'to': 1854, 'p': route(['开封府', '兰阳县', '仪封县', '商丘县', '虞城县', '砀山县', '萧县', '铜山县', '邳州', '宿迁县', '桃源县', '清河县', '安东县'], 1700, [[119.85, 34.25], [120.3, 34.3]], start=[114.35, 34.8])},
]
CANAL = [
  {'n': '通济渠', 'from': 605, 'to': 1127, 'p': route(['洛阳县', '巩县', '荥阳县', '开封县', '宋城县', '永城县', '宿州', '虹县', '泗州'], 700, start=[112.45, 34.65])},
  {'n': '永济渠', 'from': 608, 'to': 1127, 'p': route(['汲县', '内黄县', '魏县', '临清县', '德州', '东光县', '沧州', '静海县', '涿县'], 700, start=[114.05, 35.3])},
  {'n': '邗沟', 'from': -486, 'to': 1911, 'p': route(['山阳县', '宝应县', '高邮县', '江都县'], 1600, start=[119.15, 33.5])},
  {'n': '江南河', 'from': 610, 'to': 1911, 'p': route(['丹徒县', '丹阳县', '武进县', '无锡县', '吴县', '吴江县', '嘉兴县', '石门县', '钱塘县'], 1600, start=[119.45, 32.2])},
  {'n': '大运河（会通河、通惠河）', 'from': 1293, 'to': 1911, 'p': route(['大兴县', '通州', '武清县', '天津县', '静海县', '沧州', '吴桥县', '德州', '武城县', '临清州', '聊城县', '东平州', '济宁州', '鱼台县', '沛县', '铜山县', '邳州', '宿迁县', '桃源县', '清河县', '山阳县'], 1600, start=[116.4, 39.9])},
]

# ---------- 关隘：坐标照维基百科；查不到的用所在州县的坐标 ----------
PASS = [  # 名, 维基条目, 所在州县（查不到坐标时用）, 起, 讫, 扼守哪条路
  ('山海关', '山海关', '临榆县', 1381, 1911, '辽西走廊入关内'), ('榆关', '临榆关', '抚宁县', 600, 1380, '辽西入幽蓟'),
  ('居庸关', '居庸关', '昌平州', -200, 1911, '燕山南口，京北要道'), ('古北口', '古北口', '密云县', 500, 1911, '燕山，通塞外'),
  ('喜峰口', '喜峰口', '迁安县', 1400, 1911, '燕山东段，通塞外'), ('紫荆关', '紫荆关', '易州', 900, 1911, '太行北段，蒲阴陉'),
  ('倒马关', '倒马关', '唐县', -200, 1911, '太行，飞狐陉'), ('雁门关', '雁门关', '代州', -200, 1911, '句注山，晋北门户'),
  ('宁武关', '宁武关', '宁武府', 1450, 1911, '内长城外三关'), ('偏头关', '偏关县', '偏关县', 1390, 1911, '内长城外三关'),
  ('平型关', '平型关', '繁峙县', 1500, 1911, '恒山、五台之间'), ('娘子关', '娘子关', '平定州', 600, 1911, '太行，井陉西口'),
  ('井陉关', '井陉关', '井陉县', -250, 1911, '太行八陉之井陉'), ('壶关', '壶关县', '壶关县', -250, 1911, '太行，滏口陉'),
  ('天井关', '天井关', '泽州', -250, 1911, '太行，太行陉'), ('轵关', '轵关陉', '济源县', -400, 1911, '太行最南，轵关陉'),
  ('函谷关（秦）', '函谷关', '灵宝县', -400, -115, '崤函道，关中东门'), ('函谷关（汉）', '汉函谷关', '新安县', -114, 600, '崤函道'),
  ('潼关', '潼关', '潼关县', 196, 1911, '关中东门，黄河、华山之间'), ('虎牢关', '虎牢关', '荥阳县', -400, 1911, '洛阳东门'),
  ('武关', '武关', '商州', -400, 1911, '关中通南阳、荆襄'), ('大散关', '大散关', '宝鸡县', -200, 1911, '秦岭西段，通汉中'),
  ('阳平关', '阳平关', '宁羌州', -200, 1911, '汉中西门，通蜀'), ('剑门关', '剑门关', '剑州', 220, 1911, '金牛道，入蜀咽喉'),
  ('萧关', '萧关', '固原州', -200, 1100, '关中西北，通河西'), ('陇关', '大震关', '清水县', -100, 1000, '陇山，关陇道'),
  ('玉门关', '玉门关', '敦煌县', -100, 600, '西域门户'), ('阳关', '阳关', '敦煌县', -100, 600, '西域南道'),
  ('嘉峪关', '嘉峪关', '肃州', 1372, 1911, '河西走廊西端'), ('瞿塘关', '瞿塘峡', '奉节县', 200, 1911, '三峡西口，夔门'),
  ('梅关', '梅关', '南雄州', 716, 1911, '大庾岭，赣粤通道'), ('仙霞关', '仙霞关', '江山县', 900, 1911, '浙闽通道'),
  ('杉关', '杉关', '光泽县', 1000, 1911, '赣闽通道'), ('分水关', '分水关', '崇安县', 1000, 1911, '赣闽通道，武夷山'),
  ('昆仑关', '昆仑关', '宾州', 1000, 1911, '桂南，邕州门户'), ('镇南关', '友谊关', '凭祥州', 1400, 1911, '通安南'),
  ('杀虎口', '杀虎口', '右玉县', 1500, 1911, '晋北，通归化'), ('张家口', '大境门', '万全县', 1429, 1911, '宣府，通塞外'),
  ('独石口', '独石口', '赤城县', 1430, 1911, '宣府北路'),
]
# 同名州县多（新安、清水、剑州……）：给个大致方位，只用来挑对是哪一个
REGION = {'榆关': [119, 40], '倒马关': [114.7, 38.8], '宁武关': [112.3, 39], '偏头关': [111.5, 39.4], '平型关': [113.5, 39.2], '井陉关': [114, 38],
          '天井关': [112.8, 35.5], '轵关': [112.5, 35.1], '函谷关（汉）': [112.1, 34.7], '潼关': [110.3, 34.5], '虎牢关': [113.3, 34.8], '武关': [110, 33.8],
          '大散关': [107, 34.3], '剑门关': [105.5, 32], '萧关': [106.3, 36], '陇关': [106, 34.7], '瞿塘关': [109.5, 31], '杉关': [117.3, 27.5],
          '分水关': [118, 27.8], '昆仑关': [108.8, 23.2], '镇南关': [106.8, 22.1], '杀虎口': [112.3, 40.2], '独石口': [115.8, 41]}
passes = []
for i in range(0, len(PASS), 20):
    chunk = PASS[i:i + 20]
    url = 'https://zh.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'prop': 'coordinates', 'titles': '|'.join(x[1] for x in chunk), 'format': 'json', 'redirects': 1})
    d = json.load(open(get(url, f'wiki_pass_{i}.json')))
    norm = {x['from']: x['to'] for x in d['query'].get('normalized', []) + d['query'].get('redirects', [])}
    co = {pg['title']: pg['coordinates'][0] for pg in d['query']['pages'].values() if pg.get('coordinates')}
    for nm, title, cty, a, b, why in chunk:
        t = norm.get(title, title); t = norm.get(t, t); c = co.get(t)
        far = lambda lo, la: nm in REGION and math.hypot(lo - REGION[nm][0], la - REGION[nm][1]) > 3   # 条目对错了（昆仑关对成了昆仑山口）
        if c and inb([c['lon'], c['lat']]) and not far(c['lon'], c['lat']): passes.append({'n': nm, 'lon': round(c['lon'], 3), 'lat': round(c['lat'], 3), 'from': a, 'to': b, 'why': why, 'src': '维基百科坐标'})
        else:
            fp = get('https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode({'action': 'wbgetentities', 'sites': 'zhwiki', 'titles': t, 'props': 'claims', 'format': 'json'}), 'wd_' + t + '.json'); time.sleep(0.5)
            wd = json.load(open(fp)) if os.path.exists(fp) else {}
            P625 = [e['claims']['P625'][0]['mainsnak']['datavalue']['value'] for e in wd.get('entities', {}).values() if 'claims' in e and 'P625' in e['claims']]
            if P625 and inb([P625[0]['longitude'], P625[0]['latitude']]) and not far(P625[0]['longitude'], P625[0]['latitude']): passes.append({'n': nm, 'lon': round(P625[0]['longitude'], 3), 'lat': round(P625[0]['latitude'], 3), 'from': a, 'to': b, 'why': why, 'src': '维基数据坐标'}); continue
            p = at(cty, (max(a, -200) + min(b, 1900)) // 2, REGION.get(nm)); passes.append({'n': nm, 'lon': p[0], 'lat': p[1], 'from': a, 'to': b, 'why': why, 'src': '所在州县（' + cty + '）'})

out = {'v': 1, 'box': [LON0, LON1, LAT0, LAT1, RES], 'nx': nx, 'ny': ny, 'elev': base64.b64encode(bytes(grid)).decode(),
       'rivers': rivers, 'old': OLD, 'canal': CANAL, 'coast': coast, 'lakes': lakes, 'ranges': ranges, 'passes': passes,
       'src': '高程：AWS Terrain Tiles（terrarium）；河湖海岸山脉：Natural Earth 10m；关隘坐标：维基百科；古河道、运河沿线：CHGIS 地名库'}
json.dump(out, open(os.path.join(WEB, 'terrain.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('rivers', len(rivers), 'coast', len(coast), 'lakes', len(lakes), 'ranges', len(ranges), 'passes', len(passes), 'size', os.path.getsize(os.path.join(WEB, 'terrain.json')))
