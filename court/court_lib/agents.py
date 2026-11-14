"""三位大臣的接口。皇帝走 Anthropic 官方 SDK；中书令（DeepSeek）、门下侍中（GLM）走它们的兼容接口。
每家都能调只读工具（tools.py）；调用次数受「限额」管，超了就停，不无限烧钱。
没 Key、Key 失效的大臣记为「缺席」，照实写进案卷，不假装他说过话。"""
import json
import time
import urllib.error
import urllib.request
from . import tools as T
from .config import 取key


class 缺席(Exception):
    pass


class 超额(Exception):
    pass


class 账房:
    def __init__(self, 上限):
        self.上限, self.用了 = 上限, 0

    def 记一笔(self):
        self.用了 += 1
        if self.用了 > self.上限:
            raise 超额(f'本次运行已调用 {self.上限} 次模型，按限额停下')


class 大臣:
    def __init__(self, 官名, 设定, 限额, 账):
        self.官名, self.设定, self.限额, self.账 = 官名, 设定, 限额, 账
        self.提供方 = 设定.get('提供方', '')
        self.工具记录 = []

    def 问(self, system, prompt, 用工具=True):
        raise NotImplementedError


class Claude大臣(大臣):
    def __init__(self, *a):
        super().__init__(*a)
        import anthropic
        self.anthropic = anthropic
        self.client = anthropic.Anthropic()          # 凭据从环境变量或 ant auth 登录里取，不写进代码
        self.型号 = self.设定.get('型号') or ''

    def _定型号(self):
        if self.型号:
            return self.型号
        # 没填型号：取官网列出的最新一款 Opus（列表新的在前）；代码里不写死型号名
        for m in self.client.models.list():
            if 'opus' in m.id:
                self.型号 = m.id
                return m.id
        raise 缺席('取不到可用的 Claude 型号，请在 court/config.json 里填「皇帝.型号」')

    def 问(self, system, prompt, 用工具=True):
        A = self.anthropic
        try:
            model = self._定型号()
        except (A.AuthenticationError, A.PermissionDeniedError) as e:
            raise 缺席(f'Claude 的 Key 无效或没权限：{e}')
        tools = T.anthropic格式() if 用工具 else []
        if 用工具 and self.设定.get('联网检索'):
            tools = tools + [{'type': 'web_search_20260209', 'name': 'web_search', 'max_uses': 5}]
        msgs = [{'role': 'user', 'content': prompt}]
        步 = 0
        while True:
            self.账.记一笔()
            try:
                resp = self.client.beta.messages.create(
                    model=model, max_tokens=16000, system=system, messages=msgs,
                    thinking={'type': 'adaptive'}, output_config={'effort': self.设定.get('努力', 'high')},
                    betas=['server-side-fallback-2026-07-01'], fallbacks='default',
                    **({'tools': tools} if tools else {}))
            except (A.AuthenticationError, A.PermissionDeniedError) as e:
                raise 缺席(f'Claude 的 Key 无效或没权限：{e}')
            if resp.stop_reason == 'refusal':
                return '（皇帝这次没有作答：模型拒答）'
            if resp.stop_reason == 'pause_turn':
                msgs.append({'role': 'assistant', 'content': resp.content})
                continue
            uses = [b for b in resp.content if b.type == 'tool_use']
            if resp.stop_reason != 'tool_use' or not uses or 步 >= self.限额['工具每步最多']:
                return ''.join(b.text for b in resp.content if b.type == 'text').strip()
            步 += 1
            msgs.append({'role': 'assistant', 'content': resp.content})
            results = []
            for u in uses:
                out, err = T.执行(u.name, u.input)
                self.工具记录.append({'工具': u.name, '参数': u.input, '出错': err})
                results.append({'type': 'tool_result', 'tool_use_id': u.id, 'content': out[:14000], **({'is_error': True} if err else {})})
            msgs.append({'role': 'user', 'content': results})


def _post(url, key, body, 超时=300):
    req = urllib.request.Request(url, data=json.dumps(body).encode('utf-8'), method='POST',
                                 headers={'content-type': 'application/json', 'authorization': f'Bearer {key}'})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=超时) as r:
                return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            txt = e.read().decode('utf-8', 'replace')[:300]
            if e.code in (401, 402, 403):
                raise 缺席(f'HTTP {e.code}（Key 无效、欠费或没权限）：{txt}')
            if e.code in (429, 500, 502, 503, 504) and i < 3:
                time.sleep(int(e.headers.get('retry-after') or 0) or 3 * 2 ** i)
                continue
            raise RuntimeError(f'HTTP {e.code}：{txt}')
        except (urllib.error.URLError, TimeoutError) as e:
            if i < 3:
                time.sleep(3 * 2 ** i)
                continue
            raise RuntimeError(f'连不上：{e}')


