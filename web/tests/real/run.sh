#!/bin/bash
# 真实 DeepSeek 压力测试：bash web/tests/real/run.sh [bandit|merchant|zongbing]
#   需要环境变量 DEEPSEEK_API_KEY（在云环境设置里加，不要贴进聊天）；可选 BOCHA_API_KEY、DS_MODEL（默认 deepseek-v4-pro）
#   REF=8d36d77 可以照旧版本跑一遍做成本对比（会另外花一份钱）
#   结果在 OUT（默认 web/tests/real/out-时间）：calls.jsonl 每次调用的用量、calls/ 原始输入输出、各身份每回的前后状态，report.md 汇总
set -u
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"; HERE="$ROOT/web/tests/real"
[ -n "${DEEPSEEK_API_KEY:-}" ] || { echo "没有 DEEPSEEK_API_KEY：请在云环境设置里加上这个环境变量（不要贴进聊天）"; exit 2; }
OUT="${OUT:-$HERE/out-$(date +%m%d-%H%M)}"; mkdir -p "$OUT"; WORK="$(mktemp -d)"; DS_PORT="${DS_PORT:-4711}"; GAME_PORT="${GAME_PORT:-8711}"; export OUT DS_PORT GAME_PORT
GAME_ROOT="$ROOT"
if [ -n "${REF:-}" ]; then GAME_ROOT="$WORK/ref"; git -C "$ROOT" worktree add -f "$GAME_ROOT" "$REF" >/dev/null 2>&1 && (cd "$GAME_ROOT" && python3 web/build.py >/dev/null); fi
cleanup() { kill $DSP $SRV 2>/dev/null; [ -n "${REF:-}" ] && git -C "$ROOT" worktree remove --force "$GAME_ROOT" 2>/dev/null; rm -rf "$WORK"; }
trap cleanup EXIT
mkdir -p "$WORK/rk"; tar --exclude=./data --exclude=./node_modules -C "$GAME_ROOT/rpg-kernel" -cf - . | tar -C "$WORK/rk" -xf -; mkdir -p "$WORK/rk/data"
# 游戏只认得本机转发；真 Key 只在转发进程的环境变量里
printf '{"selected":"deepseek","configs":{"deepseek":{"apiKey":"sk-via-local-proxy","model":"%s","baseUrl":"http://127.0.0.1:%s"}}}' "${DS_MODEL:-deepseek-v4-pro}" "$DS_PORT" > "$WORK/rk/data/adapter-config.json"
if [ -n "${BOCHA_API_KEY:-}" ]; then python3 -I -c "import json,os,sys; json.dump({'provider':'bocha','providers':{'bocha':{'apiKey':os.environ['BOCHA_API_KEY'],'count':10}}}, open(sys.argv[1],'w'))" "$WORK/rk/data/search.json"; fi
NODE_USE_ENV_PROXY=1 node "$HERE/dsproxy.js" > "$OUT/dsproxy.log" 2>&1 & DSP=$!
(cd "$WORK/rk" && RPG_NO_UPDATE=1 PORT=$GAME_PORT NODE_USE_ENV_PROXY=1 exec node ./server.js > "$OUT/server.log" 2>&1) & SRV=$!
for i in $(seq 1 60); do curl -s "http://127.0.0.1:$GAME_PORT/api/health" >/dev/null && break; sleep 0.5; done
VER=$(git -C "$GAME_ROOT" rev-parse --short HEAD); BC=无; [ -n "${BOCHA_API_KEY:-}" ] && BC=有
echo "版本 $VER；型号 ${DS_MODEL:-deepseek-v4-pro}；博查 $BC（没有博查时人物查证走 DeepSeek 检索）" | tee "$OUT/meta.txt"
NODE_PATH="${NODE_PATH:-$(npm root -g)}" node "$HERE/play3.js" "${1:-}"
node "$HERE/report.js" "$OUT" > "$OUT/report.md"; echo "报告：$OUT/report.md"
