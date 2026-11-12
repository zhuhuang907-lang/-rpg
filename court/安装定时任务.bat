@echo off
chcp 65001 >nul
rem 定时任务（R-219、R-220，电脑开着、联网才会跑；输出都记在 court\定时.log）：
rem   政事堂总管：每天 9:00 日常巡检，每周日 10:00 深度议事
rem   opencode：每天 10:00、16:00 起来自己找活；zcode：每天 11:00、17:00（错开，好审对方刚交的活）
set ROOT=%~dp0..
schtasks /Create /F /TN "政事堂-日常巡检" /SC DAILY /ST 09:00 /TR "cmd /c cd /d \"%ROOT%\" && python court\总管.py 巡检 >> court\定时.log 2>&1"
schtasks /Create /F /TN "政事堂-深度议事" /SC WEEKLY /D SUN /ST 10:00 /TR "cmd /c cd /d \"%ROOT%\" && python court\总管.py 巡检 --深 >> court\定时.log 2>&1"
schtasks /Create /F /TN "中书省-opencode上午" /SC DAILY /ST 10:00 /TR "\"%ROOT%\court\叫醒opencode.bat\""
schtasks /Create /F /TN "中书省-opencode下午" /SC DAILY /ST 16:00 /TR "\"%ROOT%\court\叫醒opencode.bat\""
schtasks /Create /F /TN "中书省-zcode上午" /SC DAILY /ST 11:00 /TR "\"%ROOT%\court\叫醒zcode.bat\""
schtasks /Create /F /TN "中书省-zcode下午" /SC DAILY /ST 17:00 /TR "\"%ROOT%\court\叫醒zcode.bat\""
echo 已登记六项定时任务。取消某一项：schtasks /Delete /TN "任务名" /F
pause
