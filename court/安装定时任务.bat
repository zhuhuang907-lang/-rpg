@echo off
chcp 65001 >nul
rem 政事堂总管定时任务：每天 9:00 日常巡检，每周日 10:00 深度议事（电脑开着才会跑）
set ROOT=%~dp0..
schtasks /Create /F /TN "政事堂-日常巡检" /SC DAILY /ST 09:00 /TR "cmd /c cd /d \"%ROOT%\" && python court\总管.py 巡检 >> court\定时.log 2>&1"
schtasks /Create /F /TN "政事堂-深度议事" /SC WEEKLY /D SUN /ST 10:00 /TR "cmd /c cd /d \"%ROOT%\" && python court\总管.py 巡检 --深 >> court\定时.log 2>&1"
echo 已登记两项定时任务。要取消：schtasks /Delete /TN "政事堂-日常巡检" /F 和 schtasks /Delete /TN "政事堂-深度议事" /F
pause
