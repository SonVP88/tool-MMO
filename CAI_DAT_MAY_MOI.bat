@echo off
chcp 65001 >nul
title AUTOMATION STUDIO - SETUP
echo =====================================================================
echo    AUTOMATION STUDIO - CAI DAT MOI TRUONG MAY MOI (V2.2.1)
echo =====================================================================
echo.

cd /d "%~dp0"
if exist "tool-MMO\python-worker" cd tool-MMO

REM 1. Tim kiem trinh thuc thi Python hop le
set "PYTHON_EXE="
python --version >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_EXE=python"
) else (
    py -3 --version >nul 2>nul
    if not errorlevel 1 (
        set "PYTHON_EXE=py -3"
    ) else (
        py --version >nul 2>nul
        if not errorlevel 1 (
            set "PYTHON_EXE=py"
        )
    )
)

if "%PYTHON_EXE%"=="" (
    for /d %%P in ("%LocalAppData%\Programs\Python\Python*") do (
        if exist "%%P\python.exe" set "PYTHON_EXE=%%P\python.exe"
    )
)
if "%PYTHON_EXE%"=="" (
    for /d %%P in ("C:\Python*") do (
        if exist "%%P\python.exe" set "PYTHON_EXE=%%P\python.exe"
    )
)

if "%PYTHON_EXE%"=="" (
    echo [!] KHONG TIM THAY PYTHON TREN HE THONG!
    echo     Vui long cai dat Python 3.10+ tu https://www.python.org/
    echo     (Luu y: Nho tich chon vao 'Add Python to PATH' khi cai dat).
    echo.
    pause
    exit /b 1
)

REM 2. Kiem tra Frontend
where npm >nul 2>nul
if not errorlevel 1 (
    if not exist "dist\index.html" (
        echo [1/3] Cai dat thu vien Node.js va bien dich Frontend...
        call npm install
        call npm run build
    ) else (
        echo [1/3] Giao dien Frontend da duoc dong goi san sang.
    )
) else (
    echo [1/3] Giao dien Frontend da duoc dong goi san sang (Khong yeu cau Node.js).
)

echo.
echo [2/3] Cai dat day du cac thu vien Python AI & Media (pip install)...
%PYTHON_EXE% -m pip install -r python-worker/requirements.txt

echo.
echo [3/3] Kiem tra bo cong cu nen video FFmpeg va yt-dlp...
%PYTHON_EXE% python-worker/dependency_downloader.py

echo.
echo =====================================================================
echo [V] HOAN TAT THIET LAP MAY MOI THANH CONG!
echo     Tu bay gio, ban chi can chay file: CHAY_APP.bat de mo tool.
echo =====================================================================
pause
