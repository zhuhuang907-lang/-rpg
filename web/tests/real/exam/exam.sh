#!/bin/bash
# 跑一张考卷（真 DeepSeek）：bash exam.sh 1-皇帝-调兵与任免.txt
# Key 从环境变量 DEEPSEEK_API_KEY 读，绝不写进仓库、不贴进聊天。结果在 $EXAM_DIR/<卷名>/（不进仓库）。
set -u; HERE=$(cd "$(dirname "$0")" && pwd); F="$HERE/$1"; name=$(basename "$1" .txt)
export EXAM_DIR=${EXAM_ROOT:-/tmp/rpg-exam}/$name; rm -rf "$EXAM_DIR"; mkdir -p "$EXAM_DIR/shots"
pkill -f "exam/drive.js" 2>/dev/null; pkill -f "real/dsproxy.js" 2>/dev/null; sleep 1
(bash "$HERE/up.sh" > "$EXAM_DIR/drive.log" 2>&1 &)
for i in $(seq 1 120); do curl -s -m 2 localhost:8798/view >/dev/null 2>&1 && break; sleep 1; done
IFS='|' read -r _ y place role nm real < <(head -1 "$F"); [ "$real" = "虚" ] && rv='虚' || rv=''
echo "开局：$y $place $role $nm（$real）"
curl -s -m 3000 -X POST --data-binary "[\"$y\",\"$place\",\"$role\",\"$nm\",\"$rv\"]" localhost:8798/start > "$EXAM_DIR/start.json"
python3 -c "import json,sys;d=json.load(open(sys.argv[1]));v=d.get('v',d);print('开局完：第',v.get('turn'),'回',v.get('when'),v.get('role'))" "$EXAM_DIR/start.json"
grep -v '^#' "$F" > "$EXAM_DIR/turns.txt"
bash "$HERE/turns.sh" "$EXAM_DIR/turns.txt"
python3 -I "$HERE/check.py" "$EXAM_DIR" | tee "$EXAM_DIR/对账.txt"
pkill -f "exam/drive.js" 2>/dev/null; pkill -f "real/dsproxy.js" 2>/dev/null; pkill -f "node ./server.js" 2>/dev/null
echo "完：正文 $EXAM_DIR/play.log，截图 $EXAM_DIR/shots/，对账 $EXAM_DIR/对账.txt"
