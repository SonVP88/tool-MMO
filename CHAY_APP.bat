@echo off
chcp 65001 >nul
title AUTOMATION STUDIO MMO PRO - LAUNCHER
echo =====================================================================
echo    AUTOMATION STUDIO - TU DONG HOA SAN XUAT HANG LOAT (PRO V2.2.1)
echo =====================================================================
echo.

cd /d "%~dp0"
if exist "tool-MMO\run_desktop_app.py" cd tool-MMO

REM 1. Tim kiem trinh thuc thi Python that (tranh Windows Store stub)
set "PYTHON_CMD="
call :find_python
if not "%PYTHON_CMD%"=="" goto :python_found

REM 2. Tu dong tai va cai dat Python 3.12 neu may chua co
echo [*] Phat hien may tinh chua cai dat Python!
echo [*] Dang tu dong tai bo cai Python 3.12.8 chinh chu tu python.org...
echo     (Qua trinh nay hoan toan tu dong, vui long cho 1-2 phut...)
echo.

set "PY_URL=https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe"
set "PY_INSTALLER=%TEMP%\python_auto_setup.exe"
if exist "%PY_INSTALLER%" del /f /q "%PY_INSTALLER%" >nul 2>nul

where curl.exe >nul 2>nul
if not errorlevel 1 (
    curl.exe -L --progress-bar -o "%PY_INSTALLER%" "%PY_URL%"
) else (
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%PY_URL%' -OutFile '%PY_INSTALLER%'"
)

if not exist "%PY_INSTALLER%" (
    echo [!] Khong the tai bo cai Python. Vui long kiem tra ket noi mang hoac cai thu cong tai https://www.python.org/
    pause
    exit /b 1
)

echo.
echo [*] Dang tu dong cai dat Python 3.12 (khong can quyen Admin, tu dong them vao PATH)...
"%PY_INSTALLER%" /quiet InstallAllUsers=0 PrependPath=1 Include_test=0 Include_pip=1
del /f /q "%PY_INSTALLER%" >nul 2>nul

REM Quet lai Python sau khi cai dat xong
call :find_python
if "%PYTHON_CMD%"=="" (
    echo [!] Cai dat Python chua hoan tat hoac bi trinh diet virus chan.
    echo     Vui long cai thu cong tai https://www.python.org/ (tich chon 'Add Python to PATH').
    pause
    exit /b 1
)

echo [OK] Da tu dong cai dat Python thanh cong!
echo.

:python_found
echo [*] Su dung Python: %PYTHON_CMD%

REM 3. Tu dong kiem tra va cai dat thu vien neu may moi chua co
%PYTHON_CMD% -c "import requests, edge_tts, yt_dlp" >nul 2>nul
if errorlevel 1 (
    echo [*] Phat hien thieu thu vien AI & Media, dang tu dong cai dat nhanh...
    %PYTHON_CMD% -m pip install --upgrade pip >nul 2>nul
    %PYTHON_CMD% -m pip install -r requirements.txt
    echo [*] Kiem tra bo cong cu nen video FFmpeg va yt-dlp...
    %PYTHON_CMD% python-worker\dependency_downloader.py
    echo.
)

REM 4. Khoi chay ung dung Desktop Studio
echo [*] Dang khoi dong Automation Studio MMO Pro...
%PYTHON_CMD% run_desktop_app.py
if errorlevel 1 (
    echo.
    echo [!] Ung dung da dung lai hoac gap su co.
    pause
)
exit /b 0

:find_python
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)" >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_CMD=python"
    exit /b 0
)
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)" >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_CMD=py -3"
    exit /b 0
)
py -c "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)" >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_CMD=py"
    exit /b 0
)
for /d %%P in ("%LocalAppData%\Programs\Python\Python*") do (
    if exist "%%P\python.exe" (
        set "PYTHON_CMD="%%P\python.exe""
        exit /b 0
    )
)
for /d %%P in ("%LocalAppData%\Python\pythoncore-*") do (
    if exist "%%P\python.exe" (
        set "PYTHON_CMD="%%P\python.exe""
        exit /b 0
    )
)
for /d %%P in ("%ProgramFiles%\Python*") do (
    if exist "%%P\python.exe" (
        set "PYTHON_CMD="%%P\python.exe""
        exit /b 0
    )
)
for /d %%P in ("C:\Python*") do (
    if exist "%%P\python.exe" (
        set "PYTHON_CMD="%%P\python.exe""
        exit /b 0
    )
)
if exist "%USERPROFILE%\miniconda3\python.exe" (
    set "PYTHON_CMD="%USERPROFILE%\miniconda3\python.exe""
    exit /b 0
)
if exist "%USERPROFILE%\anaconda3\python.exe" (
    set "PYTHON_CMD="%USERPROFILE%\anaconda3\python.exe""
    exit /b 0
)
exit /b 1
