# -*- coding: utf-8 -*-
"""历史语料库 · 从维基文库 raw 重建干净的 corpus（全量 64+ 本，一次生成）

输入：RAW_DIR 下每卷一个 .json（文件名是 UTF-8 十六进制，长卷名被截断的以文件内 title 为准）
输出：corpus/<id>.jsonl.gz   一行一段 {"i":0,"volume":"卷001","text":"..."}
      corpus/meta.json       书目、卷数、段数、字数
      corpus/books.tsv       id、书名、覆盖朝代（给游戏按年挑书用）

修复旧库的毛病：旧提取器把 {{專|黃帝}} 这类人名模板整个丢掉，正文变成「黃帝者，之子」；
这里模板一律取内文，标题类模板丢弃，裴注/夹注（{{*|...}}）保留。
"""
import io, os, re, json, gzip, sys, unicodedata
from opencc import OpenCC

RAW = os.environ.get('RAW_DIR', 'raw')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'corpus')
os.makedirs(OUT, exist_ok=True)
t2s = OpenCC('t2s').convert

# 书名 → 库内 id（与旧 meta 对齐；后补的书另起 id）
NAME2ID = {
    '史記': 'shiji', '漢書': 'hanshu', '後漢書': 'houhanshu', '三國志': 'sanguozhi', '晉書': 'jinshu',
    '宋書': 'songshu', '南齊書': 'nanqishu', '梁書': 'liangshu', '陳書': 'chenshu', '魏書': 'weishu',
    '北齊書': 'beiqishu', '周書': 'zhoushu', '隋書': 'suishu', '南史': 'nanshi', '北史': 'beishi',
    '舊唐書': 'jiutangshu', '新唐書': 'xintangshu', '舊五代史': 'jiuwudaishi', '新五代史': 'xinwudaishi',
    '宋史': 'songshi', '遼史': 'liaoshi', '金史': 'jinshi', '元史': 'yuanshi', '明史': 'mingshi', '清史稿': 'qingshigao',
    '清實錄': 'qingshilu', '明實錄': 'mingshilu', '冊府元龜': 'cefuyuangui', '太平御覽': 'taipingyulan',
    '玉海': 'yuhai', '資治通鑑': 'zizhitongjian', '續資治通鑑': 'xuzizhitongjian', '續資治通鑑長編': 'changbian',
    '建炎以來繫年要錄': 'jianyanjilu', '明通鑑': 'mingtongjian',
    '通典': 'tongdian', '續通典': 'xutongdian', '清朝通典': 'qingchaotongdian', '文獻通考': 'wenxiantongkao',
    '皇朝文獻通考': 'huangchaowenxiantongkao', '通志': 'tongzhi', '續通志': 'xutongzhi', '唐會要': 'tanghuiyao',
    '五代會要': 'wudaihuiyao', '宋會要輯稿': 'songhuiyao', '大明會典': 'daminghuidian',
    '武經總要': 'wujingzongyao', '孫子兵法': 'sunzibingfa', '吳子': 'wuzi', '司馬法': 'sima', '六韜': 'liutao',
    '尉繚子': 'weiliaozi', '三略': 'sanlue', '紀效新書': 'jixiaoxinshu', '練兵實紀': 'lianbingjinji',
    '武備志': 'wubeizhi', '唐太宗李衛公問對': 'wendui',
    '讀史方輿紀要': 'dushifangyu', '水經注': 'shuijingzhu', '元和郡縣圖志': 'yuanhejunxian', '天下郡國利病書': 'lijibingshu',
    '廿二史劄記': 'nianershi', '讀通鑒論': 'dutongjianlun',
    '戰國策': 'zhanguoce', '國語': 'guoyu', '吳越春秋': 'wuyuechunqiu', '越絕書': 'yuejueshu',
    '竹書紀年': 'zhushujinian', '山海經': 'shanhaijing',
}
EDITION_RE = re.compile(r'[（(][^（）()]*本[）)]\s*$')   # 「（四庫全書本）」「(士禮居叢書本)」
DROP_TPL = {'header', 'header2', 'textquality', 'wikipedia', '注意', 'rgb', 'color', 'center', 'right', 'left', 'noprint', 'polytonic', 'notetoreader'}
KEEP_TPL = {'專', '標', 'YL', '*', 'ruby', 'lang', 'font'}

