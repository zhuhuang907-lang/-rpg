"""政事堂总管自测：用不花钱的模拟大臣走完整个流程。跑法：python3 court/tests/test_court.py"""
import json
import pathlib
import shutil
import subprocess
import sys
import os
import unittest

os.environ['COURT_TEST'] = '1'

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'court'))
from court_lib import util, scan, tools  # noqa: E402
from court_lib.config import 读配置  # noqa: E402
from court_lib.council import 议事  # noqa: E402


def 模拟配置():
    cfg = 读配置()
    for 官 in ('皇帝', '中书令', '门下侍中'):
        cfg[官] = {'提供方': '模拟'}
    return cfg


class 总管自测(unittest.TestCase):
    def setUp(self):
        self.留 = []

    def tearDown(self):
        for p in self.留:
            if p.is_dir():
                shutil.rmtree(p, ignore_errors=True)
            elif p.exists():
                p.unlink()

    def test_一_巡检能查出硬毛病且只读(self):
        found = scan.全部()
        self.assertIsInstance(found, list)
        for f in found:
            self.assertTrue({'类', '题', '证据', '需求', '轻重'} <= set(f))

    def test_二_工具不许读Key和仓库外(self):
        for bad in ('rpg-kernel/data/adapter-config.json', '../x', '.git/config', 'court/config.json'):
            out, err = tools.执行('read_file', {'path': bad})
            self.assertTrue(err, f'{bad} 应被拦下：{out}')
        out, err = tools.执行('read_file', {'path': 'AGENTS.md', 'start': 1, 'end': 2})
        self.assertFalse(err)

    def test_三_写文件只许写政事堂三处(self):
        with self.assertRaises(util.越权):
            util.写文件(ROOT / 'web' / 'game.src.html', 'x')
        with self.assertRaises(util.越权):
            util.写文件(ROOT / '政事堂' / '案卷' / '..' / '..' / 'AGENTS.md', 'x')

    def test_四_整场议事出案卷和奏章并能御批(self):
        案 = {'案号': util.案号() + '-test', '类型': '日常巡检', '题目': '自测', '案情': '自测案情'}
        卷 = ROOT / '政事堂' / '案卷' / 案['案号']
        self.留.append(卷)
        号们 = 议事(案, 配置=模拟配置(), 输出=lambda *_: None).开议()
        for n in ('00-案情.md', '1-独立调查-皇帝.md', '1-独立调查-中书令.md', '1-独立调查-门下侍中.md',
                  '2-质疑-中书令.md', '3-回应-门下侍中.md', '4-裁决.json'):
            self.assertTrue((卷 / n).exists(), n)
        self.assertEqual(len(号们), 1)
        z = ROOT / '政事堂' / '奏章' / '待批' / f'{号们[0]}.md'
        self.留.append(z)
        t = z.read_text(encoding='utf-8')
        for k in ('待御批', '涉及需求', '主要分歧', '修改范围', '测试计划', '御批'):
            self.assertIn(k, t)
        r = subprocess.run([sys.executable, str(ROOT / 'court' / '总管.py'), '批', 号们[0], '驳', '自测驳回'], capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(r.returncode, 0, r.stderr)
        done = ROOT / '政事堂' / '奏章' / '已驳' / f'{号们[0]}.md'
        self.留.append(done)
        self.assertIn('自测驳回', done.read_text(encoding='utf-8'))
        self.assertFalse(z.exists())

    def test_五_缺席照实记录(self):
        cfg = 模拟配置()
        cfg['中书令'] = {'提供方': 'deepseek', '接口': 'http://127.0.0.1:9'}
        import os
        os.environ.pop('DEEPSEEK_API_KEY', None)
        案 = {'案号': util.案号() + '-test2', '类型': '开朝议事', '题目': '缺席自测', '案情': '缺席'}
        self.留.append(ROOT / '政事堂' / '案卷' / 案['案号'])
        会 = 议事(案, 配置=cfg, 输出=lambda *_: None)
        self.assertIn('中书令', 会.缺席)
        号们 = 会.开议()
        for 号 in 号们:
            p = ROOT / '政事堂' / '奏章' / '待批' / f'{号}.md'
            self.留.append(p)
            self.assertIn('中书令缺席', p.read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main(verbosity=2)
