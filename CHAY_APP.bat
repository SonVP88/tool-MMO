@echo off
chcp 65001 >nul
title AUTOMATION STUDIO - LAUNCHER
echo =====================================================================
echo    AUTOMATION STUDIO - TU DONG HOA SAN XUAT HANG LOAT (PRO V2.2.1)
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

REM Tim kiem trong thu muc cai dat thong dung neu chua co trong PATH
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

REM 2. Tu dong kiem tra va cai dat thu vien Python can thiet neu may moi chua co
%PYTHON_EXE% -c "import requests, edge_tts, yt_dlp" >nul 2>nul
if errorlevel 1 (
    echo [*] Phat hien thieu mot so thu vien AI, dang tu dong cai dat nhanh...
    %PYTHON_EXE% -m pip install -r python-worker\requirements.txt
    echo.
)

REM 3. Kiem tra thu muc giao dien dist (da duoc dong goi san trong repo)
if not exist "dist\index.html" (
    echo [*] Dang tao giao dien ung dung...
    where npm >nul 2>nul
    if not errorlevel 1 (
        call npm run build
    )
)

REM 4. Kiem tra may chu Port 5678, giai phong port neu bi process cu treo
echo [*] Dang kiem tra may chu Backend & Pipeline (Port 5678)...
powershell -NoProfile -Command "$alive = $false; try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5678/api/tasks' -TimeoutSec 1 -UseBasicParsing; if ($r.StatusCode -eq 200) { $alive = $true } } catch {}; if (-not $alive) { Get-NetTCPConnection -LocalPort 5678 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; exit 1 } else { exit 0 }"
if errorlevel 1 (
    echo [*] Dang khoi dong may chu Backend & Giao dien ung dung...
    start /min "" cmd /c "%PYTHON_EXE% python-worker\local_bridge_server.py > python-worker\server.log 2>&1"
)

REM 5. Cho may chu phan hoi HTTP 200 OK
echo [*] Dang dong bo ket noi he thong...
powershell -NoProfile -Command "for ($i=0; $i -lt 35; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5678/' -TimeoutSec 1 -UseBasicParsing; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Milliseconds 400 }; exit 1"
if errorlevel 1 (
    echo [!] Khong the ket noi toi may chu tai http://127.0.0.1:5678
    echo [*] Nhat ky loi tu server:
    if exist "python-worker\server.log" type "python-worker\server.log"
    echo.
    pause
    exit /b 1
)

REM 6. Tim kiem Microsoft Edge hoac mo trinh duyet mac dinh
set "EDGE_EXE="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%LocalAppData%\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=%LocalAppData%\Microsoft\Edge\Application\msedge.exe"

echo [*] Dang mo giao dien Desktop...
if not "%EDGE_EXE%"=="" (
    start "" "%EDGE_EXE%" --app="http://127.0.0.1:5678" --window-size=1360,840 --disable-features=Translate
) else (
    start "" "http://127.0.0.1:5678"
)

echo.
echo [V] Ung dung da khoi chay thanh cong tren Desktop!
exit
