#!/bin/bash
# 朝局排障环境：把 rpg-kernel 复制到临时目录、配 mock AI、起服务（不写仓库内文件）
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK=/tmp/qa13
rm -rf "$WORK"; mkdir -p "$WORK/rk" "$WORK/mock"
tar --exclude=./data --exclude=./node_modules -C "$ROOT/rpg-kernel" -cf - . | tar -C "$WORK/rk" -xf -
mkdir -p "$WORK/rk/data"
printf '{"selected":"deepseek","configs":{"deepseek":{"apiKey":"sk-test1234","model":"deepseek-v4-pro","baseUrl":"http://127.0.0.1:3745"}}}' > "$WORK/rk/data/adapter-config.json"
sed "s/MOCKPORT/3745/g" "$ROOT/web/tests/qa/search.json" > "$WORK/rk/data/state_search.json"
cp "$ROOT/web/tests/qa/"*.js "$WORK/mock/"
echo prepared
