set -u; HERE=$(cd "$(dirname "$0")/.." && pwd); ROOT=$(cd "$HERE/../../.." && pwd); export OUT=${EXAM_DIR:-/tmp/rpg-exam}/out DS_PORT=4721 GAME_PORT=8721 DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-proxy-injected}
mkdir -p $OUT; WORK=${EXAM_DIR:-/tmp/rpg-exam}/work; rm -rf $WORK; mkdir -p $WORK/rk
tar --exclude=./data --exclude=./node_modules -C $ROOT/rpg-kernel -cf - . | tar -C $WORK/rk -xf -; mkdir -p $WORK/rk/data
printf '{"selected":"deepseek","configs":{"deepseek":{"apiKey":"sk-via-local-proxy","model":"deepseek-v4-pro","baseUrl":"http://127.0.0.1:%s"}}}' $DS_PORT > $WORK/rk/data/adapter-config.json
NODE_USE_ENV_PROXY=1 node $HERE/dsproxy.js > $OUT/dsproxy.log 2>&1 &
(cd $WORK/rk && RPG_NO_UPDATE=1 PORT=$GAME_PORT NODE_USE_ENV_PROXY=1 exec node ./server.js > $OUT/server.log 2>&1) &
for i in $(seq 1 60); do curl -s http://127.0.0.1:$GAME_PORT/api/health >/dev/null && break; sleep 0.5; done
NODE_PATH=$(npm root -g) exec node $HERE/exam/drive.js
