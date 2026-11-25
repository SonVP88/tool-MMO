@echo off
chcp 65001 >nul
title CAI DAT MOI TRUONG - AUTOMATION STUDIO MMO PRO
cd /d "%~dp0"
if exist "tool-MMO\requirements.txt" cd tool-MMO

echo ========================================================
echo   CAI DAT MOI TRUONG TU DONG - AUTOMATION STUDIO PRO
echo ========================================================
echo.

set "PYTHON_CMD="
call :find_python
if not "%PYTHON_CMD%"=="" goto :py_ok

echo [*] May tinh chua cai dat Python!
echo [*] Dang tu dong tai bo cai Python 3.12.8 chinh chu tu python.org...
echo     (Vui long cho 1-2 phut, hoan toan tu dong...)
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
    echo [!] Khong the tai bo cai Python. Vui long kiem tra mang hoac cai thu cong tai https://www.python.org/
    pause
    exit /b 1
)

echo.
echo [*] Dang tu dong cai dat Python 3.12 (khong can quyen Admin, tu dong them vao PATH)...
"%PY_INSTALLER%" /quiet InstallAllUsers=0 PrependPath=1 Include_test=0 Include_pip=1
del /f /q "%PY_INSTALLER%" >nul 2>nul

call :find_python
if "%PYTHON_CMD%"=="" (
    echo [!] Cai dat Python chua thanh cong. Vui long cai thu cong tai https://www.python.org/
    pause
    exit /b 1
)
echo [OK] Da tu dong cai dat Python 3.12 thanh cong!
echo.

:py_ok
echo [*] Su dung Python: %PYTHON_CMD%
echo [*] Dang cap nhat pip va cai dat toan bo thu vien (Media, AI, Desktop UI)...
%PYTHON_CMD% -m pip install --upgrade pip >nul 2>nul
%PYTHON_CMD% -m pip install -r requirements.txt

echo.
echo [*] Dang kiem tra va tai cong cu media FFmpeg va yt-dlp...
%PYTHON_CMD% python-worker\dependency_downloader.py

echo.
echo ========================================================
echo [OK] DA HOAN TAT CAI DAT MOI TRUONG!
echo Ban co the chay file "CHAY_APP.bat" de su dung ngay!
echo ========================================================
pause
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
