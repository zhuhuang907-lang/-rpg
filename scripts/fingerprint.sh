#!/bin/bash
# 源码指纹：游戏源码、构建脚本、全部测试、本机服务、构建出的三个版本。完整测试全过时记下它，提交时核对（R-132）
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT" && { ls web/game.src.html web/build.py rpg-kernel/server.js web/index.html web/play.html rpg-kernel/public/index.html web/tests/qa.sh; find web/tests -name '*.js' -not -path '*/node_modules/*' -not -path '*/out-*' | sort; } | xargs sha256sum | sha256sum | cut -c1-16
