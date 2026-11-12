@echo off
chcp 65001 >nul
rem 定时叫醒 zcode（R-220）。zcode 若有命令行无人值守的用法，把它的命令写进环境变量 ZCODE_CMD，
rem 例如：ZCODE_CMD=zcode run   （以 zcode 自己的说明为准）。没设就只记一笔，不运行。
cd /d "%~dp0.."
git fetch origin >> court\定时.log 2>&1
git checkout claude/gallant-davinci-l8pni0 >> court\定时.log 2>&1
git pull --ff-only >> court\定时.log 2>&1
if "%ZCODE_CMD%"=="" (
  echo [%date% %time%] 没设 ZCODE_CMD，zcode 这回没叫醒；请手动打开 zcode 说「扫描仓库，照 AGENTS.md 办」 >> court\定时.log
  exit /b 0
)
echo [%date% %time%] 叫醒 zcode >> court\定时.log
%ZCODE_CMD% "扫描仓库 zhuhuang907-lang/-rpg（分支 claude/gallant-davinci-l8pni0），照 AGENTS.md 办。你是 zcode。办完一件再找下一件，没有差事就停。" >> court\定时.log 2>&1
