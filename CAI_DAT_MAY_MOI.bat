@echo off
chcp 65001 >nul
title AUTOMATION STUDIO - SETUP
echo =====================================================================
echo    AUTOMATION STUDIO - CAI DAT MOI TRUONG MAY MOI (V2.2.1)
echo =====================================================================
echo.

cd /d "%~dp0"
if exist "tool-MMO\package.json" cd tool-MMO

echo [1/3] Kiem tra va cai dat thu vien Node.js (npm install)...
call npm install

echo.
echo [2/3] Kiem tra va cai dat thu vien Python AI (pip install)...
python -m pip install -r python-worker/requirements.txt

echo.
echo [3/3] Kiem tra va tai cong cu nen FFmpeg va yt-dlp...
python python-worker/dependency_downloader.py

echo.
echo =====================================================================
echo [V] HOAN TAT THIET LAP MAY MOI THANH CONG!
echo     Tu bay gio, ban chi can chay file: CHAY_APP.bat de mo tool.
echo =====================================================================
pause
