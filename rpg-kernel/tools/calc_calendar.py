# 天文推算中国农历年表（东八区）。
#   1644 年以前：定朔、平气置闰（与历代历法的置闰规则一致，但历代行用历法各有误差，个别月份可能差一日）
#   1645 年起：定朔、定气（时宪历）
# 年份用天文纪年：0 = 公元前1年，-220 = 公元前221年。
# 输出紧凑格式：每个农历年一行 [年, 正月初一的儒略日数, 各月大小串("1"=30天,"0"=29天), 闰月在序列中的位置(-1=无)]
# 用法：python3 calc_calendar.py -220 1912 > ../data/calendar.json   （参数为天文纪年）
import ephem, json, sys, math

Y0, Y1 = int(sys.argv[1]), int(sys.argv[2])
TZ = 8 * ephem.hour

def jdn(d):
    return int(ephem.julian_date(ephem.Date(d + TZ)) + 0.5)

def sun_lon(t):
    s = ephem.Sun(); s.compute(ephem.Date(t), epoch=ephem.Date(t))
    return math.degrees(ephem.Ecliptic(s, epoch=ephem.Date(t)).lon)

def true_term(approx, target):
    lo, hi = ephem.Date(approx - 4), ephem.Date(approx + 4)
    for _ in range(40):
        mid = ephem.Date((lo + hi) / 2)
        if ((sun_lon(mid) - target + 180) % 360) - 180 >= 0: hi = mid
        else: lo = mid
    return hi

# 冬至
ws = []
d = ephem.Date(f'{Y0-2}/6/1')
while d < ephem.Date(f'{Y1+2}/6/1'):
    w = ephem.next_winter_solstice(d); ws.append(w); d = ephem.Date(w + 30)
# 中气
zq = []
for i in range(len(ws) - 1):
    a, b = ws[i], ws[i + 1]
    y = ephem.Date(a).triple()[0]
    for k in range(12):
        lon = (270 + 30 * k) % 360
        t = a + (b - a) * k / 12
        if y >= 1645 and k: t = true_term(t, lon)
        zq.append(jdn(t))
zq.sort()
# 朔
moons = []
d = ephem.Date(f'{Y0-2}/6/1')
while d < ephem.Date(f'{Y1+2}/6/1'):
    nm = ephem.next_new_moon(d); moons.append(jdn(nm)); d = ephem.Date(nm + 1)
wsd = [jdn(w) for w in ws]

# 以冬至所在月为十一月，冬至到冬至之间有 13 个月则置闰：第一个无中气之月为闰月
import bisect
def has_zq(a, b):
    i = bisect.bisect_left(zq, a); return i < len(zq) and zq[i] < b
months = []  # (start, len, num, leap)
for k in range(len(wsd) - 1):
    s_i = max(i for i in range(len(moons) - 1) if moons[i] <= wsd[k])
    e_i = max(i for i in range(len(moons) - 1) if moons[i] <= wsd[k + 1])
    seg = list(range(s_i, e_i))
    leap_needed = len(seg) == 13
    num, done = 11, False
    for j, mi in enumerate(seg):
        a, b = moons[mi], moons[mi + 1]
        leap = False
        if j > 0:
            if leap_needed and not done and not has_zq(a, b):
                leap = True; done = True
            else:
                num = num % 12 + 1
        months.append((a, b - a, num, leap))
# 去重（相邻两段的边界月不会重复，因为 seg 是左闭右开）
# 按正月切年
years = []
cur = None
for (a, ln, num, leap) in months:
    if num == 1 and not leap:
        y = ephem.Date(ephem.Date(a - 2415020.0)).triple()[0]
        # ephem 的负年份是历史纪年（-1＝公元前1年），换成天文纪年
        if y < 0: y += 1
        cur = [y, a, '', -1]
        years.append(cur)
    if cur is None: continue
    if leap: cur[3] = len(cur[2])
    cur[2] += '1' if ln == 30 else '0'
out = [y for y in years if Y0 <= y[0] <= Y1]
json.dump({'note': '天文推算：1644年前定朔平气，1645年起定朔定气；与历代行用历法可能差一日或闰月位置不同。年份为天文纪年（0＝公元前1年）。', 'years': out}, sys.stdout, ensure_ascii=False, separators=(',', ':'))