def strip_editions(name):
    return EDITION_RE.sub('', name).strip()

def clean_markup(s):
    # HTML 注释、ref（校勘注）、div/span 等标签
    s = re.sub(r'<!--[\s\S]*?-->', '', s)
    s = re.sub(r'<ref[^>/]*/>', '', s)
    s = re.sub(r'<ref[^>]*>[\s\S]*?</ref>', '', s)
    # 四库馆夹注：两字以上是按语内容（臣等谨按……），单字是栏外标记
    s = re.sub(r'\{\{SK (?:notes|anchor)\|([^{}]{2,})\}\}', r'〔\1〕', s)
    s = re.sub(r'\{\{SK (?:notes|anchor)\|([^{}])\}\}', '', s)
    # 模板（可嵌套）：标题类整块删，内容类取内文
    out, i, n = [], 0, len(s)
    while i < n:
        if s.startswith('{{', i):
            depth, j = 1, i + 2
            while j < n and depth:
                if s.startswith('{{', j): depth += 1; j += 2
                elif s.startswith('}}', j): depth -= 1; j += 2
                else: j += 1
            body = s[i + 2:j - 2]
            name = re.match(r'\s*([^\s|:}=]+)', body)
            nm = name.group(1).lower() if name else ''
            if nm in DROP_TPL or nm.startswith('skqs') or nm.startswith('readall') or nm in ('sk', 'skanchor', 'sknotes') or not nm:
                pass   # 标题类、四库连读/锚点/夹注类、{{:子页引用}}（书目链接，不是正文）一律丢
            else:
                # 内容类：{{專|黃帝}} → 黃帝；{{*|注}} → （注：…）；带 text= 的取 text=
                inner = body
                m = re.match(r'\s*[^|]*?\|\s*text\s*=\s*([\s\S]*)$', body) or re.match(r'\s*[^\s|:}=]+\s*\|\s*([\s\S]*)$', body)
                if m: inner = m.group(1)
                if nm == '*':
                    t = clean_markup(inner).strip()
                    if t: out.append('〔' + t + '〕')
                else:
                    out.append(clean_markup(inner))
            i = j
        elif s.startswith('-{', i):   # -{zh:筴;zh-hans:策;zh-hant:筴}- → 取简体
            depth, j = 1, i + 2
            while j < n and depth:
                if s.startswith('-{', j): depth += 1; j += 2
                elif s.startswith('}-', j): depth -= 1; j += 2
                else: j += 1
            body = s[i + 2:j - 2]
            m = re.search(r'zh-hans\s*:\s*([^;}]*)', body) or re.search(r'zh-cn\s*:\s*([^;}]*)', body)
            out.append(m.group(1) if m else re.sub(r'zh[:\-a-z]*\s*:\s*', '', body).strip('; '))
            i = j
        else:
            out.append(s[i]); i += 1
    s = ''.join(out)
    s = re.sub(r'\[\[(?:[^\[\]|]*\|)?([^\[\]|]*)\]\]', r'\1', s)   # [[链接|文字]] → 文字
    s = re.sub(r'\[\[([^\[\]|]*)\]\]', r'\1', s)
    s = re.sub(r"'''?", '', s)                                     # 粗体斜体
    s = re.sub(r'</?[a-zA-Z][^>]*>', '', s)                        # 其余 HTML 标签
    s = re.sub(r'SKQS readall starter[\s\S]*?SKQS readall ender', '', s)   # 四库全书本「全文连读」页头残余
    s = s.replace('SKQS', '')
    s = re.sub(r'SKQS read all header\|[^\s]*', '', s)
    s = re.sub(r'\uFEFF', '', s)
    s = re.sub(r'[\s:：]\S*\s*[（(][^（）()]*本[）)](/\S*)?(?=\s|$)', ' ', s)   # 「:皇朝文献通考 (四库全书本)/卷001」这类页眉链接
    return s

def passages(text, target=180, hard=320):
    """按句读切成 120–320 字的段，检索粒度合适、上下文完整"""
    sents = re.split(r'(?<=[。！？；」』])', text)
    out, cur = [], ''
    for x in sents:
        if not x: continue
        while len(x) > hard:   # 表格类整块长文：硬切
            out.append(x[:hard]); x = x[hard:]
        if len(cur) + len(x) > hard and len(cur) >= 80:
            out.append(cur); cur = x
        else:
            cur += x
            if len(cur) >= target: out.append(cur); cur = ''
    if cur.strip(): out.append(cur)
    return out

