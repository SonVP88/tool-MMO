@echo off
chcp 65001 >nul
title AUTOMATION STUDIO - LAUNCHER
echo =====================================================================
echo    AUTOMATION STUDIO - TU DONG HOA SAN XUAT HANG LOAT (PRO V2.2.1)
echo =====================================================================
echo.

cd /d "%~dp0"
if exist "tool-MMO\python-worker" cd tool-MMO

REM 1. Tim kiem trinh thuc thi Python
set "PYTHON_EXE="
where python >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_EXE=python"
) else (
    where py >nul 2>nul
    if not errorlevel 1 (
        set "PYTHON_EXE=py"
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

REM 2. Kiem tra xem dist co ton tai khong, neu chua co thi tu dong build
if not exist "dist\index.html" (
    echo [*] Phat hien chua co thu muc giao dien dist, dang tu dong khoi tao...
    where npm >nul 2>nul
    if not errorlevel 1 (
        call npm run build
    )
)

REM 3. Kiem tra va khoi dong Python Bridge Server & UI (Port 5678)
echo [*] Dang kiem tra may chu Pipeline & Giao dien (Port 5678)...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5678/api/tasks' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }"
if errorlevel 1 (
    echo [*] Dang khoi dong may chu Backend & Giao dien ung dung...
    start /min cmd /c "%PYTHON_EXE% python-worker/local_bridge_server.py > python-worker\server.log 2>&1"
)

REM 4. Cho may chu phan hoi HTTP 200 OK
echo [*] Dang dong bo ket noi he thong...
powershell -NoProfile -Command "for ($i=0; $i -lt 30; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5678/' -TimeoutSec 1 -UseBasicParsing; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Milliseconds 400 }; exit 1"
if errorlevel 1 (
    echo [!] Khong the ket noi toi may chu tai http://127.0.0.1:5678
    echo [*] Nhat ky loi tu server:
    if exist "python-worker\server.log" type "python-worker\server.log"
    echo.
    pause
    exit /b 1
)

REM 5. Tim kiem Microsoft Edge hoac mo trinh duyet mac dinh
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
