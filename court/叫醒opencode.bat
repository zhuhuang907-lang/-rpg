@echo off
chcp 65001 >nul
rem 定时叫醒 opencode：先拉最新仓库，再让它照 AGENTS.md 自己找活（R-220）
cd /d "%~dp0.."
git fetch origin >> court\定时.log 2>&1
git checkout claude/gallant-davinci-l8pni0 >> court\定时.log 2>&1
git pull --ff-only >> court\定时.log 2>&1
echo [%date% %time%] 叫醒 opencode >> court\定时.log
opencode run "扫描仓库 zhuhuang907-lang/-rpg（分支 claude/gallant-davinci-l8pni0），照 AGENTS.md 办。你是 opencode。办完一件再找下一件，没有差事就停。" >> court\定时.log 2>&1
