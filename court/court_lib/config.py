"""读配置。Key 只从环境变量读，绝不写进仓库，也绝不交给模型。"""
import json
import os
from .util import 总管目录

默认 = {
    '皇帝': {'提供方': 'claude', '型号': '', '努力': 'high', '联网检索': True},
    '中书令': {'提供方': 'deepseek', '型号': 'deepseek-v4-pro', '接口': 'https://api.deepseek.com'},
    '门下侍中': {'提供方': 'glm', '型号': '', '接口': 'https://open.bigmodel.cn/api/paas/v4', '联网检索': True},
    '限额': {'每次运行最多调用': 40, '每次回答最多字': 6000, '工具每步最多': 8, '辩论轮数': 2, '材料最多字': 30000},
    '巡检': {'每次最多上奏': 3},
}

KEY_ENV = {'claude': ['ANTHROPIC_API_KEY'], 'deepseek': ['DEEPSEEK_API_KEY'], 'glm': ['GLM_API_KEY', 'ZHIPUAI_API_KEY']}


def 读配置():
    cfg = json.loads(json.dumps(默认))
    p = 总管目录 / 'config.json'
    if p.exists():
        mine = json.loads(p.read_text(encoding='utf-8'))
        for k, v in mine.items():
            if isinstance(v, dict) and isinstance(cfg.get(k), dict):
                cfg[k].update(v)
            else:
                cfg[k] = v
    return cfg


def 取key(提供方):
    for name in KEY_ENV.get(提供方, []):
        if os.environ.get(name):
            return os.environ[name]
    return ''
