# bash turns.sh 文件  —— 文件每行一句话；每回存摘要到 play.log、截正文和地图
EXAM_DIR=${EXAM_DIR:-/tmp/rpg-exam}; mkdir -p "$EXAM_DIR/shots"; cd "$EXAM_DIR"
while IFS= read -r line; do [ -z "$line" ] && continue; case "$line" in \#*) continue;; esac
  for k in $(seq 1 400); do rd=$(curl -s -m 10 -X POST --data-binary "(()=>!BUSY&&!document.querySelector('#bSend').disabled)()" localhost:${DRIVE_PORT:-8798}/eval); [ "$rd" = "true" ] && break; sleep 5; done
  sp=auto; case "$line" in xun\|*|month\|*|season\|*|year\|*) sp=${line%%|*}; line=${line#*|};; esac
  curl -s -X POST --data-binary "(()=>{const e=document.querySelector('#span');if(e){e.value='$sp';e.dispatchEvent(new Event('change',{bubbles:true}))}return 1})()" localhost:${DRIVE_PORT:-8798}/eval >/dev/null
  r=$(curl -s -m 3000 -X POST --data-binary "$line" localhost:${DRIVE_PORT:-8798}/say); echo "$r" > last.json
  python3 - "$line" >> play.log <<'P'
import json,sys;d=json.load(open('last.json'));v=d.get('v',d)
if 'error' in d: print('ERROR',d);raise SystemExit
print('\n######## 回',v.get('turn'),v.get('when'),v.get('place'),'|',v.get('role'),'| cash',v.get('cash'))
print('我说：',sys.argv[1]); print('兵',v.get('forces')); print('err',v.get('errs'))
print(v.get('text','')); print('--回执--\n'+v.get('receipt','')[:800])
P
  t=$(python3 -c "import json;print(json.load(open('last.json')).get('v',{}).get('turn','x'))")
  curl -s -X POST --data-binary "$EXAM_DIR/shots/t${t}-board.png" localhost:${DRIVE_PORT:-8798}/shot >/dev/null
  curl -s -X POST --data-binary "(()=>{const e=document.querySelector('[data-tab=map]');if(e)e.click();return 1})()" localhost:${DRIVE_PORT:-8798}/eval >/dev/null; sleep 2
  curl -s -X POST --data-binary "$EXAM_DIR/shots/t${t}-map.png" localhost:${DRIVE_PORT:-8798}/shot >/dev/null
  curl -s -X POST --data-binary "(()=>{const e=document.querySelector('[data-tab=board]');if(e)e.click();return 1})()" localhost:${DRIVE_PORT:-8798}/eval >/dev/null
  curl -s -X POST --data-binary 'JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])))' localhost:${DRIVE_PORT:-8798}/eval | python3 -c "import json,sys;open('lcr$t.json','w').write(json.loads(sys.stdin.read()))" 2>/dev/null
  curl -s -X POST --data-binary "JSON.stringify({turn:S.turn,clock:S.clock,when:timeText(S.clock),age:S.protagonist.age,career:S.career,people:Object.fromEntries(Object.entries(S.people||{}).map(([k,v])=>[k,{role:v.role,where:v.where,dead:v.dead,age:v.age}])),org:arr(S.org&&S.org.nodes).map(n=>[n.name,arr(n.posts).map(p=>[p.title,p.holder,p.src])]),forces:arr(S.forces).map(f=>({name:f.name,leader:f.leader,owner:f.owner,troops:f.troops,at:f.at,status:f.status})),camps:S.campaigns,wars:S.wars,orders:arr(S.orders).slice(-8),acts:arr(S.acts).slice(-8),hc:healthCheck(S),errs:JSON.parse(localStorage.getItem(ERRLOG_KEY)||\"[]\").slice(-15)})" localhost:${DRIVE_PORT:-8798}/eval | python3 -c "import json,sys;open(\"st$t.json\",\"w\").write(json.loads(sys.stdin.read()))" 2>/dev/null
done < "$1"
echo DONE >> play.log
