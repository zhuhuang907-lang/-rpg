#!/bin/bash
# 测速：假 AI 照真实的慢（LAT=1 即十分之一），开局 + 几回合，打印每回合用时
#   bash web/tests/perf.sh [回合数]
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; QA="$ROOT/web/tests/qa"
WORK="$(mktemp -d)"; MOCK_PORT="${MOCK_PORT:-3751}"; GAME_PORT="${GAME_PORT:-8751}"; export MOCK_PORT GAME_PORT
mkdir -p "$WORK/rk/data" "$WORK/mock"
tar --exclude=./data --exclude=./node_modules -C "$ROOT/rpg-kernel" -cf - . | tar -C "$WORK/rk" -xf -
printf '{"selected":"deepseek","configs":{"deepseek":{"apiKey":"sk-test1234","model":"deepseek-v4-pro","baseUrl":"http://127.0.0.1:%s"}}}' "$MOCK_PORT" > "$WORK/rk/data/adapter-config.json"
sed "s/MOCKPORT/$MOCK_PORT/g" "$QA/search.json" > "$WORK/rk/data/search.json"
cp "$QA"/*.js "$WORK/mock/"
(cd "$WORK/mock" && LAT="${LAT:-1}" exec node ./ai.js > "$WORK/mock.out" 2>&1) & M=$!
(cd "$WORK/rk" && RPG_NO_UPDATE=1 PORT=$GAME_PORT WIKI_BASE=http://127.0.0.1:$MOCK_PORT TGAZ_BASE=http://127.0.0.1:$MOCK_PORT NO_PROXY=127.0.0.1 exec node ./server.js > "$WORK/srv.out" 2>&1) & G=$!
trap 'kill $M $G 2>/dev/null; rm -rf "$WORK"' EXIT
for i in $(seq 1 40); do curl -s "http://127.0.0.1:$GAME_PORT/api/health" >/dev/null && break; sleep 0.5; done
(cd "$WORK/mock" && node perf.js "${1:-4}")
echo "== AI 调用时间线（秒，相对开局）"
cp "$WORK/mock/calls.log" "${KEEP:-/dev/null}" 2>/dev/null; awk -F"\t" 'NR==1{t0=$1} {printf "%6.1f %6.1f  %s %s\n", ($1-t0)/1000, ($2-t0)/1000, $3, $4}' "$WORK/mock/timeline.log"