class 兼容大臣(大臣):
    """DeepSeek、GLM 都提供 OpenAI 兼容的 chat/completions 接口。"""

    def __init__(self, *a):
        super().__init__(*a)
        self.key = 取key(self.提供方)
        if not self.key:
            raise 缺席(f'没设 {self.提供方} 的 Key 环境变量')
        self.base = self.设定.get('接口', '').rstrip('/')
        self.型号 = self.设定.get('型号') or ''

    def _定型号(self):
        if self.型号:
            return self.型号
        req = urllib.request.Request(self.base + '/models', headers={'authorization': f'Bearer {self.key}'})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.loads(r.read().decode('utf-8')).get('data', [])
        except Exception as e:
            raise 缺席(f'取不到 {self.提供方} 的型号列表，请在 court/config.json 里填型号：{e}')
        if not data:
            raise 缺席(f'{self.提供方} 没列出型号，请在 court/config.json 里填型号')
        self.型号 = data[0]['id']
        return self.型号

    def 问(self, system, prompt, 用工具=True):
        model = self._定型号()
        msgs = [{'role': 'system', 'content': system}, {'role': 'user', 'content': prompt}]
        tools = T.openai格式() if 用工具 else []
        if 用工具 and self.提供方 == 'glm' and self.设定.get('联网检索'):
            tools = tools + [{'type': 'web_search', 'web_search': {'enable': True}}]
        步 = 0
        while True:
            self.账.记一笔()
            body = {'model': model, 'messages': msgs, 'max_tokens': 8000}
            if tools:
                body['tools'] = tools
            try:
                data = _post(self.base + '/chat/completions', self.key, body)
            except RuntimeError as e:
                if tools and 'HTTP 400' in str(e) and any(t.get('type') == 'web_search' for t in tools):
                    tools = [t for t in tools if t.get('type') != 'web_search']   # 不认联网检索就去掉再来
                    continue
                raise
            msg = data['choices'][0]['message']
            calls = msg.get('tool_calls') or []
            if not calls or 步 >= self.限额['工具每步最多']:
                return (msg.get('content') or '').strip()
            步 += 1
            msgs.append({'role': 'assistant', 'content': msg.get('content') or '', 'tool_calls': calls})
            for c in calls:
                try:
                    args = json.loads(c['function'].get('arguments') or '{}')
                except Exception:
                    args = {}
                out, err = T.执行(c['function']['name'], args)
                self.工具记录.append({'工具': c['function']['name'], '参数': args, '出错': err})
                msgs.append({'role': 'tool', 'tool_call_id': c['id'], 'content': out[:14000]})


class 模拟大臣(大臣):
    """不连网、不花钱，测流程用：先调一次只读工具，再照固定格式作答。"""

    def 问(self, system, prompt, 用工具=True):
        self.账.记一笔()
        if 用工具:
            out, err = T.执行('list_dir', {'path': '政事堂'})
            self.工具记录.append({'工具': 'list_dir', '参数': {'path': '政事堂'}, '出错': err})
        if '"裁决"' in prompt or '只输出 JSON' in prompt:
            return json.dumps({'各方意见': {'皇帝': '模拟', '中书令': '模拟', '门下侍中': '模拟'}, '主要分歧': '无',
                               '议案': [{'题目': '模拟议案', '涉及需求': ['R-217'], '发现的问题': '模拟问题', '证据': ['模拟证据'],
                                        '修改方案': ['模拟方案'], '修改范围': ['web/game.src.html'], '风险': '低',
                                        '测试计划': ['模拟测试'], '裁决': '建议批准', '理由': '模拟'}], '未定': []}, ensure_ascii=False)
        return f'【{self.官名}·模拟】主张：照案情办。理由：模拟。'


def 召见(官名, 设定, 限额, 账):
    p = 设定.get('提供方')
    cls = {'claude': Claude大臣, 'deepseek': 兼容大臣, 'glm': 兼容大臣, '模拟': 模拟大臣}.get(p)
    if not cls:
        raise 缺席(f'不认识的提供方：{p}')
    return cls(官名, 设定, 限额, 账)
