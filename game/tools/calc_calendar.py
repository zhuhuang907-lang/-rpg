# 用天文朔望与中气推算北宋农历月表（东八区）。宋历为平气/定朔历法，个别月份可能相差一日；
# 输出供游戏换算公历，界面上标"推算"。用法：python3 calc_calendar.py 1067 1086 > ../data/calendar.json
import ephem, json, sys, math
y0, y1 = int(sys.argv[1]), int(sys.argv[2])
TZ = 8 * ephem.hour
def day(d):  # 东八区日序（儒略日整数）
    return int(ephem.julian_date(ephem.Date(d + TZ)) + 0.5)
# 新月
moons = []
d = ephem.Date(f'{y0-1}/11/1')
while d < ephem.Date(f'{y1+1}/3/1'):
    nm = ephem.next_new_moon(d); moons.append(day(nm)); d = ephem.Date(nm + 1)
# 中气：太阳黄经为 30 的倍数（冬至 270）
def sun_lon(t):
    s = ephem.Sun(); s.compute(ephem.Date(t), epoch=ephem.Date(t))
    return math.degrees(ephem.Ecliptic(s, epoch=ephem.Date(t)).lon)
zq = []
t = ephem.Date(f'{y0-1}/11/1'); end = ephem.Date(f'{y1+1}/3/1')
prev = sun_lon(t)
while t < end:
    t2 = ephem.Date(t + 1); cur = sun_lon(t2)
    if math.floor(cur / 30) != math.floor(prev / 30) or (prev > 350 and cur < 10):
        lo, hi = t, t2
        target = (math.floor(cur / 30) * 30) % 360
        for _ in range(40):
            mid = ephem.Date((lo + hi) / 2); v = sun_lon(mid)
            if ((v - target + 180) % 360) - 180 >= 0: hi = mid
            else: lo = mid
        zq.append((hi, int(target)))
    prev = cur; t = t2
# 宋历置闰用平气：以实测冬至为起点，每 1/12 回归年一个中气
ws_times = [tt for (tt, lon) in zq if lon == 270]
zq = []
for i in range(len(ws_times) - 1):
    a, b = ws_times[i], ws_times[i + 1]
    for k in range(12):
        zq.append((day(a + (b - a) * k / 12), (270 + 30 * k) % 360))
# 月：每个新月到下个新月；含冬至(270)者为十一月；岁间无中气月为闰（取第一个）
months = []
for i in range(len(moons) - 1):
    a, b = moons[i], moons[i + 1]
    qs = [lon for (dd, lon) in zq if a <= dd < b]
    months.append({'start': a, 'len': b - a, 'zq': qs})
# 以冬至月为锚编号
out = []
ws = [i for i, m in enumerate(months) if 270 in m['zq']]
for k in range(len(ws) - 1):
    s, e = ws[k], ws[k + 1]
    seg = months[s:e]
    leap_needed = (len(seg) == 13)
    num, leap_done = 11, False
    for j, m in enumerate(seg):
        if j > 0:
            if leap_needed and not leap_done and not m['zq']:
                m['leap'] = True; leap_done = True; m['num'] = num; out.append(m); continue
            num = num % 12 + 1
        m['num'] = num; m['leap'] = False; out.append(m)
def jd2date(jd):
    d = ephem.Date(jd - 2415020)  # ephem 纪元 1899-12-31 12:00
    y, mo, dd = d.triple(); return f'{y:04d}-{mo:02d}-{int(dd):02d}'
res = []
for m in out:
    # 农历年：正月起算
    res.append({'jd': m['start'], 'julian': jd2date(m['start'] + 0.0), 'month': m['num'], 'leap': m['leap'], 'days': m['len']})
# 归年：正月所在的公历年
cur = None; table = []
for m in res:
    if m['month'] == 1 and not m['leap']:
        cur = int(m['julian'][:4])
    if cur and y0 <= cur <= y1:
        table.append({**m, 'year': cur})
json.dump({'note': '天文推算（东八区定朔、平气置闰），宋代行用历法与此可能相差一日或闰月位置不同；仅作公历换算参考', 'months': table}, sys.stdout, ensure_ascii=False, indent=0)
