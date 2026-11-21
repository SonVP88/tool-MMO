@echo off
chcp 65001 >nul
title CAI DAT MOI TRUONG - AUTOMATION STUDIO MMO PRO
cd /d "%~dp0"
if exist "tool-MMO\requirements.txt" cd tool-MMO

echo ========================================================
echo   CAI DAT THU VIEN CAN THIET CHO PHAN MEM (MMO PRO)
echo ========================================================
echo.

set PYTHON_CMD=
python --version >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_CMD=python"
    goto :py_ok
)
py -3 --version >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_CMD=py -3"
    goto :py_ok
)
for /d %%P in ("%LocalAppData%\Programs\Python\Python*") do (
    if exist "%%P\python.exe" (
        set "PYTHON_CMD="%%P\python.exe""
        goto :py_ok
    )
)
for /d %%P in ("C:\Python*") do (
    if exist "%%P\python.exe" (
        set "PYTHON_CMD="%%P\python.exe""
        goto :py_ok
    )
)

echo [!] KHONG TIM THAY PYTHON! Vui long cai dat Python 3.10+ tu https://www.python.org/
pause
exit /b 1

:py_ok
echo [*] Dang cai dat toan bo thu vien Python (Media, AI, Desktop UI)...
%PYTHON_CMD% -m pip install -r requirements.txt

echo.
echo [*] Dang kiem tra va tai cong cu media FFmpeg va yt-dlp...
%PYTHON_CMD% python-worker\dependency_downloader.py

echo.
echo ========================================================
echo [OK] DA HOAN TAT CAI DAT!
echo Ban co the chay file "CHAY_APP.bat" de su dung ngay!
echo ========================================================
pause
