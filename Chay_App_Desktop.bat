@echo off
title AUTOMATION STUDIO MMO PRO - DESKTOP APP
cd /d "%~dp0"
if exist "tool-MMO" cd "tool-MMO"

echo ========================================================
echo   KHOI DONG AUTOMATION STUDIO MMO PRO (DESKTOP APP)
echo ========================================================
echo [*] Dang khoi dong cua so ung dung Desktop doc lap...

start "" python run_desktop_app.py
exit