VOLNUM = lambda t: [int(x) for x in re.findall(r'\d+', t)] or [0]

def main():
    books = {}   # id → {'name':…, 'vols': [ (volkey, text) ]}
    roots_seen = {}   # id → 精确匹配到 meta 书名的根名（刻本变体一律让位给精确匹配的）
    files = sorted(os.listdir(RAW))
    bad = 0
    for k, fn in enumerate(files):
        try:
            d = json.load(io.open(os.path.join(RAW, fn), encoding='utf-8'))
        except Exception:
            bad += 1; continue
        title = str(d.get('title') or '').strip()
        root = strip_editions(title.split('/')[0])
        bid = NAME2ID.get(root)
        if not bid:
            bad += 1
            if bad < 12: print('跳过（无 id）：', title[:60])
            continue
        # 同一 id 有精确书名和刻本变体两拨卷时：只用精确那拨（战国策 45 卷本 vs 士礼居 44 卷本，混进来整本重一遍）
        exact = root in NAME2ID and EDITION_RE.search(title.split('/')[0]) is None
        prev = roots_seen.get(bid)
        if prev is not None and prev != ('' if exact else root):
            continue
        roots_seen[bid] = '' if exact else root
        b = books.setdefault(bid, {'name': root, 'vols': []})
        if roots_seen[bid] == '' and b.get('_variant'):
            b['vols'] = []
            b['_variant'] = False
        if not exact and not b.get('_variant'): b['_variant'] = True
        raw_txt = d.get('text') or ''
        vol = title.split('/')[-1] or fn
        if re.search(r'校勘|目錄|目录|凡例|姓氏|進書表|進表$', vol): continue   # 校勘记、目录页不是正文
        txt = clean_markup(raw_txt)
        lines = [ln.strip('　 \t') for ln in txt.split('\n')]
        body = ' '.join(x for x in lines if x and not re.match(r'^(=|目錄|目次|{|})', x))
        body = t2s(body)
        body = re.sub(r'__(?:FORCETOC|NOTOC|TOC)__\s*', '', body)
        body = re.sub(r'(?<=\s)::\s*', '', body)
        body = re.sub(r'\s{2,}', ' ', body).strip()
        if len(body) < 40: continue
        b['vols'].append((vol, body))
        if (k + 1) % 300 == 0: print(f'  读 {k+1}/{len(files)} …', flush=True)
    print(f'读完：{len(books)} 本，未识 {bad} 卷')
    manifest, tsv = [], ['id\tname\tvolumes\tpassages\tchars']
    for bid, b in sorted(books.items()):
        b['vols'].sort(key=lambda x: VOLNUM(x[0]))
        f = os.path.join(OUT, bid + '.jsonl.gz')
        n = 0; chars = 0
        with gzip.open(f, 'wt', encoding='utf-8', compresslevel=9) as w:
            i = 0
            for vol, body in b['vols']:
                for seg in passages(body):
                    w.write(json.dumps({'i': i, 'volume': vol, 'text': seg}, ensure_ascii=False, separators=(',', ':')) + '\n')
                    i += 1; chars += len(seg)
            n = i
        manifest.append({'id': bid, 'name': b['name'], 'volumes': len(b['vols']), 'passages': n, 'chars': chars}) if n else None
        if not n:
            try: os.remove(f)
            except OSError: pass
            print(f"  {bid} {b['name']}：空，剔除", flush=True)
            continue
        tsv.append(f"{bid}\t{b['name']}\t{len(b['vols'])}\t{n}\t{chars}")
        print(f"  {bid} {b['name']}：{len(b['vols'])} 卷 {n} 段 {chars} 字", flush=True)
    json.dump({'books': manifest, 'source': '维基文库（公有领域）', 'note': '一行一段；模板取内文，裴注夹注在〔〕里'}, io.open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf8', newline='\n'), ensure_ascii=False, indent=1)
    io.open(os.path.join(OUT, 'books.tsv'), 'w', encoding='utf8', newline='\n').write('\n'.join(tsv) + '\n')
    print('完成，写入', OUT)

if __name__ == '__main__':
    main()
