@echo off
chcp 65001 >nul
title AUTOMATION STUDIO MMO PRO - LAUNCHER
echo =====================================================================
echo    AUTOMATION STUDIO - TU DONG HOA SAN XUAT HANG LOAT (PRO V2.2.1)
echo =====================================================================
echo.

cd /d "%~dp0"
if exist "tool-MMO\run_desktop_app.py" cd tool-MMO

REM 1. Tim kiem trinh thuc thi Python hop le
set PYTHON_CMD=
python --version >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_CMD=python"
    goto :python_found
)

py -3 --version >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_CMD=py -3"
    goto :python_found
)

py --version >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_CMD=py"
    goto :python_found
)

REM Tim kiem trong thu muc cai dat thong dung
for /d %%P in ("%LocalAppData%\Programs\Python\Python*") do (
    if exist "%%P\python.exe" (
        set "PYTHON_CMD="%%P\python.exe""
        goto :python_found
    )
)
for /d %%P in ("C:\Python*") do (
    if exist "%%P\python.exe" (
        set "PYTHON_CMD="%%P\python.exe""
        goto :python_found
    )
)

echo [!] KHONG TIM THAY PYTHON TREN HE THONG!
echo     Vui long cai dat Python 3.10+ tu https://www.python.org/
echo     (Luu y: Nho tich chon vao 'Add Python to PATH' khi cai dat).
echo.
pause
exit /b 1

:python_found

REM 2. Tu dong kiem tra va cai dat thu vien neu may moi chua co
%PYTHON_CMD% -c "import requests, edge_tts, yt_dlp" >nul 2>nul
if errorlevel 1 (
    echo [*] Phat hien thieu mot so thu vien can thiet, dang tu dong cai dat nhanh...
    %PYTHON_CMD% -m pip install -r requirements.txt
    echo [*] Kiem tra bo cong cu nen video FFmpeg va yt-dlp...
    %PYTHON_CMD% python-worker\dependency_downloader.py
    echo.
)

REM 3. Khoi chay ung dung Desktop Studio
echo [*] Dang khoi dong Automation Studio MMO Pro...
%PYTHON_CMD% run_desktop_app.py
if errorlevel 1 (
    echo.
    echo [!] Ung dung da dung lai hoac gap su co.
    pause
)
